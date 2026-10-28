import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

const engineSchema = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "enums.json"), "utf8"));
const workflows = loadWorkflows();

/** Engine actions this service needs that engine v0.1.0 does not list yet. Asked for on the engine thread. */
const PENDING_ENGINE_ACTIONS = ["spend_policies.upsert"];
const AD_PLATFORMS = ["ads_google", "ads_meta", "ads_linkedin", "ads_tiktok", "ads_snapchat"];

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

describe("campaigns workflows", () => {
  it("has the 3 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual(["campaigns.crisis", "campaigns.launch", "campaigns.optimize_daily"]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema v0.1.0", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code campaigns", () => expect(wf.service).toBe("campaigns"));

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

      it("uses only shared approval kinds, roles, tool names and engine actions", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(Object.keys(enums.tool_registry)).toContain(s.tool!.name);
          expect(Object.keys(enums.tool_risk_meaning)).toContain(s.tool!.risk);
          if (s.tool!.name === "engine") expect([...Object.keys(enums.engine_actions), ...PENDING_ENGINE_ACTIONS]).toContain(s.tool!.action);
        }
      });

      it("uses event names in the engine form", () => {
        for (const s of wf.steps) {
          const ev = (s.emit as { event?: string } | undefined)?.event ?? (s.wait as { event?: string } | undefined)?.event;
          if (ev) expect(ev).toMatch(/^(engine|svc\.campaigns)\/[a-z_]+\.[a-z_]+$/);
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("has a budget gate before every spend step (engine G1)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "spend") continue;
          const earlier = wf.steps.slice(0, i);
          const gated = earlier.some((t) => t.gate?.approval_kind === "budget" || t.gate?.approval_kind === "budget_change");
          // Daily moves inside spend_policies need no gate; only the within-policy action may rely on that.
          const withinPolicy = s.tool.action === "budgets.apply_within_policy";
          expect(gated || withinPolicy, `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("runs a compliance check before every send or publish (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "send" && s.tool?.risk !== "write_external") continue;
          expect(wf.steps.slice(0, i).some((t) => t.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("never sends or publishes itself: channel services do that", () => {
        expect(wf.steps.some((s) => s.tool?.risk === "send" || s.tool?.risk === "write_external")).toBe(false);
      });
    });
  }

  describe("guardrails in detail", () => {
    const launch = wfById("campaigns.launch");
    const daily = wfById("campaigns.optimize_daily");
    const crisis = wfById("campaigns.crisis");

    it("needs the strategist and the client on the concept, and 2 approvers on the budget", () => {
      expect(byId(launch, "approve_concept").gate).toMatchObject({ approval_kind: "plan", required_count: 2 });
      expect(byId(launch, "approve_budget").gate).toMatchObject({ approval_kind: "budget", required_count: 2, on_reject: "fail" });
      expect(byId(launch, "approve_budget").gate!.required_roles).toContain("client_finance");
    });

    it("sets spend policies after the budget gate and before any spend", () => {
      const firstSpend = launch.steps.findIndex((s) => s.tool?.risk === "spend");
      expect(index(launch, "approve_budget")).toBeLessThan(index(launch, "set_spend_policies"));
      expect(index(launch, "set_spend_policies")).toBeLessThan(firstSpend);
    });

    it("turns on spend on each ad platform only after the go-live gate and the launch compliance check", () => {
      for (const p of AD_PLATFORMS) {
        const step = launch.steps.find((s) => s.tool?.name === p)!;
        expect(step.tool!.risk).toBe("spend");
        expect(step.needs).toEqual(["approve_go_live"]);
      }
      expect(index(launch, "launch_compliance")).toBeLessThan(index(launch, "approve_go_live"));
      expect(byId(launch, "emit_launched").needs).toHaveLength(AD_PLATFORMS.length);
    });

    it("fans out to channel services and analytics with subflows", () => {
      expect((byId(launch, "channel_assets").subflow as { workflow_id: string }).workflow_id).toBe("<service>.campaign_assets");
      expect((byId(launch, "tracking").subflow as { workflow_id: string }).workflow_id).toBe("analytics.campaign_tracking");
    });

    it("sends only out-of-policy moves to the G5 budget_change gate", () => {
      const route = byId(daily, "route").branch!;
      expect(route.cases![0].goto).toBe("approve_budget_change");
      expect(route.cases![0].if).toContain("needs_g5");
      expect(byId(daily, "approve_budget_change").gate!.approval_kind).toBe("budget_change");
      for (const s of daily.steps.filter((s) => s.tool?.action === "budgets.apply")) expect(s.needs).toEqual(["approve_budget_change"]);
    });

    it("pauses first with risk remove, so a crisis pause is never blocked (engine G10), and resumes only after G6", () => {
      expect(crisis.steps[0].tool).toMatchObject({ name: "engine", action: "client.pause_scheduled", risk: "remove" });
      expect(byId(crisis, "approve_action").gate!.approval_kind).toBe("escalation");
      expect(byId(crisis, "resume").needs).toEqual(["approve_action"]);
    });

    it("writes the lessons to the brain only after the final report gate", () => {
      expect(byId(launch, "learn").tool).toMatchObject({ name: "engine", action: "learnings.write" });
      expect(byId(launch, "learn").needs).toEqual(["approve_report"]);
    });
  });
});
