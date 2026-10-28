import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { expandTemplates, PLATFORMS } from "../src/generate.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

const engine = (...p: string[]) => JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", ...p), "utf8"));
const engineSchema = engine("schemas", "workflow-definition.json");
const enums = engine("enums.json");
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;
const perPlatform = (name: string) => PLATFORMS.map((p) => `paid_social.${name}_${p}`);

/** Steps that can run before `id`: its needs, their needs, and so on. */
function ancestors(wf: Workflow, id: string): Set<string> {
  const seen = new Set<string>();
  const todo = [...(byId(wf, id).needs ?? [])];
  while (todo.length) {
    const n = todo.pop()!;
    if (seen.has(n)) continue;
    seen.add(n);
    todo.push(...(byId(wf, n).needs ?? []));
  }
  return seen;
}

/** Spend steps that run without a budget gate because spend_policies covers them (engine G1). */
const SPEND_INSIDE_POLICY = new Set(["creative_test_*.launch", "daily_optimize_*.apply_small"]);
const policyKey = (wf: Workflow, s: WorkflowStep) => `${wf.id.replace(/^paid_social\./, "").replace(/_(meta|linkedin|tiktok|snapchat)$/, "_*")}.${s.id}`;

describe("paid social workflows", () => {
  it("has 6 platform-neutral workflows and 4 templates × 4 platforms", () => {
    expect(workflows.map((w) => w.id).sort()).toEqual(
      [
        "paid_social.creative_refresh", "paid_social.creator_amplify", "paid_social.monthly_plan", "paid_social.onboard",
        "paid_social.rights_pause", "paid_social.weekly_report",
        ...perPlatform("creative_refresh"), ...perPlatform("creative_test"), ...perPlatform("creator_launch"), ...perPlatform("daily_optimize"),
      ].sort(),
    );
  });

  it("keeps the generated files in step with the templates (run npm run generate)", () => {
    for (const [name, text] of expandTemplates()) {
      expect(readFileSync(dir("workflows", name), "utf8"), name).toBe(text);
    }
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code paid_social and an id that matches the file", () => {
        expect(wf.service).toBe("paid_social");
        expect(Object.keys(enums.services)).toContain("paid_social");
        expect(wf.id).toMatch(/^paid_social\.[a-z_]+$/);
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

      it("has no template placeholders left", () => expect(JSON.stringify(wf)).not.toContain("{{"));

      it("resolves every prompt and output schema it names", () => expect(unresolvedRefs(wf)).toEqual([]));

      it("uses only shared approval kinds, roles, tool names and risks", () => {
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

      it("skips only gate kinds the engine lets skip (approval-inbox §4)", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("has a budget or budget_change gate before every spend step, unless spend_policies covers it (engine G1)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "spend")) {
          if (SPEND_INSIDE_POLICY.has(policyKey(wf, s))) continue;
          const gates = [...ancestors(wf, s.id)].map((id) => byId(wf, id).gate?.approval_kind);
          expect(gates.some((k) => k === "budget" || k === "budget_change"), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("runs a compliance check before every publish to a platform (engine G6)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "send" || s.tool?.risk === "write_external")) {
          const before = [...ancestors(wf, s.id)].map((id) => byId(wf, id));
          expect(before.some((t) => t.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("never sends messages", () => expect(wf.steps.some((s) => s.tool?.risk === "send")).toBe(false));
    });
  }

  describe("guardrails in detail", () => {
    it("lists only spend steps that exist in the spend_policies allowlist", () => {
      const keys = new Set(workflows.flatMap((wf) => wf.steps.filter((s) => s.tool?.risk === "spend").map((s) => policyKey(wf, s))));
      for (const k of SPEND_INSIDE_POLICY) expect(keys).toContain(k);
    });

    it("pauses ads with risk remove, so a rights or guardrail pause is never blocked (engine G10)", () => {
      const rp = wfById("paid_social.rights_pause");
      for (const p of PLATFORMS) expect(byId(rp, `pause_${p}`).tool).toEqual({ name: `ads_${p}`, action: "ads.pause", risk: "remove" });
      for (const id of perPlatform("daily_optimize")) expect(byId(wfById(id), "pause").tool?.risk).toBe("remove");
    });

    it("pauses only for grants that are no longer active", () => {
      const relevant = byId(wfById("paid_social.rights_pause"), "relevant").branch!;
      expect(relevant.cases![0]).toEqual({ if: "event.data.status != 'active'", goto: "find" });
      expect(relevant.else).toBe("skip");
    });

    it("sends bigger budget moves to a person and keeps tests on their fixed budget", () => {
      for (const id of perPlatform("daily_optimize")) {
        const wf = wfById(id);
        expect(byId(wf, "split").branch!.cases![0].goto).toBe("approve_big_moves");
        expect(byId(wf, "approve_big_moves").gate?.approval_kind).toBe("budget_change");
        expect(byId(wf, "apply_big").needs).toEqual(["approve_big_moves"]);
        expect(byId(wf, "split").needs).toEqual(["classify"]);
      }
    });

    it("escalates silent tracking before the optimizer can move budget", () => {
      for (const id of perPlatform("daily_optimize")) {
        const wf = wfById(id);
        expect(byId(wf, "tracking_ok").branch!.cases![0]).toEqual({ if: "steps.guardrails.output.silent_tracking", goto: "escalate" });
        expect(byId(wf, "escalate").emit).toEqual({ event: "engine/escalation.raised" });
      }
    });

    it("approves the monthly budget with client finance and the performance marketer", () => {
      for (const id of ["paid_social.monthly_plan", "paid_social.onboard"]) {
        const g = byId(wfById(id), "approve_budget").gate!;
        expect(g.approval_kind).toBe("budget");
        expect(g.required_roles).toEqual(["client_finance", "performance_marketer"]);
        expect(g.required_count).toBe(2);
      }
    });

    it("needs a claim approval only when a variant has a new claim, and a person signs every launch", () => {
      for (const id of perPlatform("creative_test")) {
        const wf = wfById(id);
        expect(byId(wf, "has_new_claims").branch!.cases![0].goto).toBe("approve_claims");
        expect(byId(wf, "approve_claims").gate?.skip_if).toBeUndefined();
        expect(byId(wf, "approve_go_live").gate?.skip_if).toBeUndefined();
        expect(index(wf, "approve_go_live")).toBeLessThan(index(wf, "launch"));
      }
    });

    it("lets only a reused, approved creative with no new claims skip the creative gate", () => {
      for (const id of [...perPlatform("creative_test"), ...perPlatform("creative_refresh")]) {
        const g = byId(wfById(id), "approve_creative").gate!;
        expect(g.skip_if).toContain("derived_from_approved");
        expect(g.skip_if).toContain("new_claims");
      }
    });

    it("keeps paid_social.creator_amplify as the entry point for the influencer service and routes by platform", () => {
      const wf = wfById("paid_social.creator_amplify");
      expect(byId(wf, "rights").tool).toEqual({ name: "engine", action: "rights.check", risk: "read" });
      const route = byId(wf, "route").branch!;
      expect(route.cases!.map((c) => c.goto)).toEqual(PLATFORMS.map((p) => `run_${p}`));
      for (const p of PLATFORMS) expect(byId(wf, `run_${p}`).subflow).toEqual({ workflow_id: `paid_social.creator_launch_${p}` });
      expect((wf.inputs as { required: string[] }).required).toContain("platform");
    });

    it("asks for a budget approval in every creator ad run (budget gates never skip)", () => {
      for (const id of perPlatform("creator_launch")) {
        const wf = wfById(id);
        expect(byId(wf, "approve_budget").gate?.skip_if).toBeUndefined();
        expect(ancestors(wf, "launch").has("approve_budget")).toBe(true);
        expect(ancestors(wf, "launch").has("end_dates")).toBe(true);
      }
    });

    it("uses the right ad platform tool in each generated workflow", () => {
      for (const p of PLATFORMS) {
        for (const name of ["creative_test", "daily_optimize", "creative_refresh", "creator_launch"]) {
          const tools = wfById(`paid_social.${name}_${p}`).steps.flatMap((s) => (s.tool && s.tool.name.startsWith("ads_") ? [s.tool.name] : []));
          expect(new Set(tools)).toEqual(new Set([`ads_${p}`]));
        }
      }
    });
  });
});
