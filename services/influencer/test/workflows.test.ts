import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { engineDir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

const engineSchema = JSON.parse(readFileSync(engineDir("contracts", "schemas", "workflow-definition.json"), "utf8"));
const enums = JSON.parse(readFileSync(engineDir("contracts", "enums.json"), "utf8"));
const workflows = loadWorkflows();

/** Engine actions this service needs that enums.json does not list yet. The API has the endpoints (POST /parties, POST /clients/{id}/rights). */
const PENDING_ENGINE_ACTIONS = ["parties.upsert", "rights.create"];
const NEVER_SKIP = ["budget", "contract", "payout", "claim", "escalation"];

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;
const before = (wf: Workflow, i: number, test: (s: WorkflowStep) => boolean) => wf.steps.slice(0, i).some(test);

describe("influencer workflows", () => {
  it("has the 5 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "influencer.deliver", "influencer.payout", "influencer.plan", "influencer.recruit", "influencer.weekly",
    ]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code influencer", () => {
        expect(wf.service).toBe("influencer");
        expect(enums.services).toHaveProperty("influencer");
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
          expect(Object.keys(enums.tool_registry)).toContain(s.tool!.name);
          expect(Object.keys(enums.tool_risk_meaning)).toContain(s.tool!.risk);
          if (s.tool!.name === "engine") {
            expect([...Object.keys(enums.engine_actions), ...PENDING_ENGINE_ACTIONS], `${wf.id}.${s.id}`).toContain(s.tool!.action);
          }
        }
      });

      it("never skips a gate the engine forbids skipping", () => {
        for (const s of wf.steps.filter((s) => s.gate?.skip_if)) {
          expect(NEVER_SKIP).not.toContain(s.gate!.approval_kind);
          expect(["copy", "creative", "content", "template"]).toContain(s.gate!.approval_kind);
        }
      });

      it("gets recipients from the engine before any send (engine G5)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "send") continue;
          expect(before(wf, i, (t) => t.tool?.name === "engine" && t.tool.action === "audiences.resolve"), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("runs a compliance check before every send or publish (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "send" && s.tool?.risk !== "write_external") continue;
          expect(before(wf, i, (t) => t.check?.kinds?.includes("compliance") ?? false), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("signs only after a contract gate and pays only after a payout gate (engine G2)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk === "sign") expect(before(wf, i, (t) => t.gate?.approval_kind === "contract")).toBe(true);
          if (s.tool?.risk === "pay") expect(before(wf, i, (t) => t.gate?.approval_kind === "payout")).toBe(true);
          expect(s.tool?.risk).not.toBe("spend");
        }
      });
    });
  }

  describe("guardrails in detail", () => {
    it("checks the creator licence and the deal before the contract gate", () => {
      const wf = wfById("influencer.recruit");
      expect(byId(wf, "licence").tool).toEqual({ name: "engine", action: "compliance.check", risk: "read" });
      expect(index(wf, "licence")).toBeLessThan(index(wf, "approve_contract"));
      expect(index(wf, "check_deal")).toBeLessThan(index(wf, "approve_contract"));
    });

    it("stops contact on a no with risk remove, so it is never blocked (engine G10)", () => {
      const wf = wfById("influencer.recruit");
      const route = byId(wf, "route_reply").branch!;
      expect(route.cases![0]).toEqual({ if: expect.stringContaining("declined"), goto: "stop" });
      expect(byId(wf, "stop").tool?.risk).toBe("remove");
    });

    it("needs both the influencer lead and the client on the plan, shortlist, contract and content gates", () => {
      for (const [w, g] of [["influencer.plan", "approve_plan"], ["influencer.plan", "approve_shortlist"], ["influencer.recruit", "approve_contract"], ["influencer.deliver", "approve_content"]]) {
        const gate = byId(wfById(w), g).gate!;
        expect(gate.required_roles).toEqual(["influencer_lead", "client_approver"]);
        expect(gate.required_count).toBe(2);
      }
    });

    it("needs client finance on every payout and holds a payout with blockers", () => {
      const wf = wfById("influencer.payout");
      expect(byId(wf, "approve_payout").gate?.required_roles).toContain("client_finance");
      expect(byId(wf, "ready").branch?.else).toBe("hold");
      expect(index(wf, "approve_payout")).toBeLessThan(index(wf, "pay"));
    });

    it("creates the creator code after the brief passes checks, and ships through a person", () => {
      const wf = wfById("influencer.deliver");
      expect(index(wf, "check_brief")).toBeLessThan(index(wf, "make_code"));
      expect(byId(wf, "make_code").tool?.risk).toBe("write_external");
      expect(byId(wf, "ship").type).toBe("task");
    });

    it("pays only after the live post is verified", () => {
      const deliver = wfById("influencer.deliver");
      expect(byId(deliver, "delivered").needs).toEqual(["record_post"]);
      expect(byId(deliver, "live_ok").branch?.else).toBe("fix_request");
      expect(wfById("influencer.payout").trigger).toEqual({ event: "svc.influencer/deal.delivered" });
    });

    it("hands approved posts to paid social with the platform and the budget approval, after a budget gate", () => {
      const wf = wfById("influencer.weekly");
      const amplify = byId(wf, "amplify") as WorkflowStep & { subflow: { workflow_id: string; input: Record<string, string> } };
      expect(amplify.needs).toEqual(["approve_amplify"]);
      expect(byId(wf, "approve_amplify").gate?.approval_kind).toBe("budget");
      expect(amplify.subflow.workflow_id).toBe("paid_social.creator_amplify");
      expect(Object.keys(amplify.subflow.input).sort()).toEqual(
        ["artifact_id", "budget", "budget_approval_id", "client_id", "currency", "markets", "party_id", "platform", "post_url", "rights_grant_ids"],
      );
    });
  });
});
