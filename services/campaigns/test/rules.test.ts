import { describe, expect, it } from "vitest";
import { marketRules } from "../src/market-rules.js";
import {
  budgetPlanProblems, classifyMove, defaultSplit, flightPhases, isFatigued, isOffPace, launchDateProblems,
  leadCountryProblems, nextMarketReady, pauseReason, playbook, utmUrl, type BudgetPlan,
} from "../src/rules.js";

describe("playbook", () => {
  it("has splits that sum to 1 for every campaign type", () => {
    for (const [type, t] of Object.entries(playbook.campaign_types)) {
      expect(Object.values(t.split).reduce((a, v) => a + v, 0), type).toBeCloseTo(1, 6);
    }
  });

  it("turns the default split into money", () => {
    expect(defaultSplit("event_led", 40000)).toEqual({ paid_social: 30000, search: 10000 });
    expect(() => defaultSplit("bogus" as never, 1)).toThrow();
  });
});

describe("budget plan", () => {
  const plan: BudgetPlan = { total_budget: 50000, total_budget_usd: 63000, channels: { paid_social: 20000, search: 12500, influencer: 10000 }, test_reserve: 7500, holdout_share: 0.1 };

  it("accepts a plan inside every rule", () => expect(budgetPlanProblems(plan)).toEqual([]));

  it("flags over-allocation, a thin channel, a small test reserve and a missing holdout", () => {
    const bad = { ...plan, channels: { ...plan.channels, video: 5000 }, test_reserve: 4000, holdout_share: 0 };
    const problems = budgetPlanProblems(bad);
    expect(problems.some((p) => p.includes("over the budget"))).toBe(true);
    expect(problems.some((p) => p.startsWith("video has less than 15%"))).toBe(true);
    expect(problems.some((p) => p.includes("test reserve"))).toBe(true);
    expect(problems.some((p) => p.includes("holdout"))).toBe(true);
  });

  it("skips the minimum share for owned content and the holdout under 20,000 USD", () => {
    expect(budgetPlanProblems({ ...plan, total_budget_usd: 15000, holdout_share: 0, channels: { ...plan.channels, influencer: 7500, content: 2500 } })).toEqual([]);
  });

  it("flags a paid channel forecast under 50 conversions", () => {
    expect(budgetPlanProblems({ ...plan, expected_conversions: { search: 30 } })).toEqual(["search expects 30 conversions, under 50"]);
  });
});

describe("optimizer", () => {
  const daily = { search: 1000, paid_social: 2000 };

  it("auto-applies a move of 20% or less of the source channel", () => {
    expect(classifyMove({ from: "search", to: "paid_social", amount: 200 }, daily)).toBe("auto");
    expect(classifyMove({ from: "search", to: "paid_social", amount: 201 }, daily)).toBe("needs_g5");
  });

  it("needs G5 to add a channel or raise the total", () => {
    expect(classifyMove({ from: "search", to: "video", amount: 50 }, daily)).toBe("needs_g5");
    expect(classifyMove({ from: "search", to: "paid_social", amount: 50 }, daily, 10)).toBe("needs_g5");
  });

  const day = (cpa: number, spend = 100, planned = 100, conversions = 5) => ({ spend, planned_spend: planned, conversions, cpa });

  it("pauses at once on a spend spike, even on day 1", () => {
    expect(pauseReason([day(10, 201)], 20)).toBe("spend_spike");
  });

  it("pauses on CPA 50% over target for 3 days, not 2", () => {
    expect(pauseReason([day(31), day(31)], 20)).toBeNull();
    expect(pauseReason([day(31), day(31), day(31)], 20)).toBe("cpa_drift");
    expect(pauseReason([day(31), day(29), day(31)], 20)).toBeNull();
  });

  it("flags creative fatigue only with a 30% click drop and frequency above 4", () => {
    expect(isFatigued(0.02, 0.014, 4.5)).toBe(true);
    expect(isFatigued(0.02, 0.014, 4)).toBe(false);
    expect(isFatigued(0.02, 0.015, 6)).toBe(false);
  });

  it("flags off-pace spend from mid-flight", () => {
    expect(isOffPace(7000, 10000, 0.5)).toBe(true);
    expect(isOffPace(7000, 10000, 0.4)).toBe(false);
    expect(isOffPace(8000, 10000, 0.6)).toBe(false);
  });

  it("splits a flight into tease, launch and sustain", () => {
    expect(flightPhases(30)).toEqual({ tease: 6, launch: 12, sustain: 12 });
  });
});

describe("markets and rollout", () => {
  it("resolves market rules for countries and subdivisions", () => {
    expect(marketRules("AE")).toMatchObject({ group: "GCC", currency: "AED", weekend: ["sat", "sun"] });
    expect(marketRules("SA").weekend).toEqual(["fri", "sat"]);
    expect(marketRules("CA-QC")).toMatchObject({ group: "NA", currency: "CAD", language: "fr-CA" });
    expect(marketRules("NL").currency).toBe("EUR");
    expect(() => marketRules("JP")).toThrow();
  });

  it("opens the next market after 7 clean days, in launch order", () => {
    expect(nextMarketReady("GB", "SG", 6).ok).toBe(false);
    expect(nextMarketReady("GB", "SG", 7).ok).toBe(true);
    expect(nextMarketReady("US", "GB", 10).ok).toBe(false);
  });

  it("leads GCC with AE or SA and EU with at most 2 countries", () => {
    expect(leadCountryProblems(["AE", "SA", "DE", "FR"])).toEqual([]);
    expect(leadCountryProblems(["QA"])).toHaveLength(1);
    expect(leadCountryProblems(["DE", "FR", "NL"])).toHaveLength(1);
  });

  it("blocks B2B launches on the market's weekend", () => {
    // 2027-03-05 and 2027-01-08 are Fridays: a working day in the UK, a weekend day in Saudi Arabia.
    const ramadan = { start: "2027-02-08", end: "2027-03-09" };
    expect(launchDateProblems({ market: "GB", audience: "b2b", date: "2027-03-05" })).toEqual([]);
    expect(launchDateProblems({ market: "SA", audience: "b2b", date: "2027-01-08", ramadan })).toHaveLength(1);
    expect(launchDateProblems({ market: "GB", audience: "b2b", date: "2027-03-06" })).toHaveLength(1);
    expect(launchDateProblems({ market: "GB", audience: "b2c", date: "2027-03-06" })).toEqual([]);
  });

  it("blocks GCC launches in the last 10 days of Ramadan, except Eid campaigns", () => {
    const ramadan = { start: "2027-02-08", end: "2027-03-09" };
    expect(launchDateProblems({ market: "AE", audience: "b2c", date: "2027-02-27", ramadan })).toEqual([]);
    expect(launchDateProblems({ market: "AE", audience: "b2c", date: "2027-02-28", ramadan })).toHaveLength(1);
    expect(launchDateProblems({ market: "AE", audience: "b2c", date: "2027-03-09", ramadan })).toHaveLength(1);
    expect(launchDateProblems({ market: "AE", audience: "b2c", date: "2027-03-01", ramadan, eid_campaign: true })).toEqual([]);
    expect(launchDateProblems({ market: "AE", audience: "b2c", date: "2027-03-01" })).toHaveLength(1);
  });
});

describe("UTM links", () => {
  it("builds the shared Pith UTM standard", () => {
    const url = new URL(utmUrl("https://ex.com/spring?ref=1", { platform: "Meta", channel: "paid_ad", year: 2027, slug: "spring-launch", artifact_id: "a1b2c3d4-e5f6", variant: "b", market: "GB" }));
    expect(Object.fromEntries(url.searchParams)).toEqual({ ref: "1", utm_source: "meta", utm_medium: "paid_ad", utm_campaign: "2027-spring-launch", utm_content: "a1b2c3d4-b", pith_mkt: "GB" });
  });

  it("rejects a slug with spaces or capitals", () => {
    expect(() => utmUrl("https://ex.com", { platform: "google", channel: "paid_ad", year: 2027, slug: "Spring Launch", artifact_id: "x", variant: "a", market: "GB" })).toThrow();
  });
});
