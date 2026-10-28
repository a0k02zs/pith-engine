import { describe, expect, it } from "vitest";
import {
  COMMITTEE_TARGET,
  DEFAULT_THRESHOLDS,
  FIT_WEIGHTS,
  committeeCoverage,
  engagedContacts,
  engagementScore,
  fitScore,
  intentScore,
  isSalesReady,
  isSurge,
  needsCoolDown,
  proposeTiers,
} from "../src/scoring.js";

const now = new Date("2026-10-22T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe("fit score (playbook §5.1)", () => {
  it("has weights that add up to 100", () => {
    expect(Object.values(FIT_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("gives 100 for a perfect account and 0 for none", () => {
    const all = (n: number) => ({ industry: n, size: n, technographic: n, market: n, situation: n, relationship: n });
    expect(fitScore(all(1))).toBe(100);
    expect(fitScore(all(0))).toBe(0);
  });

  it("weights each factor and clamps values outside 0 to 1", () => {
    expect(fitScore({ industry: 1, size: 0.5, technographic: 0, market: 2, situation: -1, relationship: 0 })).toBe(25 + 10 + 15);
  });
});

describe("intent score (playbook §5.2)", () => {
  it("halves a signal after its half-life", () => {
    expect(intentScore([{ type: "buying_page_visit", points: 20, observedAt: daysAgo(7) }], now)).toBe(10);
  });

  it("caps each signal type, then the total at 100", () => {
    const many = Array.from({ length: 5 }, () => ({ type: "topic_surge" as const, points: 30, observedAt: now }));
    expect(intentScore(many, now)).toBe(30);
    const full = (["topic_surge", "buying_page_visit", "hiring", "company_event", "review_site"] as const).map((type) => ({ type, points: 100, observedAt: now }));
    expect(intentScore(full, now)).toBe(100);
  });
});

describe("engagement (playbook §5.3)", () => {
  const signals = [
    { type: "reply" as const, contactId: "c1", at: daysAgo(1) },
    { type: "meeting_accepted" as const, contactId: "c2", at: daysAgo(10) },
    { type: "ad_click" as const, contactId: null, at: daysAgo(2) },
    { type: "ad_click" as const, contactId: "c3", at: daysAgo(2) },
    { type: "page_visit" as const, contactId: "c4", at: daysAgo(20) },
    { type: "download" as const, contactId: "c5", at: daysAgo(31) },
  ];

  it("adds points and drops signals older than 30 days", () => {
    expect(engagementScore(signals, now)).toBe(15 + 25 + 5 + 5 + 10);
  });

  it("counts people engaged in 14 days, without ad clicks", () => {
    expect(engagedContacts(signals, now)).toBe(2);
  });

  it("ignores signals in the future", () => {
    expect(engagementScore([{ type: "reply", contactId: "c1", at: new Date(now.getTime() + 1000) }], now)).toBe(0);
  });
});

describe("thresholds (playbook §5.4)", () => {
  it("never calls a stale account a surge", () => {
    expect(isSurge({ intent: 90, intentSevenDaysAgo: 10, stale: true })).toBe(false);
    expect(isSurge({ intent: 60, intentSevenDaysAgo: 59, stale: false })).toBe(true);
    expect(isSurge({ intent: 40, intentSevenDaysAgo: 15, stale: false })).toBe(true);
    expect(isSurge({ intent: 40, intentSevenDaysAgo: 16, stale: false })).toBe(false);
  });

  it("needs intent 70, engagement 40 and 2 engaged people for sales-ready", () => {
    expect(isSalesReady({ intent: 70, engagement: 40, engagedContacts14d: 2 })).toBe(true);
    expect(isSalesReady({ intent: 69.9, engagement: 40, engagedContacts14d: 2 })).toBe(false);
    expect(isSalesReady({ intent: 70, engagement: 40, engagedContacts14d: 1 })).toBe(false);
  });

  it("cools down an account with no engagement for 60 days", () => {
    expect(needsCoolDown(null, daysAgo(60), now)).toBe(true);
    expect(needsCoolDown(daysAgo(59), daysAgo(200), now)).toBe(false);
    expect(DEFAULT_THRESHOLDS.cooldown_days).toBe(60);
  });
});

describe("proposed tiers for gate G1", () => {
  const cap = { tier1_max: 1, tier2_max: 2, tier3_max: 1 };

  it("puts only strategic accounts with fit 80 or more in Tier 1 and fills by fit", () => {
    const tiers = proposeTiers(
      [
        { account_id: "a", fit: 95, strategic: false },
        { account_id: "b", fit: 85, strategic: true },
        { account_id: "c", fit: 90, strategic: true },
        { account_id: "d", fit: 70, strategic: false },
        { account_id: "e", fit: 65, strategic: false },
        { account_id: "f", fit: 61, strategic: false },
        { account_id: "g", fit: 59, strategic: true },
      ],
      cap,
    );
    expect(Object.fromEntries(tiers)).toEqual({ c: 1, a: 2, b: 2, d: 3 });
  });

  it("measures committee coverage against the tier target", () => {
    expect(COMMITTEE_TARGET).toEqual({ 1: 4, 2: 3, 3: 1 });
    expect(committeeCoverage(2, 1)).toBe(0.5);
    expect(committeeCoverage(5, 2)).toBe(1);
  });
});
