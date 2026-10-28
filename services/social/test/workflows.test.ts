import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

const engineSchema = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "enums.json"), "utf8"));
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

describe("social workflows", () => {
  it("has the 8 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "social.create_post", "social.engage_inbox", "social.escalate", "social.listen_daily",
      "social.onboard", "social.plan_monthly", "social.reactive_post", "social.weekly_report",
    ]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema v0.1.0", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code social", () => expect(wf.service).toBe("social"));

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

      it("gives every agent step an output schema", () => {
        for (const s of wf.steps.filter((s) => s.agent)) expect(s.agent!.output_schema, s.id).toBeTruthy();
      });

      it("uses only shared approval kinds, roles, tool names and engine actions", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(Object.keys(enums.tool_registry)).toContain(s.tool!.name);
          expect(Object.keys(enums.tool_risk_meaning)).toContain(s.tool!.risk);
          if (s.tool!.name === "engine") expect(Object.keys(enums.engine_actions)).toContain(s.tool!.action);
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("never spends, signs or pays (boosting is service 11)", () => {
        for (const s of wf.steps.filter((s) => s.tool)) expect(["spend", "sign", "pay"]).not.toContain(s.tool!.risk);
      });

      it("runs a compliance check before every send or publish (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "send" && s.tool?.risk !== "write_external") continue;
          expect(wf.steps.slice(0, i).some((t) => t.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });
    });
  }

  describe("guardrails in detail", () => {
    it("pauses every scheduled post on a sev1 crisis with risk remove (engine G10)", () => {
      const wf = wfById("social.escalate");
      const pause = byId(wf, "pause_queue");
      expect(pause.tool).toEqual({ name: "engine", action: "client.pause_scheduled", risk: "remove" });
      expect(byId(wf, "severity").branch!.cases![0]).toEqual({ if: "steps.summarize.output.severity == 'sev1'", goto: "pause_queue" });
    });

    it("hides spam with risk remove, so moderation is never blocked (engine G10)", () => {
      expect(byId(wfById("social.engage_inbox"), "hide_spam").tool?.risk).toBe("remove");
    });

    it("raises escalations and never lets the agent reply to them (engine G4)", () => {
      const inbox = wfById("social.engage_inbox");
      expect(byId(inbox, "escalate").emit).toEqual({ event: "engine/escalation.raised" });
      expect(byId(wfById("social.listen_daily"), "raise").emit).toEqual({ event: "engine/escalation.raised" });
      const esc = wfById("social.escalate");
      expect(esc.trigger).toEqual({ event: "engine/escalation.raised" });
      expect(byId(esc, "decide").gate).toMatchObject({ approval_kind: "escalation", sla_hours: 1 });
      expect(index(esc, "decide")).toBeLessThan(index(esc, "reply"));
      expect(byId(esc, "decide").gate?.skip_if).toBeUndefined();
    });

    it("checks reply drafts before the community manager approves them", () => {
      const wf = wfById("social.engage_inbox");
      expect(byId(wf, "drafts").needs).toEqual(["check_drafts"]);
      expect(byId(wf, "check_drafts").check?.kinds).toContain("compliance");
      expect(byId(wf, "auto_reply").needs).toEqual(["check_auto"]);
    });

    it("sends a post with a new claim to the claim gate, which is never skipped (engine G3)", () => {
      const wf = wfById("social.create_post");
      const claim = byId(wf, "approve_claim").gate!;
      expect(claim.approval_kind).toBe("claim");
      expect(claim.skip_if).toBeUndefined();
      expect(byId(wf, "route").branch!.cases!.some((c) => c.goto === "approve_claim" && c.if.includes("new_claims"))).toBe(true);
    });

    it("blocks before it retries, and lets only a clean publish decision with no new claims skip Gate B", () => {
      const wf = wfById("social.create_post");
      expect(byId(wf, "route").branch!.cases![0]).toEqual({ if: "steps.check.output.decision == 'block'", goto: "approve_post" });
      const g = byId(wf, "approve_post").gate!;
      expect(g.approval_kind).toBe("content");
      expect(g.skip_if).toContain("== 'publish'");
      expect(g.skip_if).toContain("new_claims");
      expect(index(wf, "review")).toBeLessThan(index(wf, "check"));
      expect(index(wf, "approve_post")).toBeLessThan(index(wf, "schedule"));
    });

    it("never skips the gate on a reactive post", () => {
      const g = byId(wfById("social.reactive_post"), "approve").gate!;
      expect(g.skip_if).toBeUndefined();
      expect(g.required_roles).toContain("social_lead");
    });

    it("needs the social lead and the client on the monthly calendar (Gate A)", () => {
      const wf = wfById("social.plan_monthly");
      const g = byId(wf, "approve_calendar").gate!;
      expect(g.approval_kind).toBe("calendar");
      expect(g.required_roles).toEqual(["social_lead", "client_approver"]);
      expect(g.required_count).toBe(2);
      expect(index(wf, "native_review")).toBeLessThan(index(wf, "approve_calendar"));
      expect(byId(wf, "native_review").gate?.required_roles).toEqual(["native_editor"]);
    });

    it("writes learnings to the brain only after a person reviewed them", () => {
      const report = wfById("social.weekly_report");
      expect(byId(report, "learn").needs).toEqual(["review"]);
      const esc = wfById("social.escalate");
      expect(byId(esc, "save_learning").tool?.action).toBe("learnings.write");
      expect(index(esc, "decide")).toBeLessThan(index(esc, "save_learning"));
    });
  });
});
