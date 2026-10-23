import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

// Read the live engine contracts in this repo, so a contract change that breaks this service fails here.
const engine = (...p: string[]) => JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", ...p), "utf8"));
const engineSchema = engine("schemas", "workflow-definition.json");
const enums = engine("enums.json");
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

/** Every step that runs before `id` in the same run (transitive `needs`). */
function upstream(wf: Workflow, id: string, seen = new Set<string>()): Set<string> {
  for (const n of byId(wf, id).needs ?? []) {
    if (!seen.has(n)) {
      seen.add(n);
      upstream(wf, n, seen);
    }
  }
  return seen;
}

describe("affiliate workflows", () => {
  it("has the 5 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "affiliate.activation_daily", "affiliate.compliance_and_report", "affiliate.partner_recruitment",
      "affiliate.payout_monthly", "affiliate.programme_launch",
    ]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code affiliate", () => {
        expect(wf.service).toBe("affiliate");
        expect(Object.keys(enums.services)).toContain("affiliate");
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

      it("uses only shared approval kinds, roles and tool names", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
          expect(s.gate!.required_count ?? 1).toBeLessThanOrEqual(s.gate!.required_roles!.length);
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

      it("runs a compliance check before every send or external write (engine G6)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "send" || s.tool?.risk === "write_external")) {
          const up = [...upstream(wf, s.id)].map((id) => byId(wf, id));
          expect(up.some((t) => t.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("never pays without a payout gate first (engine G2)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "pay")) {
          const up = [...upstream(wf, s.id)].map((id) => byId(wf, id));
          expect(up.some((t) => t.gate?.approval_kind === "payout")).toBe(true);
        }
      });

      it("has no spend or sign step (commission moves only through pay)", () => {
        expect(wf.steps.some((s) => s.tool?.risk === "spend" || s.tool?.risk === "sign")).toBe(false);
      });
    });
  }

  describe("guardrails in detail", () => {
    it("resolves lawful recipients from the engine before recruitment outreach (engine G5)", () => {
      const wf = wfById("affiliate.partner_recruitment");
      const up = upstream(wf, "send_outreach");
      expect(up.has("resolve_recipients")).toBe(true);
      expect(byId(wf, "resolve_recipients").tool).toMatchObject({ name: "engine", action: "audiences.resolve" });
    });

    it("needs both client finance and the account lead on commission and on the payout", () => {
      const terms = byId(wfById("affiliate.programme_launch"), "approve_terms").gate!;
      expect(terms.approval_kind).toBe("budget");
      expect(terms.required_roles).toEqual(["client_finance", "account_lead"]);
      expect(terms.required_count).toBe(2);
      const payout = byId(wfById("affiliate.payout_monthly"), "approve_payout").gate!;
      expect(payout.required_roles).toContain("client_finance");
      expect(payout.required_count).toBe(2);
    });

    it("stops before approval when the payout is over the budget cap", () => {
      const wf = wfById("affiliate.payout_monthly");
      expect(byId(wf, "within_cap").branch!.cases![0].goto).toBe("over_cap");
      expect(upstream(wf, "pay").has("over_cap")).toBe(false);
    });

    it("needs a person to remove a partner", () => {
      const wf = wfById("affiliate.compliance_and_report");
      const g = byId(wf, "remove_partner").gate!;
      expect(g.required_roles).toEqual(["influencer_lead", "client_approver"]);
      expect(upstream(wf, "apply_removal").has("remove_partner")).toBe(true);
    });

    it("sends partner complaints and terms questions to a person (engine G4)", () => {
      const wf = wfById("affiliate.partner_recruitment");
      expect(byId(wf, "route_replies").branch!.cases![0].goto).toBe("escalate_reply");
      expect(byId(wf, "escalate_reply").emit).toEqual({ event: "engine/escalation.raised" });
    });

    it("approves bonuses and tier upgrades before they reach the platform", () => {
      const wf = wfById("affiliate.activation_daily");
      expect(byId(wf, "approve_incentive").gate!.approval_kind).toBe("budget_change");
      expect(upstream(wf, "apply_incentive").has("approve_incentive")).toBe(true);
    });
  });
});
