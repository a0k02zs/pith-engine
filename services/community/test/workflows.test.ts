import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import { dir } from "../src/paths.js";
import { loadWorkflows, unresolvedRefs, type Workflow, type WorkflowStep } from "../src/registry.js";

// The engine contracts live in the same repo, so tests read them directly.
const engine = (...p: string[]) => JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", ...p), "utf8"));
const engineSchema = engine("schemas", "workflow-definition.json");
const enums = engine("enums.json");
const workflows = loadWorkflows();

const byId = (wf: Workflow, id: string) => wf.steps.find((s) => s.id === id) as WorkflowStep;
const index = (wf: Workflow, id: string) => wf.steps.findIndex((s) => s.id === id);
const wfById = (id: string) => workflows.find((w) => w.id === id)!;

describe("community workflows", () => {
  it("has the 10 workflows", () => {
    expect(workflows.map((w) => w.id)).toEqual([
      "community.campaign_assets", "community.host", "community.moderate", "community.onboard", "community.review_reply",
      "community.review_request", "community.rights_expiry", "community.ugc_reuse", "community.ugc_rights", "community.weekly_report",
    ]);
  });

  for (const wf of workflows) {
    describe(wf.id, () => {
      it("validates against the engine workflow-definition schema", () => {
        const validate = new Ajv2020({ strict: false }).compile(engineSchema);
        expect(validate(wf), JSON.stringify(validate.errors)).toBe(true);
      });

      it("uses the service code community", () => {
        expect(wf.service).toBe("community");
        expect(enums.services.community).toBe(18);
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

      it("uses only shared approval kinds, roles and tool names", () => {
        for (const s of wf.steps.filter((s) => s.gate)) {
          expect(enums.approval_kinds).toContain(s.gate!.approval_kind);
          for (const r of s.gate!.required_roles ?? []) expect(enums.roles).toContain(r);
        }
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
          expect(wf.steps.slice(0, i).some((t) => t.tool?.name === "engine" && t.tool.action === "audiences.resolve"), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("runs a compliance check before every send or publish (engine G6)", () => {
        for (const [i, s] of wf.steps.entries()) {
          if (s.tool?.risk !== "send" && s.tool?.risk !== "write_external") continue;
          expect(wf.steps.slice(0, i).some((t) => t.check?.kinds?.includes("compliance")), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("has a contract gate before any signature and a payout gate before any payment (engine G2)", () => {
        for (const [i, s] of wf.steps.entries()) {
          const before = wf.steps.slice(0, i);
          if (s.tool?.risk === "sign") expect(before.some((t) => t.gate?.approval_kind === "contract"), `${wf.id}.${s.id}`).toBe(true);
          if (s.tool?.risk === "pay") expect(before.some((t) => t.gate?.approval_kind === "payout"), `${wf.id}.${s.id}`).toBe(true);
        }
      });

      it("never spends", () => {
        expect(wf.steps.some((s) => s.tool?.risk === "spend")).toBe(false);
      });
    });
  }

  describe("guardrails in detail", () => {
    it("escalates negative, red and suspected-violation reviews before anything is posted (engine G4)", () => {
      const wf = wfById("community.review_reply");
      const route = byId(wf, "route").branch!;
      expect(route.cases![0].goto).toBe("escalate");
      for (const word of ["negative", "red", "suspected_policy_violation"]) expect(route.cases![0].if).toContain(word);
      expect(byId(wf, "escalate").emit).toEqual({ event: "engine/escalation.raised" });
      expect(byId(wf, "handle_escalation").gate?.approval_kind).toBe("escalation");
      expect(byId(wf, "handle_escalation").gate?.skip_if).toBeUndefined();
    });

    it("posts a review reply on its own only after the trial and a brand score of 85", () => {
      const route = byId(wfById("community.review_reply"), "route").branch!;
      const auto = route.cases!.find((c) => c.goto === "post")!;
      expect(auto.if).toContain("auto_reply_trial_passed");
      expect(auto.if).toContain(">= 85");
      expect(route.else).toBe("approve_reply");
    });

    it("lets only an approved template with no new claims skip the review request copy gate", () => {
      const g = byId(wfById("community.review_request"), "approve_copy").gate!;
      expect(g.approval_kind).toBe("copy");
      expect(g.skip_if).toContain("template_approved");
      expect(g.skip_if).toContain("new_claim_ids");
    });

    it("checks consent again before the 1 reminder", () => {
      const wf = wfById("community.review_request");
      expect(index(wf, "resolve_again")).toBeLessThan(index(wf, "send_reminder"));
      expect(byId(wf, "send_reminder").needs).toEqual(["resolve_again"]);
      expect(wf.concurrency).toEqual({ key: "event.data.contact_id", limit: 1 });
    });

    it("needs 2 people for a paid rights deal and client finance for a payout", () => {
      const wf = wfById("community.ugc_rights");
      const deal = byId(wf, "approve_deal").gate!;
      expect(deal.approval_kind).toBe("contract");
      expect(deal.required_count).toBe(2);
      expect(deal.required_roles).toContain("client_legal");
      expect(byId(wf, "approve_payout").gate?.required_roles).toEqual(["client_finance"]);
      expect(index(wf, "approve_deal")).toBeLessThan(index(wf, "send_request"));
    });

    it("refuses reuse when any person is not cleared, and gates ad use", () => {
      const wf = wfById("community.ugc_reuse");
      expect(byId(wf, "cleared").branch!.cases![0].goto).toBe("refuse");
      const g = byId(wf, "approve_use").gate!;
      expect(g.approval_kind).toBe("creative");
      expect(g.skip_if).toContain("paid_ad");
      expect(g.skip_if).toContain("green");
    });

    it("takes content down with risk remove, so a takedown is never blocked (engine G10)", () => {
      const exp = wfById("community.rights_expiry");
      for (const id of ["unpublish_social", "unpublish_site", "retire"]) expect(byId(exp, id).tool?.risk).toBe("remove");
      expect(byId(wfById("community.moderate"), "hide").tool?.risk).toBe("remove");
      expect(byId(exp, "changed").emit).toEqual({ event: "engine/rights.changed" });
    });

    it("hides red community posts before escalating them", () => {
      const wf = wfById("community.moderate");
      expect(index(wf, "hide")).toBeLessThan(index(wf, "escalate"));
      expect(byId(wf, "handle_escalation").gate?.sla_hours).toBe(1);
    });

    it("releases campaign assets only after the market launches", () => {
      const wf = wfById("community.campaign_assets");
      expect(byId(wf, "wait_launch").wait?.event).toBe("svc.campaigns/market.launched");
      expect(byId(wf, "release").needs).toEqual(["wait_launch"]);
    });

    it("reviews the report before the client sees it", () => {
      const wf = wfById("community.weekly_report");
      expect(index(wf, "approve_report")).toBeLessThan(index(wf, "deliver"));
    });
  });
});
