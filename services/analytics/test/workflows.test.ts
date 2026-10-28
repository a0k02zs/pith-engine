import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir, engineDir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

// The engine contracts live in this repository, so the tests read them directly.
const engineSchema = JSON.parse(readFileSync(engineDir("contracts", "schemas", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(engineDir("contracts", "enums.json"), "utf8"));
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

describe("analytics workflows", () => {
  it("has the 6 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "analytics.daily_data_qa", "analytics.incrementality_test", "analytics.monthly_roi",
      "analytics.onboarding", "analytics.quarterly_mmm", "analytics.weekly_report",
    ]);
  });

  it("uses a service code from the engine enums", () => expect(Object.keys(enums.services)).toContain("analytics"));

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code analytics", () => expect(wf.service).toBe("analytics"));

      it("has a SQL model for every warehouse query it runs", () => {
        for (const s of wf.steps.filter((s) => s.tool?.action?.startsWith("warehouse.query:"))) {
          const model = s.tool!.action!.split(":")[1];
          expect(existsSync(dir("sql", `${model}.sql`)), `${wf.id}.${s.id}: sql/${model}.sql`).toBe(true);
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

      it("resolves every prompt and output schema it names", () => expect(unresolvedRefs(wf)).toEqual([]));

      it("uses only shared approval kinds, roles, tool names and engine actions", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
          if ((s.gate!.required_roles ?? []).length > 1) expect(s.gate!.required_count).toBe(s.gate!.required_roles!.length);
        }
        for (const s of wf.steps.filter((s) => s.task)) {
          for (const r of s.task!.assignee_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(["analytics", "engine"]).toContain(s.tool!.name);
          expect(Object.keys(enums.tool_registry)).toContain(s.tool!.name);
          expect(Object.keys(enums.tool_risk_meaning)).toContain(s.tool!.risk);
          if (s.tool!.name === "engine") expect(Object.keys(enums.engine_actions)).toContain(s.tool!.action);
        }
      });

      it("emits only its own events or engine metric events", () => {
        for (const s of wf.steps.filter((s) => s.emit)) {
          expect(s.emit!.event).toMatch(/^(svc\.analytics\/[a-z_]+\.[a-z_]+|engine\/metric\.recorded)$/);
        }
      });

      it("never spends, sends, signs or pays (engine G1, G5)", () => {
        for (const s of wf.steps.filter((s) => s.tool)) expect(["spend", "send", "sign", "pay"]).not.toContain(s.tool!.risk);
      });

      it("skips no gate (report and plan gates cannot skip)", () => {
        expect(wf.steps.filter((s) => s.gate?.skip_if)).toEqual([]);
      });

      it("runs a compliance check before any external write (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "write_external") continue;
          expect(wf.steps.slice(0, i).some((t) => t.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });
    });
  }

  describe("approval points", () => {
    it("onboarding passes G1, G2, compliance and G3 in order before the tag publish", () => {
      const wf = wfById("analytics.onboarding");
      const order = ["audit", "g1_audit", "plan", "g2_tracking_plan", "build", "test", "compliance", "g3_go_live", "publish"].map((id) => index(wf, id));
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(byId(wf, "g2_tracking_plan").gate?.required_roles).toEqual(["analytics_lead", "client_marketing_lead"]);
      expect(byId(wf, "g3_go_live").gate).toMatchObject({ approval_kind: "go_live", required_roles: ["analytics_lead", "ops_lead"], sla_hours: 24 });
      expect(byId(wf, "publish").needs).toEqual(["g3_go_live"]);
    });

    it("every client report waits for a G4 report gate", () => {
      for (const id of ["analytics.weekly_report", "analytics.monthly_roi"]) {
        const wf = wfById(id);
        expect(byId(wf, "g4_report").gate?.approval_kind).toBe("report");
        expect(byId(wf, "deliver").needs).toEqual(["g4_report"]);
      }
      expect(byId(wfById("analytics.weekly_report"), "g4_report").gate?.sla_hours).toBe(8);
    });

    it("holds a report when the data check blocks", () => {
      for (const id of ["analytics.weekly_report", "analytics.monthly_roi"]) {
        const c = byId(wfById(id), "route_qa").branch!.cases![0];
        expect(c).toEqual({ if: "steps.qa.output.status == 'block'", goto: "hold" });
      }
    });

    it("runs the data checks in code, not in an agent", () => {
      for (const wf of workflows) {
        const qa = wf.steps.find((s) => s.id === "qa");
        if (qa) expect(qa.tool).toEqual({ name: "analytics", action: "qa.run", risk: "read" });
      }
    });

    it("MMM: readiness and fit checks gate the readout, and G6 needs analytics lead and strategist", () => {
      const wf = wfById("analytics.quarterly_mmm");
      expect(index(wf, "readiness")).toBeLessThan(index(wf, "fit"));
      expect(index(wf, "fit_check")).toBeLessThan(index(wf, "readout"));
      expect(byId(wf, "g6_mmm").gate).toMatchObject({ approval_kind: "plan", required_roles: ["analytics_lead", "strategist"] });
      expect(byId(wf, "deliver").needs).toEqual(["g6_mmm"]);
    });

    it("tests: power check, then G5 design, then the budget_change gate, then a person sets up the holdout", () => {
      const wf = wfById("analytics.incrementality_test");
      expect(byId(wf, "route_power").branch!.cases![0].goto).toBe("design");
      expect(byId(wf, "g5_design").gate?.required_roles).toEqual(["strategist", "client_marketing_lead"]);
      expect(byId(wf, "g5_spend").gate).toMatchObject({ approval_kind: "budget_change", required_roles: ["performance_marketer"] });
      expect(byId(wf, "setup").type).toBe("task");
      expect(byId(wf, "setup").needs).toEqual(["g5_spend"]);
    });

    it("alerts go to Pith staff as service events, not to the client", () => {
      const wf = wfById("analytics.daily_data_qa");
      expect(byId(wf, "alerts").emit?.event).toBe("svc.analytics/alert.raised");
      expect(wf.steps.some((s) => s.tool?.action === "reports.publish")).toBe(false);
    });
  });
});
