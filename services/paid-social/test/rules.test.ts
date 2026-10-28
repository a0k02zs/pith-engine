import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { dir } from "../src/paths.js";
import { breakEvenRoas, dailyCap, pacing, targetCostPerSql, targetCpa, targetRoas } from "../src/targets.js";
import { classifyMoves, fatigueSignals, killRule, shouldAutoPause, silentTracking, spendSpike } from "../src/guardrails.js";
import { lgamma, probBBeatsA, testVerdict } from "../src/stats.js";
import { adName, adSetName, campaignName, isCampaignName, slug } from "../src/naming.js";
import { dailyKpis, isValidKpiCode, kpiEvent } from "../src/metrics.js";
import { adsToPause, creatorAdType, grantUsable, latestEndDate } from "../src/rights.js";
import { globalRules, isWeekend, marketRules, markets, platformsFor } from "../src/market-rules.js";

const engine = (...p: string[]) => JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", ...p), "utf8"));
const enums = engine("enums.json");
const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020;

describe("targets", () => {
  it("derives CPA and ROAS targets from margin", () => {
    expect(targetCpa(60, 0.5)).toBeCloseTo(20);
    expect(breakEvenRoas(0.4)).toBeCloseTo(2.5);
    expect(targetRoas(0.4)).toBeCloseTo(3.25);
    expect(targetCostPerSql(20000, 0.25)).toBeCloseTo(1000);
    expect(() => targetCpa(60, 0)).toThrow();
  });

  it("caps daily spend at 1.3 × the even daily budget and marks pacing", () => {
    expect(dailyCap(30000, 30)).toBeCloseTo(1300);
    expect(pacing(10000, 30000, 10, 30).status).toBe("on");
    expect(pacing(9000, 30000, 10, 30).status).toBe("under");
    expect(pacing(10600, 30000, 10, 30).status).toBe("over");
  });
});

describe("guardrails", () => {
  it("auto-runs a shift of 20% or less that keeps the total, and sends bigger moves or a higher total to a person", () => {
    const shift = classifyMoves([
      { campaign_id: "a", current_daily: 100, proposed_daily: 120 },
      { campaign_id: "b", current_daily: 100, proposed_daily: 80 },
    ]);
    expect(shift.every((d) => d.auto)).toBe(true);
    expect(classifyMoves([{ campaign_id: "a", current_daily: 100, proposed_daily: 121 }, { campaign_id: "b", current_daily: 100, proposed_daily: 79 }])[0].auto).toBe(false);
    const raise = classifyMoves([{ campaign_id: "a", current_daily: 100, proposed_daily: 110 }]);
    expect(raise[0]).toMatchObject({ auto: false, reason: "the moves raise the total daily budget" });
    expect(classifyMoves([{ campaign_id: "a", current_daily: 0, proposed_daily: 10 }])[0].auto).toBe(false);
    expect(classifyMoves([{ campaign_id: "a", current_daily: 100, proposed_daily: 10 }])[0].auto).toBe(true);
  });

  it("auto-pauses after 3 days at 1.5 × target CPA with enough spend", () => {
    const day = (spend: number, conversions: number) => ({ date: "2026-11-01", spend, conversions });
    expect(shouldAutoPause([day(40, 1), day(40, 1), day(40, 1)], 25)).toBe(true);
    expect(shouldAutoPause([day(40, 1), day(30, 1), day(40, 1)], 25)).toBe(false);
    expect(shouldAutoPause([day(15, 0), day(15, 0), day(15, 0)], 25)).toBe(false);
    expect(shouldAutoPause([day(40, 1), day(40, 1)], 25)).toBe(false);
    expect(shouldAutoPause([day(20, 0), day(20, 0), day(20, 0)], 25)).toBe(true);
  });

  it("applies the kill, spike and silent tracking rules", () => {
    expect(killRule(75, 0, 25)).toBe(true);
    expect(killRule(74, 0, 25)).toBe(false);
    expect(killRule(200, 1, 25)).toBe(false);
    expect(spendSpike(130, 100)).toBe(true);
    expect(spendSpike(129, 100)).toBe(false);
    expect(silentTracking(0, 5)).toBe(true);
    expect(silentTracking(0, 4.9)).toBe(false);
    expect(silentTracking(1, 50)).toBe(false);
  });

  it("flags fatigue on 2 of 3 signals with the stage frequency limit", () => {
    expect(fatigueSignals({ ctr_change_pct: -30, cpa_change_pct: 25, frequency: 1, stage: "prospect" })).toEqual({ fatigued: true, signals: ["ctr_drop", "cpa_rise"] });
    expect(fatigueSignals({ ctr_change_pct: -10, cpa_change_pct: 0, frequency: 3.1, stage: "prospect" }).fatigued).toBe(false);
    expect(fatigueSignals({ ctr_change_pct: -31, cpa_change_pct: 0, frequency: 5, stage: "retarget" }).fatigued).toBe(false);
    expect(fatigueSignals({ ctr_change_pct: -31, cpa_change_pct: 0, frequency: 6.1, stage: "retarget" }).fatigued).toBe(true);
  });
});

describe("test statistics", () => {
  it("computes ln Γ", () => {
    expect(lgamma(1)).toBeCloseTo(0, 10);
    expect(lgamma(5)).toBeCloseTo(Math.log(24), 10);
    expect(lgamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 10);
  });

  it("gives P(B > A) = 0.5 for equal arms and matches a known exact value", () => {
    const arm = { trials: 1000, conversions: 20, spend: 500 };
    expect(probBBeatsA(arm, arm)).toBeCloseTo(0.5, 6);
    // Beta(2,1) vs Beta(1,2): P(A > B) = 5/6 exactly, so P(B > A) = 1/6.
    expect(probBBeatsA({ trials: 1, conversions: 1, spend: 0 }, { trials: 1, conversions: 0, spend: 0 })).toBeCloseTo(1 / 6, 10);
    const better = probBBeatsA({ trials: 10000, conversions: 100, spend: 0 }, { trials: 10000, conversions: 140, spend: 0 });
    expect(better).toBeGreaterThan(0.99);
    expect(() => probBBeatsA({ trials: 5, conversions: 6, spend: 0 }, arm)).toThrow();
  });

  it("decides win, lose or no result from the minimum data rules", () => {
    const control = { trials: 20000, conversions: 100, spend: 2500 };
    const win = testVerdict({ control, variant: { trials: 20000, conversions: 150, spend: 2500 }, target_cpa: 25, days_running: 7 });
    expect(win.verdict).toBe("win");
    const early = testVerdict({ control, variant: { trials: 20000, conversions: 150, spend: 2500 }, target_cpa: 25, days_running: 6 });
    expect(early.verdict).toBe("no_result");
    const kill = testVerdict({ control, variant: { trials: 3000, conversions: 0, spend: 75 }, target_cpa: 25, days_running: 2 });
    expect(kill).toMatchObject({ verdict: "lose", reason: "kill rule" });
    const lose = testVerdict({ control, variant: { trials: 20000, conversions: 60, spend: 2500 }, target_cpa: 25, days_running: 10 });
    expect(lose.verdict).toBe("lose");
    const flat = testVerdict({ control, variant: { trials: 20000, conversions: 102, spend: 2500 }, target_cpa: 25, days_running: 10 });
    expect(flat.verdict).toBe("no_result");
  });
});

describe("naming", () => {
  it("builds names that follow the convention", () => {
    const name = campaignName({ client: "Acme Ltd", market: "GB", platform: "meta", stage: "prospect", objective: "Sales", month: "202611" });
    expect(name).toBe("acme-ltd_gb_meta_prospect_sales_202611");
    expect(isCampaignName(name)).toBe(true);
    expect(adSetName("LAL 1%", "Feed", "Purchase")).toBe("lal-1_feed_purchase_ao");
    expect(adName("T012", "V03", "vid915", "Price Proof", "Question", "en")).toBe("t012-v03_vid915_price-proof_question_en");
    expect(slug("Café Crème")).toBe("cafe-creme");
    expect(() => campaignName({ client: "a", market: "GB", platform: "meta", stage: "prospect", objective: "sales", month: "202613" })).toThrow();
    expect(() => adSetName("", "feed", "purchase")).toThrow();
  });
});

describe("KPI events", () => {
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);
  const validate = ajv.compile(engine("schemas", "metric-event.json"));
  const base = { client_id: "6f1c1b7e-8a4e-4c1e-9a52-1d1f6f0e9a10", date: "2026-11-02", platform: "meta" as const, market: "GB", currency: "GBP", occurred_at: "2026-11-02T07:00:00Z" };

  it("builds events that match the engine metric-event schema and use registered KPI codes", () => {
    const events = dailyKpis(base, { spend: 500, impressions: 100000, reach: 40000, clicks: 1500, conversions: 20, revenue: 2000 });
    expect(events).toHaveLength(11);
    for (const e of events) {
      expect(validate(e), JSON.stringify(validate.errors)).toBe(true);
      expect(isValidKpiCode(e.kpi as string, Object.keys(enums.kpis))).toBe(true);
    }
  });

  it("leaves out ratios with a zero base", () => {
    const events = dailyKpis(base, { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0, revenue: 0 });
    expect(events.map((e) => e.kpi)).toEqual(["spend", "impressions", "reach", "clicks", "conversions", "revenue"]);
    expect(() => kpiEvent({ ...base, kpi: "cpa", value: Infinity })).toThrow();
  });

  it("accepts service-only codes with the paid_social prefix only", () => {
    expect(isValidKpiCode("paid_social.creative_count", [])).toBe(true);
    expect(isValidKpiCode("creative_count", [])).toBe(false);
  });
});

describe("rights grants", () => {
  const on = new Date("2026-11-01T00:00:00Z");
  const paid = { id: "g1", scope: ["paid_usage"], markets: ["GB"], expires_at: "2026-12-10T00:00:00Z" };

  it("picks the ad type the grants allow", () => {
    expect(creatorAdType("tiktok", [paid], "GB", on)).toBe("spark");
    expect(creatorAdType("meta", [paid], "GB", on)).toBe("partnership");
    expect(creatorAdType("snapchat", [paid], "GB", on)).toBeNull();
    expect(creatorAdType("snapchat", [{ id: "g2", scope: ["whitelisting"] }], "US", on)).toBe("whitelisted");
    expect(creatorAdType("tiktok", [paid], "AE", on)).toBeNull();
    expect(creatorAdType("tiktok", [{ ...paid, revoked_at: "2026-10-01T00:00:00Z" }], "GB", on)).toBeNull();
    expect(grantUsable({ ...paid, expires_at: "2026-11-01T00:00:00Z" }, "GB", on)).toBe(false);
    expect(grantUsable({ ...paid, markets: ["CA"] }, "CA-QC", on)).toBe(true);
  });

  it("ends a creator ad 2 days before the earliest expiry", () => {
    expect(latestEndDate([paid, { id: "g2", scope: ["whitelisting"], expires_at: "2026-11-30T12:00:00Z" }])).toBe("2026-11-28");
    expect(latestEndDate([{ id: "g3", scope: ["paid_usage"], expires_at: null }])).toBeNull();
  });

  it("finds the live ads to pause for a grant", () => {
    const ads = [
      { ad_id: "a1", platform: "tiktok", rights_grant_ids: ["g1"] },
      { ad_id: "a2", platform: "meta", rights_grant_ids: ["g2", "g1"] },
      { ad_id: "a3", platform: "meta", rights_grant_ids: ["g2"] },
    ];
    expect(adsToPause(ads, "g1").map((a) => a.ad_id)).toEqual(["a1", "a2"]);
  });
});

describe("market rules", () => {
  it("covers the launch markets and points only at engine compliance rule ids", () => {
    // Rule objects sit under global, markets.<m>.rules and subdivisions (CA-QC), so collect every object with an id.
    const ruleIds = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.id === "string" && typeof o.severity === "string") ruleIds.add(o.id);
        Object.values(o).forEach(walk);
      }
    };
    walk(engine("..", "specs", "compliance-rules.json"));
    expect(markets()).toEqual(expect.arrayContaining(["GB", "SG", "US", "CA", "CA-QC", "AE", "SA", "QA", "KW", "BH", "OM", "NL", "DE", "FR", "ES"]));
    for (const m of markets()) {
      for (const id of marketRules(m).rule_ids) expect(ruleIds, `${m}: ${id}`).toContain(id);
    }
  });

  it("matches the engine market groups", () => {
    for (const m of markets()) {
      const r = marketRules(m);
      expect(enums.market_groups[r.group], m).toContain(m.slice(0, 2));
    }
  });

  it("applies the market differences", () => {
    expect(isWeekend("AE", "2026-11-01")).toBe(true); // Sunday
    expect(isWeekend("SA", "2026-11-01")).toBe(false);
    expect(isWeekend("SA", "2026-10-30")).toBe(true); // Friday
    expect(marketRules("DE")).toMatchObject({ currency: "EUR", pixel_needs_consent: true, no_profiling_of_minors: true });
    expect(marketRules("DE").rule_ids).toContain("EU-COOKIE");
    expect(marketRules("SA").alcohol_banned).toBe(true);
    expect(marketRules("AE").creator_licence).toBe("AE-INFLUENCER-LICENCE");
    expect(marketRules("CA-QC").required_language).toBe("fr");
    expect(platformsFor("GB", "b2b")[0]).toBe("linkedin");
    expect(globalRules.list_upload).toEqual({ channel: "paid_ad", purpose: "marketing" });
    expect(() => marketRules("JP")).toThrow();
  });
});
