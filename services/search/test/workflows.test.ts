import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

const engineSchema = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "enums.json"), "utf8"));
const workflows = loadWorkflows();
const toolNames = Object.keys(enums.tool_registry);

const wfById = (id: string) => workflows.find((w) => w.id === id) as Workflow;
const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;

/** Every step a step waits on, directly or through other steps. */
function ancestors(wf: Workflow, id: string): WorkflowStep[] {
  const seen = new Map<string, WorkflowStep>();
  const walk = (sid: string) => {
    for (const n of byId(wf, sid).needs ?? []) {
      if (seen.has(n)) continue;
      seen.set(n, byId(wf, n));
      walk(n);
    }
  };
  walk(id);
  return [...seen.values()];
}

describe("search workflows", () => {
  it("has the 10 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "search.campaign_assets",
      "search.cluster_research",
      "search.content_cluster",
      "search.content_refresh",
      "search.geo_monitor",
      "search.monthly_report",
      "search.onboarding",
      "search.sem_launch",
      "search.sem_optimize",
      "search.technical_fix",
    ]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema v0.1.0", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code search", () => expect(wf.service).toBe("search"));

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

      it("uses only shared approval kinds, roles and tools", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.task)) {
          for (const r of s.task!.assignee_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(toolNames).toContain(s.tool!.name);
          expect(enums.tool_risks).toContain(s.tool!.risk);
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("runs a compliance check right before every external write (engine G6)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "write_external" || s.tool?.risk === "send")) {
          const before = (s.needs ?? []).map((n) => byId(wf, n));
          expect(before.some((b) => b.type === "check" && b.check?.kinds?.includes("compliance")), s.id).toBe(true);
        }
      });

      it("puts a budget gate before every spend step (engine G1)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "spend")) {
          // The optimizer's in-policy step is the spend_policies exception: splitChanges never lets it raise the total.
          if (wf.id === "search.sem_optimize" && s.id === "apply_in_policy") continue;
          const gated = ancestors(wf, s.id).some((a) => ["budget", "budget_change"].includes(a.gate?.approval_kind ?? ""));
          const launched = ancestors(wf, s.id).some((a) => a.type === "wait");
          expect(gated || launched, s.id).toBe(true);
        }
      });
    });
  }

  describe("guardrails", () => {
    it("never skips the live site gate and gives it to the client developer (engine G9)", () => {
      const wf = wfById("search.technical_fix");
      const g = byId(wf, "approve_site_change").gate!;
      expect(g.approval_kind).toBe("go_live");
      expect(g.required_roles).toEqual(["client_developer"]);
      expect(g.skip_if).toBeUndefined();
      expect(ancestors(wf, "apply_change").map((a) => a.id)).toContain("approve_site_change");
      expect(byId(wf, "apply_change").task?.assignee_roles).toEqual(["client_developer"]);
    });

    it("needs the subject expert on every page, and a claim gate first when the draft has new claims", () => {
      const wf = wfById("search.content_cluster");
      const signoff = byId(wf, "expert_signoff").gate!;
      expect(signoff.required_roles).toEqual(["subject_expert"]);
      expect(signoff.skip_if).toBeUndefined();
      expect(byId(wf, "claim_gate").gate?.approval_kind).toBe("claim");
      const publishAncestors = ancestors(wf, "publish").map((a) => a.id);
      expect(publishAncestors).toEqual(expect.arrayContaining(["draft_check", "expert_signoff", "publish_check"]));
    });

    it("launches SEM only after a two-person budget gate", () => {
      const g = byId(wfById("search.sem_launch"), "approve_launch").gate!;
      expect(g.approval_kind).toBe("budget");
      expect(g.required_roles).toEqual(["performance_marketer", "client_finance"]);
      expect(g.required_count).toBe(2);
    });

    it("sends out-of-policy optimizer changes to the budget_change gate", () => {
      const wf = wfById("search.sem_optimize");
      expect(byId(wf, "apply_removals").tool?.risk).toBe("remove");
      expect(byId(wf, "approve_change").gate?.approval_kind).toBe("budget_change");
      expect(ancestors(wf, "apply_approved").map((a) => a.id)).toContain("approve_change");
    });

    it("enables campaign assets only after the campaign launches in that market (service-integration item 9)", () => {
      const wf = wfById("search.campaign_assets");
      const wait = byId(wf, "wait_launch") as WorkflowStep & { wait: { event: string; match: string } };
      expect(wait.wait.event).toBe("svc.campaigns/market.launched");
      expect(wait.wait.match).toContain("data.market == input.market");
      expect(ancestors(wf, "enable").map((a) => a.id)).toEqual(expect.arrayContaining(["approve_copy", "register", "wait_launch"]));
    });

    it("needs the SEO lead and the client on the roadmap", () => {
      const g = byId(wfById("search.onboarding"), "approve_roadmap").gate!;
      expect(g.approval_kind).toBe("plan");
      expect(g.required_roles).toEqual(["seo_lead", "client_approver"]);
      expect(g.required_count).toBe(2);
    });
  });
});
