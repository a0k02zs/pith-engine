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
const before = (wf: Workflow, i: number, test: (s: WorkflowStep) => boolean) => wf.steps.slice(0, i).some(test);

describe("events workflows", () => {
  it("has the 3 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual(["events.campaign_assets", "events.trade_show", "events.webinar"]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema v0.1.0", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code events", () => expect(wf.service).toBe("events"));

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

      it("uses only shared approval kinds, roles and tool names", () => {
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
        }
        for (const s of wf.steps.filter((s) => s.tool?.name === "engine")) {
          const meaning: string = enums.engine_actions[s.tool!.action!];
          expect(meaning, s.tool!.action).toBeTypeOf("string");
          expect(meaning.split(":")[0]).toBe(s.tool!.risk);
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
          expect(before(wf, i, (t) => t.tool?.name === "engine" && t.tool.action === "audiences.resolve"), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("runs a compliance check before every send or publish (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "send" && s.tool?.risk !== "write_external") continue;
          expect(before(wf, i, (t) => t.check?.kinds?.includes("compliance") === true), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("signs only after a contract gate and spends only after a budget gate (engine G1, G2)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk === "sign") expect(before(wf, i, (t) => t.gate?.approval_kind === "contract")).toBe(true);
          if (s.tool?.risk === "spend") expect(before(wf, i, (t) => t.gate?.approval_kind === "budget")).toBe(true);
          if (s.tool?.risk === "pay") expect(before(wf, i, (t) => t.gate?.approval_kind === "payout")).toBe(true);
        }
      });
    });
  }

  describe("events rules in detail", () => {
    it("approves the follow-up templates at go-live, before the event", () => {
      const wf = wfById("events.webinar");
      expect(index(wf, "approve_go_live")).toBeLessThan(index(wf, "live_start"));
      expect(byId(wf, "approve_go_live").gate?.required_count).toBe(2);
    });

    it("lets the follow-up skip its gate only for an approved template, merge fields only and no new claims", () => {
      for (const id of ["events.webinar", "events.trade_show"]) {
        const g = byId(wfById(id), "approve_follow_up").gate!;
        expect(g.approval_kind).toBe("template");
        expect(g.skip_if).toContain("template_approved");
        expect(g.skip_if).toContain("only_merge_fields_changed");
        expect(g.skip_if).toContain("size(steps.fill_follow_up.output.new_claim_requests) == 0");
      }
    });

    it("sends hot leads to client sales through a shortlist gate: 4 hours for a webinar, 8 for a trade show", () => {
      const web = byId(wfById("events.webinar"), "hand_off").gate!;
      const show = byId(wfById("events.trade_show"), "hand_off").gate!;
      expect([web.approval_kind, web.required_roles, web.sla_hours]).toEqual(["shortlist", ["client_sales"], 4]);
      expect([show.approval_kind, show.sla_hours]).toEqual(["shortlist", 8]);
    });

    it("needs the account lead and client finance on a budget, and goes to the budget gate when there is paid spend", () => {
      const wf = wfById("events.webinar");
      expect(byId(wf, "approve_budget").gate?.required_roles).toEqual(["account_lead", "client_finance"]);
      expect(byId(wf, "paid_items").branch?.cases?.[0]).toEqual({ if: "run.input.paid_spend > 0 || run.input.paid_speaker == true", goto: "approve_budget" });
      expect(byId(wfById("events.trade_show"), "approve_budget").gate?.required_count).toBe(2);
    });

    it("gives every report to a strategist before the client", () => {
      for (const wf of workflows) {
        for (const s of wf.steps.filter((s) => s.agent?.prompt_ref === "events/report_writer@1")) {
          const gate = wf.steps.find((g) => g.gate?.on_changes === s.id);
          expect(gate?.gate?.approval_kind, `${wf.id}.${s.id}`).toBe("report");
          expect(gate?.gate?.required_roles).toEqual(["strategist"]);
        }
      }
    });

    it("never lets the live Q&A agent post: no send or publish step needs it", () => {
      const wf = wfById("events.webinar");
      expect(byId(wf, "live_qa").agent?.model).toBe("claude-haiku-5-5");
      for (const s of wf.steps.filter((s) => s.tool?.risk === "send" || s.tool?.risk === "write_external")) {
        expect(s.needs ?? []).not.toContain("live_qa");
      }
    });

    it("publishes campaign registration pages only after the campaign launches the market", () => {
      const wf = wfById("events.campaign_assets");
      expect(index(wf, "register_artifacts")).toBeLessThan(index(wf, "market_launched"));
      expect(index(wf, "market_launched")).toBeLessThan(index(wf, "publish_registration"));
      expect(byId(wf, "market_launched").wait).toMatchObject({ event: "svc.campaigns/market.launched" });
    });

    it("writes learnings back to the engine at the end of each event workflow", () => {
      for (const id of ["events.webinar", "events.trade_show"]) {
        const wf = wfById(id);
        expect(wf.steps.at(-1)?.tool).toEqual({ name: "engine", action: "learnings.write", risk: "write_internal" });
      }
    });
  });
});
