import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { engineDir } from "../src/paths.js";
import { loadWorkflows, readJson, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";
import { STAGES } from "../src/packages.js";

const engineSchema = readJson(engineDir("schemas", "workflow-definition.json"));
const enums = readJson(engineDir("enums.json"));
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const build = workflows.find((w) => w.id === "brand.build") as Workflow;

describe("brand workflows", () => {
  it("has the 4 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual(["brand.build", "brand.market_adaptation", "brand.monitor", "brand.research"]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code brand", () => {
        expect(wf.service).toBe("brand");
        expect(Object.keys(enums.services)).toContain("brand");
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

      it("lists needs only on earlier steps", () => {
        for (const s of wf.steps) for (const n of s.needs ?? []) expect(index(wf, n)).toBeLessThan(index(wf, s.id));
      });

      it("resolves every prompt, output schema and subflow it names", () => {
        expect(unresolvedRefs(wf)).toEqual([]);
      });

      it("uses only shared approval kinds and roles", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
          expect(s.gate!.required_count ?? 1).toBeLessThanOrEqual(s.gate!.required_roles!.length);
        }
      });

      it("never skips a gate", () => {
        for (const s of wf.steps.filter((s) => s.gate)) expect(s.gate!.skip_if).toBeUndefined();
      });

      it("names a risk on every tool step, and never sends, spends, signs or pays", () => {
        for (const s of wf.steps.filter((s) => s.type === "tool")) {
          expect(["read", "write_internal"]).toContain(s.tool?.risk);
        }
      });

      it("uses the event names this service owns", () => {
        for (const s of wf.steps.filter((s) => s.emit)) {
          expect(s.emit!.event).toMatch(/^(svc\.brand\/[a-z_]+\.[a-z_]+|engine\/metric\.recorded)$/);
        }
      });
    });
  }
});

describe("brand.build", () => {
  it("has a gate for each of the 5 approval points, with the kinds and roles of the pipeline doc", () => {
    const gates = STAGES.filter((s) => s.gate);
    expect(gates).toHaveLength(5);
    for (const stage of gates) {
      const step = byId(build, stage.id);
      expect(step?.type, stage.id).toBe("gate");
      expect(step.gate!.approval_kind).toBe(stage.gate!.approval_kind);
      expect(step.gate!.required_roles).toEqual(stage.gate!.required_roles);
      expect(step.gate!.required_count).toBe(stage.gate!.required_count);
    }
  });

  it("approves the brain only through a design gate before it tells other services", () => {
    expect(byId(build, "approve_brain").gate!.approval_kind).toBe("design");
    expect(index(build, "approve_brain")).toBeLessThan(index(build, "brain_live"));
    expect(byId(build, "brain_live").needs).toContain("approve_brain");
  });

  it("saves the draft brain only after compiling, and calibrates the scorer before go-live", () => {
    expect(byId(build, "save_draft").tool!.action).toBe("PUT /clients/{client_id}/brain");
    expect(index(build, "compile_brain")).toBeLessThan(index(build, "save_draft"));
    expect(index(build, "calibrate_scorer")).toBeLessThan(index(build, "approve_brain"));
  });

  it("routes Package A past strategy and visual design", () => {
    const route = byId(build, "route_package");
    expect(route.branch!.cases![0].goto).toBe("verbal_identity");
    expect(byId(build, "route_design").branch!.cases![0].goto).toBe("guidelines");
  });

  it("proposes new claims through the engine claims endpoint", () => {
    expect(byId(build, "propose_claims").tool!.action).toBe("POST /clients/{client_id}/claims");
  });
});
