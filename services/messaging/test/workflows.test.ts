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
const subflowId = (s: WorkflowStep) => (s.subflow as { workflow_id?: string } | undefined)?.workflow_id;
const hasCompliance = (steps: WorkflowStep[]) => steps.some((t) => t.check?.kinds?.includes("compliance"));

describe("messaging workflows", () => {
  it("has the 10 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "messaging.broadcast", "messaging.campaign_assets", "messaging.client_onboarding", "messaging.opt_out",
      "messaging.optimize_and_report", "messaging.send", "messaging.sender_registration", "messaging.template_lifecycle",
      "messaging.triggered_send", "messaging.two_way_chat",
    ]);
  });

  it("starts only subflows that exist", () => {
    const ids = workflows.map((w) => w.id);
    for (const wf of workflows) for (const s of wf.steps.filter((s) => s.type === "subflow")) expect(ids).toContain(subflowId(s));
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema v0.1.0", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code messaging", () => expect(wf.service).toBe("messaging"));

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
        for (const s of wf.steps.filter((s) => s.task)) for (const r of s.task!.assignee_roles ?? []) expect(enums.roles).toContain(r);
        for (const s of wf.steps.filter((s) => s.tool)) {
          expect(Object.keys(enums.tool_registry)).toContain(s.tool!.name);
          expect(Object.keys(enums.tool_risk_meaning)).toContain(s.tool!.risk);
        }
      });

      it("skips only gates the engine allows to skip", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("gets recipients from the engine before any send (engine G5)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "send") continue;
          expect(wf.steps.slice(0, i).some((t) => t.tool?.name === "engine" && t.tool.action === "audiences.resolve")).toBe(true);
        }
      });

      it("runs a compliance check before every send, publish or send subflow (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          const sends = s.tool?.risk === "send" || s.tool?.risk === "write_external" || subflowId(s) === "messaging.send";
          if (sends) expect(hasCompliance(wf.steps.slice(0, i)), `${wf.id}.${s.id}`).toBe(true);
        }
      });
    });
  }

  describe("guardrails in detail", () => {
    it("has 1 send path: only messaging.send calls a provider with risk send", () => {
      const senders = workflows.filter((w) => w.steps.some((s) => s.tool?.risk === "send")).map((w) => w.id);
      expect(senders).toEqual(["messaging.send"]);
      const send = wfById("messaging.send");
      expect(send.steps.filter((s) => s.tool?.risk === "send").map((s) => s.tool!.name).sort()).toEqual(["push", "sms", "whatsapp"]);
    });

    it("processes an opt-out at once: no gate, no agent, and every sync uses risk remove (engine G10)", () => {
      const wf = wfById("messaging.opt_out");
      expect(wf.steps.some((s) => s.type === "gate" || s.type === "agent" || s.type === "wait")).toBe(false);
      for (const id of ["suppress_sms", "suppress_whatsapp", "suppress_push", "cancel_pending"]) expect(byId(wf, id).tool?.risk).toBe("remove");
      for (const id of ["suppress_sms", "suppress_whatsapp", "suppress_push"]) expect(index(wf, id)).toBeLessThan(index(wf, "confirm"));
    });

    it("handles STOP words before any agent in the chat", () => {
      const wf = wfById("messaging.two_way_chat");
      expect(wf.steps[0].id).toBe("keywords");
      expect(byId(wf, "keywords").branch!.cases![0]).toEqual(expect.objectContaining({ goto: "opt_out" }));
      expect(subflowId(byId(wf, "opt_out"))).toBe("messaging.opt_out");
      expect(byId(wf, "escalate").emit).toEqual({ event: "engine/escalation.raised" });
      expect(byId(wf, "gate_human").gate?.approval_kind).toBe("escalation");
    });

    it("sends a broadcast test cell only after G3 approval by 2 people", () => {
      const wf = wfById("messaging.broadcast");
      const g = byId(wf, "gate_broadcast").gate!;
      expect(g.required_roles).toEqual(["account_lead", "client_approver"]);
      expect(g.required_count).toBe(2);
      expect(byId(wf, "send_test_cell").needs).toContain("gate_broadcast");
      expect(index(wf, "gate_budget")).toBeLessThan(index(wf, "send_test_cell"));
      expect(index(wf, "window_check")).toBeLessThan(index(wf, "send_rest"));
    });

    it("lets only a reused template with no new claims skip client approval", () => {
      const g = byId(wfById("messaging.template_lifecycle"), "gate_template").gate!;
      expect(g.approval_kind).toBe("template");
      expect(g.skip_if).toContain("reused_approved_template");
      expect(g.skip_if).toContain("new_claim_ids");
    });

    it("needs the plan approved (G1) and a go-live (G4) before flows go live", () => {
      const wf = wfById("messaging.client_onboarding");
      expect(index(wf, "gate_plan")).toBeLessThan(index(wf, "build_templates"));
      expect(byId(wf, "activate").needs).toEqual(["gate_go_live"]);
    });

    it("never sends campaign assets before the market launches (engine checklist 9)", () => {
      const wf = wfById("messaging.campaign_assets");
      expect(byId(wf, "wait_launch").wait).toEqual(expect.objectContaining({ event: "svc.campaigns/market.launched" }));
      expect(index(wf, "wait_launch")).toBeLessThan(index(wf, "broadcast"));
    });
  });
});
