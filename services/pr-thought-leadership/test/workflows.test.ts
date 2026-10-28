import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

const engine = (...p: string[]) => JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", ...p), "utf8"));
const engineSchema = engine("schemas", "workflow-definition.json");
const enums = engine("enums.json");
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

/** Every step a step depends on, directly or through other steps. */
function ancestors(wf: Workflow, id: string, seen = new Set<string>()): Set<string> {
  for (const n of byId(wf, id).needs ?? []) {
    if (!seen.has(n)) {
      seen.add(n);
      ancestors(wf, n, seen);
    }
  }
  return seen;
}

describe("pr workflows", () => {
  it("has the 9 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "pr.angle_plan", "pr.announcement", "pr.crisis", "pr.exec_weekly", "pr.media_list_refresh",
      "pr.monitor", "pr.monthly_report", "pr.pitch_campaign", "pr.reactive_request",
    ]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code pr", () => expect(wf.service).toBe("pr"));

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

      it("uses only shared approval kinds and roles", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.task)) for (const r of s.task!.assignee_roles ?? []) expect(enums.roles).toContain(r);
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
      });

      it("uses registered tools, and engine actions that exist", () => {
        for (const s of wf.steps.filter((s) => s.tool)) {
          const name = s.tool!.name!;
          expect(Object.keys(enums.tool_registry)).toContain(name);
          if (name === "engine") expect(Object.keys(enums.engine_actions)).toContain(s.tool!.action);
        }
      });

      it("never sends: no tool step has risk send, sign, pay or spend", () => {
        for (const s of wf.steps.filter((s) => s.tool)) expect(["send", "sign", "pay", "spend"]).not.toContain(s.tool!.risk);
      });

      it("has a compliance check before every publish step (engine G6)", () => {
        for (const s of wf.steps.filter((s) => s.tool?.risk === "write_external")) {
          const checks = [...ancestors(wf, s.id)].map((id) => byId(wf, id)).filter((a) => a.check?.kinds?.includes("compliance"));
          expect(checks.length, `${s.id} has no compliance check before it`).toBeGreaterThan(0);
        }
      });
    });
  }

  describe("the send rule", () => {
    it("puts a pitch into a mailbox only after the PR lead approves it, and a person sends it", () => {
      const wf = wfById("pr.pitch_campaign");
      expect(byId(wf, "drafts").tool).toEqual({ name: "mailbox", action: "drafts.create", risk: "write_internal" });
      expect(ancestors(wf, "drafts")).toContain("approve");
      expect(byId(wf, "approve").gate?.required_roles).toEqual(["pr_lead"]);
      expect(byId(wf, "human_send").type).toBe("task");
      expect(byId(wf, "human_send").needs).toEqual(["drafts"]);
    });

    it("needs the spokesperson and then the PR lead before a request reply, with a 2-hour human send", () => {
      const wf = wfById("pr.reactive_request");
      expect(byId(wf, "expert").gate?.sla_hours).toBe(2);
      expect(byId(wf, "pr_ok").needs).toEqual(["expert"]);
      expect(byId(wf, "human_send").task?.due_hours).toBe(2);
    });

    it("sends listed-client price-sensitive pitches to legal (claim gates never skip)", () => {
      const wf = wfById("pr.pitch_campaign");
      expect(byId(wf, "is_listed").branch?.cases?.[0]).toEqual({ if: "client.is_listed && steps.pitches.output.price_sensitive", goto: "listed" });
      expect(byId(wf, "listed").gate?.approval_kind).toBe("claim");
      expect(byId(wf, "listed").gate?.skip_if).toBeUndefined();
    });
  });

  describe("executive posts", () => {
    const wf = wfById("pr.exec_weekly");
    it("the executive approves every post and the gate never skips", () => {
      const g = byId(wf, "exec_ok").gate!;
      expect(g.required_roles).toEqual(["client_executive"]);
      expect(g.skip_if).toBeUndefined();
      expect(ancestors(wf, "schedule")).toContain("exec_ok");
    });
    it("only suggests comments; no tool step posts them", () => {
      const after = wf.steps.filter((s) => ancestors(wf, s.id).has("engage") || s.id === "engage");
      expect(after.every((s) => s.type !== "tool")).toBe(true);
    });
  });

  describe("crisis", () => {
    const wf = wfById("pr.crisis");
    it("starts on engine/escalation.raised and pauses all services only at level 3", () => {
      expect((wf.trigger as { event: string }).event).toBe("engine/escalation.raised");
      expect(byId(wf, "pause").tool).toEqual({ name: "engine", action: "client.pause_scheduled", risk: "remove" });
      expect(byId(wf, "level3").branch?.cases?.[0].goto).toBe("pause");
    });
    it("gives the PR lead 15 minutes, then legal and the executive approve every word", () => {
      expect(byId(wf, "escalate").gate).toMatchObject({ approval_kind: "escalation", required_roles: ["pr_lead"], sla_hours: 0.25 });
      expect(byId(wf, "decide").gate).toMatchObject({ required_roles: ["client_legal", "client_executive"], required_count: 2 });
      expect(byId(wf, "respond").type).toBe("task");
    });
  });
});
