import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

const engineSchema = JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", "schemas", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", "enums.json"), "utf8"));
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);

describe("content workflows", () => {
  it("has the 3 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual(["content.piece", "content.plan", "content.refresh"]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema v0.1.0", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code content", () => expect(wf.service).toBe("content"));

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

      it("uses only shared approval kinds and roles", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.task)) {
          for (const r of s.task!.assignee_roles ?? []) expect(enums.roles).toContain(r);
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });
    });
  }

  describe("content.piece guardrails", () => {
    const wf = workflows.find((w) => w.id === "content.piece")!;

    it("runs a compliance check right before publish (engine G6)", () => {
      const publish = byId(wf, "publish");
      expect(publish.tool?.risk).toBe("write_external");
      const before = byId(wf, publish.needs![0]);
      expect(before.type).toBe("check");
      expect(before.check?.kinds).toContain("compliance");
    });

    it("puts the claim gate before the copy gate, and the copy gate before publish", () => {
      expect(index(wf, "claim_gate")).toBeLessThan(index(wf, "approve_copy"));
      expect(index(wf, "approve_copy")).toBeLessThan(index(wf, "publish"));
      expect(byId(wf, "claim_gate").gate?.approval_kind).toBe("claim");
    });

    it("needs the editor and the subject expert on final copy, with no skip", () => {
      const g = byId(wf, "approve_copy").gate!;
      expect(g.required_roles).toEqual(["editor", "subject_expert"]);
      expect(g.required_count).toBe(2);
      expect(g.skip_if).toBeUndefined();
    });

    it("gets the customer release and records rights before a case study is published", () => {
      expect(byId(wf, "customer_release").gate?.required_roles).toEqual(["external_contact"]);
      expect(byId(wf, "record_release_rights").tool?.action).toContain("case_study_release");
      expect(index(wf, "record_release_rights")).toBeLessThan(index(wf, "publish"));
    });

    it("checks repurposed items before handing them to other services", () => {
      expect(byId(wf, "handoff").needs).toEqual(["repurpose_check"]);
      expect(byId(wf, "repurpose_check").check?.kinds).toContain("compliance");
    });
  });
});
