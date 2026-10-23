import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

// Video reads the engine contracts from the repo (engine/ is on main), so a contract change breaks these tests at once.
const engine = (...p: string[]) => JSON.parse(readFileSync(dir("..", "..", "engine", ...p), "utf8"));
const engineSchema = engine("contracts", "schemas", "workflow-definition.json");
const enums = engine("contracts", "enums.json");
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;
const before = (wf: Workflow, i: number, test: (s: WorkflowStep) => boolean) => wf.steps.slice(0, i).some(test);

describe("video workflows", () => {
  it("has the 4 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual(["video.campaign_assets", "video.job", "video.variant_refresh", "video.weekly_learn"]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code video", () => {
        expect(wf.service).toBe("video");
        expect(enums.services.video).toBe(3);
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

      it("uses only shared approval kinds, roles, tool names and engine actions", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.task)) {
          for (const r of s.task!.assignee_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(Object.keys(enums.tool_registry), `${wf.id}.${s.id}`).toContain(s.tool!.name);
          expect(Object.keys(enums.tool_risk_meaning)).toContain(s.tool!.risk);
          if (s.tool!.name === "engine") expect(Object.keys(enums.engine_actions)).toContain(s.tool!.action);
        }
        for (const s of wf.steps.filter((s) => s.agent?.tools)) {
          for (const t of s.agent!.tools as string[]) expect(Object.keys(enums.tool_registry)).toContain(t);
        }
      });

      it("emits only video events or engine events", () => {
        for (const s of wf.steps.filter((s) => s.emit)) {
          expect((s.emit as { event: string }).event).toMatch(/^(svc\.video\/[a-z_]+\.[a-z_]+|engine\/[a-z_]+\.[a-z_]+)$/);
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("never sends, spends or pays (video hands files to social and paid)", () => {
        for (const s of wf.steps.filter((s) => s.tool)) expect(["send", "spend", "pay"]).not.toContain(s.tool!.risk);
      });

      it("runs a compliance check before any write_external step (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "write_external") continue;
          expect(before(wf, i, (t) => t.check?.kinds?.includes("compliance") ?? false), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("has a contract gate before every sign step (engine G2)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "sign") continue;
          expect(before(wf, i, (t) => t.gate?.approval_kind === "contract")).toBe(true);
        }
      });
    });
  }

  describe("video.job in detail", () => {
    const wf = wfById("video.job");

    it("needs the creative lead and the client on the script before any production", () => {
      const g = byId(wf, "approve_script").gate!;
      expect(g.required_roles).toEqual(["creative_lead", "client_approver"]);
      expect(g.required_count).toBe(2);
      expect(g.skip_if).toBeUndefined();
      expect(index(wf, "approve_script")).toBeLessThan(index(wf, "plan"));
    });

    it("looks up active grants first and collects releases only for missing ones", () => {
      expect(byId(wf, "lookup_rights").tool).toEqual({ name: "engine", action: "rights.check", risk: "read" });
      const route = byId(wf, "route_missing").branch!;
      expect(route.cases![0].goto).toBe("collect_rights");
      expect(route.else).toBe("check_rights");
      expect(byId(wf, "collect_rights").type).toBe("task");
      expect(byId(wf, "wait_rights").wait).toMatchObject({ event: "engine/rights.changed", timeout: "21d" });
    });

    it("checks rights (engine G8) before any production track starts", () => {
      for (const id of ["produce_ai", "produce_ugc", "produce_shoot", "edit"]) {
        expect(index(wf, "check_rights")).toBeLessThan(index(wf, id));
      }
      expect(byId(wf, "check_rights").check?.kinds).toContain("compliance");
    });

    it("routes the 3 production tracks", () => {
      const gotos = byId(wf, "route_track").branch!.cases!.map((c) => c.goto);
      expect(gotos).toEqual(["produce_ai", "produce_ugc", "produce_shoot"]);
      expect(byId(wf, "produce_shoot").task?.done_output_schema).toBe("video/footage@1");
    });

    it("never skips the editor final review, and skips the client review only for routine formats", () => {
      expect(byId(wf, "approve_final").gate?.skip_if).toBeUndefined();
      const skip = byId(wf, "approve_final_client").gate!.skip_if!;
      for (const word of ["hero", "testimonial", "new_template"]) expect(skip).toContain(word);
    });

    it("runs the QC agent and the engine check before the final review", () => {
      expect(index(wf, "qc_auto")).toBeLessThan(index(wf, "qc"));
      expect(index(wf, "qc")).toBeLessThan(index(wf, "approve_final"));
      expect(byId(wf, "qc").check?.kinds).toEqual(expect.arrayContaining(["compliance", "accessibility"]));
    });

    it("registers artifacts before it hands off the files", () => {
      expect(byId(wf, "register").tool).toMatchObject({ name: "engine", action: "artifacts.create" });
      expect(index(wf, "register")).toBeLessThan(index(wf, "handoff"));
      expect(byId(wf, "handoff").emit).toEqual({ event: "svc.video/asset.delivered" });
    });
  });

  describe("other workflows", () => {
    it("lets a hook refresh skip approval only with no new claims on a reused body", () => {
      const skip = byId(wfById("video.variant_refresh"), "approve_hooks").gate!.skip_if!;
      expect(skip).toContain("new_claims");
      expect(skip).toContain("body_reused");
    });

    it("has a person check the weekly report before learnings go into the brain", () => {
      const wf = wfById("video.weekly_learn");
      expect(byId(wf, "review_report").gate?.approval_kind).toBe("report");
      expect(byId(wf, "save_learnings").tool).toMatchObject({ name: "engine", action: "learnings.write" });
      expect(index(wf, "review_report")).toBeLessThan(index(wf, "save_learnings"));
    });

    it("runs campaign assets through the full video job (service-integration item 9)", () => {
      const wf = wfById("video.campaign_assets");
      expect(byId(wf, "produce").subflow).toMatchObject({ workflow_id: "video.job" });
      expect((wf.inputs as { required: string[] }).required).toEqual(["channel_brief", "campaign_id", "markets"]);
      expect(workflows.map((w) => w.id)).toContain("video.job");
    });
  });
});
