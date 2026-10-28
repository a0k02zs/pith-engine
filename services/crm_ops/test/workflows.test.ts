import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";
import { localTools } from "../src/tools.js";

const engineSchema = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "enums.json"), "utf8"));
const workflows = loadWorkflows();
const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

/** Every step that can run before `id`: its needs, their needs, and so on. */
function ancestors(wf: Workflow, id: string, seen = new Set<string>()): Set<string> {
  for (const n of byId(wf, id).needs ?? []) {
    if (!seen.has(n)) {
      seen.add(n);
      ancestors(wf, n, seen);
    }
  }
  return seen;
}

describe("crm_ops workflows", () => {
  it("has the 11 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "crm_ops.consent_sync", "crm_ops.daily_health", "crm_ops.dsr", "crm_ops.lead_capture", "crm_ops.list_import", "crm_ops.nurture_enrol",
      "crm_ops.recycle", "crm_ops.score_route", "crm_ops.score_tuning", "crm_ops.setup", "crm_ops.sla_watch",
    ]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema v0.1.0", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code crm_ops and service-owned or engine event names", () => {
        expect(wf.service).toBe("crm_ops");
        const trigger = (wf.trigger as { event?: string }).event;
        if (trigger) expect(trigger).toMatch(/^(svc\.crm_ops\/|engine\/)/);
        for (const s of wf.steps.filter((s) => s.emit)) {
          expect((s.emit as { event: string }).event).toMatch(/^(svc\.crm_ops\/[a-z0-9_]+\.[a-z_]+|engine\/metric\.recorded)$/);
        }
      });

      it("has unique step ids and only points at steps that exist", () => {
        const ids = wf.steps.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const s of wf.steps) {
          for (const n of s.needs ?? []) expect(ids).toContain(n);
          for (const c of s.branch?.cases ?? []) expect(ids).toContain(c.goto);
          if (s.branch?.else) expect(ids).toContain(s.branch.else);
          if (s.gate?.on_changes) expect(ids).toContain(s.gate.on_changes);
        }
      });

      it("resolves every prompt and output schema it names", () => {
        expect(unresolvedRefs(wf)).toEqual([]);
      });

      it("uses only shared approval kinds, roles, tool names and risks", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(enums.tool_risks).toContain(s.tool!.risk);
          if (s.tool!.name === "crm_ops") expect(Object.keys(localTools)).toContain(s.tool!.action);
          else expect(Object.keys(enums.tool_registry)).toContain(s.tool!.name);
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template", "data_change"]).toContain(s.gate!.approval_kind);
          if (s.gate!.approval_kind === "data_change") expect(s.gate!.skip_if).toMatch(/rows <= 500 && .*third_party == false/);
        }
      });

      it("gets recipients from the engine before any send (engine G5)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "send")) {
          const before = [...ancestors(wf, s.id)].map((id) => byId(wf, id));
          expect(before.some((t) => t.tool?.name === "engine" && t.tool.action?.startsWith("audiences.resolve")), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("runs a compliance check before every send or publish (engine G6)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "send" || s.tool?.risk === "write_external")) {
          const before = [...ancestors(wf, s.id)].map((id) => byId(wf, id));
          expect(before.some((t) => t.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("never puts a gate or a check in front of a removal (engine G10)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "remove")) {
          const before = [...ancestors(wf, s.id)].map((id) => byId(wf, id));
          const blocking = before.filter((t) => t.check || (t.gate && wf.id !== "crm_ops.dsr"));
          expect(blocking.map((t) => t.id), `${wf.id}.${s.id}`).toEqual([]);
        }
      });

      it("never spends, signs or pays", () => {
        for (const s of wf.steps) expect(["spend", "sign", "pay"]).not.toContain(s.tool?.risk);
      });
    });
  }

  describe("guardrails in detail", () => {
    it("mirrors consent with risk remove and no gate", () => {
      const wf = wfById("crm_ops.consent_sync");
      expect(wf.trigger).toEqual({ event: "engine/consent.changed" });
      expect(wf.steps.every((s) => s.tool?.risk === "remove")).toBe(true);
    });

    it("needs both client sales and the marketing lead on the design and on every score change (G1, G3)", () => {
      for (const [w, g] of [["crm_ops.setup", "approve_design"], ["crm_ops.score_tuning", "approve_changes"]]) {
        const gate = byId(wfById(w), g).gate!;
        expect(gate.approval_kind).toBe("plan");
        expect(gate.required_roles).toEqual(["client_sales", "client_marketing_lead"]);
        expect(gate.required_count).toBe(2);
      }
      const tuning = wfById("crm_ops.score_tuning");
      expect(ancestors(tuning, "publish_model").has("approve_changes")).toBe(true);
    });

    it("tests in the sandbox and goes live only after the go-live gate (G2)", () => {
      const wf = wfById("crm_ops.setup");
      expect(index(wf, "build_sandbox")).toBeLessThan(index(wf, "test"));
      expect(ancestors(wf, "deploy_live").has("approve_go_live")).toBe(true);
      expect(byId(wf, "test_result").branch!.cases![0].if).toContain("consent_failures > 0");
    });

    it("sends a fuzzy merge to a person and an exact email match to the logged merge", () => {
      const route = byId(wfById("crm_ops.lead_capture"), "dedupe_route").branch!;
      expect(route.cases).toEqual([
        { if: "steps.dedupe.output.match_key == 'email'", goto: "auto_merge" },
        { if: "steps.dedupe.output.match_key == 'name_company'", goto: "review_merge" },
      ]);
      expect(byId(wfById("crm_ops.lead_capture"), "review_merge").gate!.approval_kind).toBe("data_change");
    });

    it("needs client legal before a data subject request runs", () => {
      const wf = wfById("crm_ops.dsr");
      expect(byId(wf, "approve_dsr").gate!.required_roles).toEqual(["client_legal"]);
      expect(byId(wf, "execute").needs).toEqual(["approve_dsr"]);
    });

    it("hands nurture sends to the email service and sends only the approved after-hours template itself", () => {
      expect(byId(wfById("crm_ops.nurture_enrol"), "start_flow").subflow).toEqual({ workflow_id: "email.nurture_flow" });
      const sends = workflows.flatMap((w) => w.steps.filter((s) => s.tool?.risk === "send").map((s) => `${w.id}.${s.id}`));
      expect(sends).toEqual(["crm_ops.sla_watch.auto_reply"]);
    });
  });
});
