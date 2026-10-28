import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../src/prompt.js";
import { marketRules } from "../src/market-rules.js";
import { validateOutput } from "../src/registry.js";

const concept = (name: string) => ({
  name,
  idea: "Show the 5-ingredient routine in 30 seconds",
  key_message: "Skincare with 5 ingredients",
  claim_ids: ["clm-5-ingredients"],
  markets: ["GB", "CA-QC"],
  budget: { total_budget: 50000, channels: { paid_social: 20000, search: 12500, influencer: 10000 }, test_reserve: 7500, holdout_share: 0.1 },
  forecast: { kpi: "cpa", low: 18, mid: 24, high: 32, method: "client past CPA by channel" },
  changes_from_default: ["Video moved to influencer: past video CPA was 2x target"],
});
const concepts = { concepts: [concept("Proof"), concept("Story"), concept("Creators")], recommended: 0, reason: "Best past CPA.", missing: [] };

describe("output schemas", () => {
  it("accepts 3 concepts and rejects 2", () => {
    expect(validateOutput("campaigns/concepts@1", concepts).valid).toBe(true);
    expect(validateOutput("campaigns/concepts@1", { ...concepts, concepts: concepts.concepts.slice(0, 2) }).valid).toBe(false);
  });

  it("rejects a budget for a service that is not a channel service", () => {
    const bad = concept("Bad");
    bad.budget.channels = { ...bad.budget.channels, billboards: 100 } as typeof bad.budget.channels;
    expect(validateOutput("campaigns/concepts@1", { ...concepts, concepts: [bad, bad, bad] }).valid).toBe(false);
  });

  it("accepts an optimizer plan and rejects an unknown move type", () => {
    const plan = { moves: [{ from: "search", to: "paid_social", amount: 200, type: "auto", reason: "CPA 30% under target" }], pauses: [{ ad_set: "meta-uk-ugc-3", reason: "cpa_drift" }], fatigue: [], summary: "Moved 200 to Meta." };
    expect(validateOutput("campaigns/optimizer@1", plan).valid).toBe(true);
    expect(validateOutput("campaigns/optimizer@1", { ...plan, moves: [{ ...plan.moves[0], type: "raise_total" }] }).valid).toBe(false);
  });

  it("needs a dated UTM campaign in every brief link", () => {
    const brief = {
      master_brief: { objective: "sales" },
      channel_briefs: [{ service: "search", channel: "paid_ad", markets: ["GB"], budget: 12500, deliverables: ["RSA set"], due_date: "2027-02-01" }],
      utm_links: [{ service: "search", market: "GB", url: "https://ex.com/?utm_source=google&utm_campaign=2027-spring-launch" }],
    };
    expect(validateOutput("campaigns/master_brief@1", brief).valid).toBe(true);
    expect(validateOutput("campaigns/master_brief@1", { ...brief, utm_links: [{ ...brief.utm_links[0], url: "https://ex.com/?utm_campaign=spring" }] }).valid).toBe(false);
  });

  it("needs 3 to 5 lessons in the final report", () => {
    const lesson = { rule: "Lead UK with search", evidence: "CPA 40% under target", market: "GB" };
    const report = { report_markdown: "# Report", lessons: [lesson, lesson, lesson], decisions_needed: [] };
    expect(validateOutput("campaigns/report@1", report).valid).toBe(true);
    expect(validateOutput("campaigns/report@1", { ...report, lessons: [lesson] }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("campaigns/nope@1", {})).toThrow();
  });
});

describe("system prompt", () => {
  it("puts the client, brain and market rules before the agent task", () => {
    const { model, system } = buildSystemPrompt("campaigns/strategy@1", { client_id: "c1", organization: { name: "Northwind" } }, marketRules("AE"));
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("for the client Northwind");
    expect(system).toContain('"currency":"AED"');
    expect(system.indexOf("<brain>")).toBeLessThan(system.indexOf("Goal:"));
  });
});
