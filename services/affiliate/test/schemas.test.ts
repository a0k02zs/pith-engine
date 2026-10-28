import { describe, expect, it } from "vitest";
import { buildSystemPrompt, loadPrompt, marketRules, validateOutput } from "../src/index.js";

describe("output schemas", () => {
  it("accepts a fraud explanation and rejects an unknown decision", () => {
    const out = {
      results: [{ conversion_id: "c1", partner_id: "p1", decision: "hold", rules: ["fast_conversion"], evidence: "converted 4 seconds after the click", amount: 8, currency: "GBP", amount_gbp: 8, needs_person: true }],
      partner_flags: [],
    };
    expect(validateOutput("affiliate/fraud_results@1", out).valid).toBe(true);
    expect(validateOutput("affiliate/fraud_results@1", { ...out, results: [{ ...out.results[0], decision: "ban" }] }).valid).toBe(false);
  });

  it("needs a statement for each payout line and 3-letter currencies", () => {
    const line = { party_id: "p1", currency: "GBP", conversions: 1, gross: 40, reversals: 0, net: 40, statement_text: "You earned £40.00." };
    const out = { period: "2026-10", lines: [line], blocked: [], totals_by_currency: { GBP: 40 }, within_cap: true, summary: "1 partner, £40.00." };
    expect(validateOutput("affiliate/payout_file@1", out).valid).toBe(true);
    expect(validateOutput("affiliate/payout_file@1", { ...out, lines: [{ ...line, statement_text: undefined }] }).valid).toBe(false);
    expect(validateOutput("affiliate/payout_file@1", { ...out, totals_by_currency: { pounds: 40 } }).valid).toBe(false);
  });

  it("accepts a programme proposal that marks where each number came from", () => {
    const out = {
      status: "ok",
      programmes: [{ type: "affiliate", commission: { model: "cpa_percent", value: 0.08, currency: "GBP", recurring_months: null } }],
      assumptions: [{ item: "reversal rate 10%", source: "assumption" }],
    };
    expect(validateOutput("affiliate/programme_proposal@1", out).valid).toBe(true);
    expect(validateOutput("affiliate/programme_proposal@1", { ...out, status: "done" }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("affiliate/nope@1", {})).toThrow(/Unknown output schema/);
  });
});

describe("prompts", () => {
  it("builds a system prompt with the brain, market and rules filled in", () => {
    const { model, system } = buildSystemPrompt("affiliate/recruiter@1", { client_id: "c1", organization: { name: "Northwind" } }, "GB", marketRules("GB"));
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("affiliate and partner programme for Northwind");
    expect(system).toContain("Market: GB.");
    expect(system).toContain('"currency":"GBP"');
    expect(system).not.toMatch(/\{(brain|market|market_rules)\}/);
  });

  it("uses Haiku for checks and keeps the fraud agent from changing decisions", () => {
    const p = loadPrompt("affiliate/fraud_monitor@1");
    expect(p.model).toBe("claude-haiku-5-5");
    expect(p.task).toContain("You never change a decision");
  });

  it("rejects a bad prompt ref", () => {
    expect(() => loadPrompt("email/write@1")).toThrow(/Unknown prompt ref/);
  });
});
