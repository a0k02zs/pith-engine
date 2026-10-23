import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

const engineSchema = JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", "schemas", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", "enums.json"), "utf8"));
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

/** Every step that must finish before `id` can run, through `needs` and through branches that go to it. */
function ancestors(wf: Workflow, id: string, seen = new Set<string>()): Set<string> {
  const parents = [
    ...(byId(wf, id).needs ?? []),
    ...wf.steps.filter((s) => s.branch && [...(s.branch.cases ?? []).map((c) => c.goto), s.branch.else].includes(id)).map((s) => s.id),
  ];
  for (const p of parents) {
    if (seen.has(p)) continue;
    seen.add(p);
    ancestors(wf, p, seen);
  }
  return seen;
}

describe("abm workflows", () => {
  it("has the 6 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "abm.account_activation", "abm.account_list", "abm.intent_daily", "abm.play_run", "abm.sales_handoff", "abm.weekly_report",
    ]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code abm and svc.abm/ or engine/ events", () => {
        expect(wf.service).toBe("abm");
        expect(enums.services.abm).toBe(8);
        for (const s of wf.steps.filter((s) => s.emit)) expect(s.emit!.event).toMatch(/^(svc\.abm|engine)\//);
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

      it("never waits on 2 alternative paths in 1 step", () => {
        for (const s of wf.steps) expect((s.needs ?? []).length, `${wf.id}.${s.id}`).toBeLessThanOrEqual(1);
      });

      it("resolves every prompt and output schema it names", () => {
        expect(unresolvedRefs(wf)).toEqual([]);
      });

      it("uses only shared approval kinds, roles, tools and engine actions", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
          expect(s.gate!.required_count ?? 1).toBeLessThanOrEqual((s.gate!.required_roles ?? []).length);
        }
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(Object.keys(enums.tool_registry)).toContain(s.tool!.name);
          expect(enums.tool_risks).toContain(s.tool!.risk);
          if (s.tool!.name === "engine") {
            expect(Object.keys(enums.engine_actions)).toContain(s.tool!.action);
            expect(enums.engine_actions[s.tool!.action!]).toMatch(new RegExp(`^${s.tool!.risk}`));
          }
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("has a budget gate before every spend (engine G1)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "spend")) {
          const before = [...ancestors(wf, s.id)].map((id) => byId(wf, id));
          expect(before.some((b) => b.gate?.approval_kind === "budget"), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("gets recipients from the engine before any send (engine G5)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "send")) {
          const before = [...ancestors(wf, s.id)].map((id) => byId(wf, id));
          expect(before.some((b) => b.tool?.name === "engine" && b.tool.action === "audiences.resolve"), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("runs a compliance check right before every send or publish (engine G6)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "send" || s.tool?.risk === "write_external")) {
          const before = [...ancestors(wf, s.id)].map((id) => byId(wf, id));
          expect(before.some((b) => b.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });
    });
  }

  describe("ABM gates in detail", () => {
    it("G1: account lead and client sales both approve the list, with no skip", () => {
      const g = byId(wfById("abm.account_list"), "g1_approve_list").gate!;
      expect(g).toMatchObject({ approval_kind: "plan", required_roles: ["account_lead", "client_sales"], required_count: 2 });
      expect(g.skip_if).toBeUndefined();
      expect(byId(wfById("abm.account_list"), "save_tiers").needs).toEqual(["g1_approve_list"]);
    });

    it("G2 and G3: Tier 1 assets get a copy gate; other tiers get the template gate", () => {
      const wf = wfById("abm.account_activation");
      expect(byId(wf, "g2_tier1_assets").gate).toMatchObject({ approval_kind: "copy", skip_if: "input.tier != 1" });
      const g3 = byId(wf, "g3_templates").gate!;
      expect(g3.approval_kind).toBe("template");
      expect(g3.skip_if).toContain("input.tier == 1");
      expect(g3.skip_if).toContain("template_changed");
    });

    it("G4: the account lead and client finance approve spend and gifts before ads launch", () => {
      const wf = wfById("abm.account_activation");
      expect(byId(wf, "g4_spend_gifts").gate).toMatchObject({ approval_kind: "budget", required_roles: ["account_lead", "client_finance"], required_count: 2 });
      expect(ancestors(wf, "launch_account_ads").has("g4_spend_gifts")).toBe(true);
      expect(ancestors(wf, "launch_account_ads").has("check_assets")).toBe(true);
    });

    it("G5: client sales accepts the hand-off before an opportunity is created", () => {
      const wf = wfById("abm.sales_handoff");
      expect(byId(wf, "g5_accept").gate).toMatchObject({ approval_kind: "handoff", required_roles: ["client_sales"] });
      expect(byId(wf, "create_opportunity")).toMatchObject({ needs: ["g5_accept"], tool: { name: "crm", risk: "write_internal" } });
    });

    it("G6: a person reviews the fact-checked weekly report before it is published", () => {
      const wf = wfById("abm.weekly_report");
      expect(byId(wf, "g6_review").gate?.approval_kind).toBe("report");
      expect(byId(wf, "g6_review").needs).toEqual(["check_report"]);
      expect(byId(wf, "check_report").check?.kinds).toContain("fact");
    });

    it("stops a play on an open opportunity, opt-out, complaint or high bounce rate", () => {
      const stop = byId(wfById("abm.play_run"), "stop_or_next").branch!.cases![0].if;
      for (const term of ["opportunity_open", "opted_out", "complaint", "bounce_rate"]) expect(stop).toContain(term);
    });

    it("emits a surge only for fresh data", () => {
      expect(byId(wfById("abm.intent_daily"), "is_surge").branch!.cases![0].if).toContain("!a.stale");
    });
  });
});
