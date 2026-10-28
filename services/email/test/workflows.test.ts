import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

const engineSchema = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "enums.json"), "utf8"));
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

describe("email workflows", () => {
  it("has the 9 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "email.audience_sync", "email.campaign_send", "email.consent_change", "email.deliverability_monitor",
      "email.flow_build", "email.monthly_calendar", "email.outbound_sequence", "email.reply_triage", "email.weekly_report",
    ]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema v0.1.0", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code email", () => expect(wf.service).toBe("email"));

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

      it("uses only shared approval kinds, roles and tool names", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(Object.keys(enums.tool_registry)).toContain(s.tool!.name);
          expect(Object.keys(enums.tool_risk_meaning)).toContain(s.tool!.risk);
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("gets recipients from the engine before any send (engine G5)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "send") continue;
          expect(wf.steps.slice(0, i).some((t) => t.tool?.name === "engine" && t.tool.action === "audiences.resolve")).toBe(true);
        }
      });

      it("runs a compliance check before every send or publish (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "send" && s.tool?.risk !== "write_external") continue;
          expect(wf.steps.slice(0, i).some((t) => t.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });
    });
  }

  describe("guardrails in detail", () => {
    it("uses risk remove for suppression, pause and stop-contact, so an opt-out is never blocked (engine G10)", () => {
      expect(byId(wfById("email.consent_change"), "suppress").tool?.risk).toBe("remove");
      expect(byId(wfById("email.deliverability_monitor"), "pause").tool?.risk).toBe("remove");
      expect(byId(wfById("email.reply_triage"), "stop").tool?.risk).toBe("remove");
    });

    it("needs a person before sends resume after a stop limit", () => {
      const wf = wfById("email.deliverability_monitor");
      expect(byId(wf, "incident").gate?.approval_kind).toBe("escalation");
      expect(byId(wf, "resume").needs).toEqual(["incident"]);
    });

    it("approves the calendar before writing and the copy before any test send", () => {
      const cal = wfById("email.monthly_calendar");
      expect(byId(cal, "approve_plan").gate?.approval_kind).toBe("calendar");
      const send = wfById("email.campaign_send");
      expect(index(send, "approve_copy")).toBeLessThan(index(send, "test_send"));
      expect(index(send, "test_send")).toBeLessThan(index(send, "send"));
    });

    it("lets only a reused template with no new claims skip the copy gate", () => {
      const g = byId(wfById("email.campaign_send"), "approve_copy").gate!;
      expect(g.skip_if).toContain("template_reused");
      expect(g.skip_if).toContain("new_claim_ids");
      expect(byId(wfById("email.outbound_sequence"), "approve_copy").gate?.skip_if).toBeUndefined();
    });

    it("needs both the account lead and client sales on an outbound list", () => {
      const g = byId(wfById("email.outbound_sequence"), "approve_plan").gate!;
      expect(g.required_roles).toEqual(["account_lead", "client_sales"]);
      expect(g.required_count).toBe(2);
    });

    it("escalates complaints, legal, press and regulator replies without replying (engine G4)", () => {
      const wf = wfById("email.reply_triage");
      const route = byId(wf, "route").branch!;
      expect(route.cases![0].goto).toBe("escalate");
      expect(route.cases![0].if).toContain("complaint");
      expect(byId(wf, "escalate").emit).toEqual({ event: "engine/escalation.raised" });
      expect(wf.steps.some((s) => s.tool?.risk === "send")).toBe(false);
    });
  });
});
