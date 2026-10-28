import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { createValidator, loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

// The engine contracts are on main in engine/contracts. Read them from there, not from a copy.
const engineSchema = JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", "schemas", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", "enums.json"), "utf8"));
const workflows = loadWorkflows();
const ajv = createValidator();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

/** Top-level properties of a schema, including those from a $ref to $defs. */
const propsOf = (ref: string): Set<string> => {
  const s = ajv.getSchema(ref)!.schema as { properties: Record<string, unknown> };
  return new Set(Object.keys(s.properties));
};

describe("cro workflows", () => {
  it("has the 4 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual(["cro.landing_page", "cro.localize", "cro.optimization_test", "cro.test_monitor"]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code cro", () => expect(wf.service).toBe("cro"));

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

      it("reads only output fields that the step's schema defines", () => {
        const schemaOf = new Map(wf.steps.filter((s) => s.agent?.output_schema).map((s) => [s.id, s.agent!.output_schema!]));
        const exprs = wf.steps.flatMap((s) => [s.gate?.skip_if ?? "", ...(s.branch?.cases ?? []).map((c) => c.if)]);
        for (const e of exprs) {
          for (const [, step, field] of e.matchAll(/steps\.([a-z_]+)\.output\.([a-z_]+)/g)) {
            // Tool steps (cro stats, experiment reads) return the tool's own result shape.
            if (byId(wf, step)?.type === "tool") continue;
            expect(schemaOf.has(step), `${wf.id}: ${step} has no output schema`).toBe(true);
            expect([...propsOf(schemaOf.get(step)!)], `${wf.id}: ${e}`).toContain(field);
          }
        }
      });

      it("uses only shared approval kinds, roles, tool names and risks", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(Object.keys(enums.tool_registry)).toContain(s.tool!.name);
          expect(Object.keys(enums.tool_risk_meaning)).toContain(s.tool!.risk);
        }
      });

      it("emits only svc.cro/* or engine/* events", () => {
        for (const s of wf.steps) {
          const ev = (s.emit as { event?: string } | undefined)?.event;
          if (ev) expect(ev).toMatch(/^(svc\.cro|engine)\//);
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("runs a compliance check before every change to a live site (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "write_external") continue;
          expect(wf.steps.slice(0, i).some((t) => t.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("has a go_live gate right before every change to a live site (engine G9)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "write_external") continue;
          const gate = wf.steps[i - 1];
          expect(gate.gate?.approval_kind, `${wf.id}.${s.id}`).toBe("go_live");
          expect(s.needs).toContain(gate.id);
        }
      });

      it("never spends, sends, signs or pays", () => {
        for (const s of wf.steps) expect(["spend", "send", "sign", "pay"]).not.toContain(s.tool?.risk);
      });
    });
  }

  describe("guardrails in detail", () => {
    it("pauses a test with risk remove, so a stop never waits for a person (engine G10)", () => {
      const wf = wfById("cro.test_monitor");
      for (const id of ["stop_early", "stop_end"]) {
        expect(byId(wf, id).tool?.risk).toBe("remove");
        expect(byId(wf, id).gate).toBeUndefined();
      }
      expect(index(wf, "stop_early")).toBeLessThan(index(wf, "escalate"));
    });

    it("stops on SRM or a harmed guardrail before the end date", () => {
      const route = byId(wfById("cro.test_monitor"), "route").branch!;
      expect(route.cases![0].goto).toBe("stop_early");
      expect(route.cases![0].if).toContain("srm_detected");
      expect(route.cases![0].if).toContain("any_harmed");
    });

    it("needs 2 people at go-live and ends the run on a reject", () => {
      for (const id of ["cro.landing_page", "cro.optimization_test"]) {
        const g = byId(wfById(id), "approve_go_live").gate!;
        expect(g.required_count).toBe(2);
        expect(g.on_reject).toBe("fail");
      }
    });

    it("needs 2 of legal, client approver and finance for a claim, price or offer", () => {
      const g = byId(wfById("cro.optimization_test"), "approve_claim").gate!;
      expect(g.approval_kind).toBe("claim");
      expect(g.required_roles).toEqual(["client_legal", "client_approver", "client_finance"]);
      expect(g.required_count).toBe(2);
      expect(g.skip_if).toBeUndefined();
    });

    it("approves the plan before any build, and the winner before it ships", () => {
      const wf = wfById("cro.optimization_test");
      expect(index(wf, "approve_plan")).toBeLessThan(index(wf, "build"));
      expect(index(wf, "approve_plan")).toBeLessThan(index(wf, "draft_in_tool"));
      expect(byId(wf, "approve_winner").gate?.approval_kind).toBe("test_winner");
      expect(byId(wf, "ship").needs).toEqual(["approve_ship_live"]);
      expect(byId(wf, "approve_ship_live").needs).toEqual(["approve_winner"]);
    });

    it("creates the variant as a draft, not live", () => {
      expect(byId(wfById("cro.optimization_test"), "draft_in_tool").tool?.risk).toBe("write_internal");
    });

    it("stops the run when tracking is broken", () => {
      const b = byId(wfById("cro.optimization_test"), "tracking_ok").branch!;
      expect(b.cases![0].goto).toBe("tracking_broken");
    });

    it("sends French, German, Spanish and Arabic copy to a native editor", () => {
      const g = byId(wfById("cro.localize"), "native_review").gate!;
      expect(g.required_roles).toEqual(["native_editor"]);
      expect(g.skip_if).toBe("!steps.localize.output.needs_native_review");
    });
  });
});
