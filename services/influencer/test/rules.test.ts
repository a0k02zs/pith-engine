import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { engineDir } from "../src/paths.js";
import { marketRules, supportedMarkets } from "../src/market-rules.js";
import {
  addBusinessDays, codeLeaked, creatorKpis, creatorUtm, disclosureProblems, exclusivityUplift, feeRange, fitScore,
  hardStops, licenceStatus, needsData, nextOutreach, offerAllowed, paidUsageUplift, payoutBlockers, payoutDue, type CreatorFacts,
} from "../src/rules.js";
import { buildSystemPrompt } from "../src/prompt.js";

const engine = JSON.parse(readFileSync(engineDir("specs", "compliance-rules.json"), "utf8"));
const now = new Date("2026-10-22T09:00:00Z");

describe("market rules", () => {
  it("has rules for all 5 markets: UK, EU, North America, every GCC state and Singapore", () => {
    const ms = supportedMarkets();
    for (const m of ["GB", "US", "CA", "SG", "AE", "SA", "QA", "KW", "BH", "OM", "DE", "FR", "NL", "ES", "IT"]) expect(ms).toContain(m);
    for (const m of ms) expect(() => marketRules(m), m).not.toThrow();
  });

  it("accepts every engine disclosure label, except where a stricter market rule narrows it", () => {
    for (const [key, entry] of Object.entries(engine.markets as Record<string, { disclosure_labels?: string[] }>)) {
      if (!entry.disclosure_labels || key.endsWith("_DEFAULT")) continue;
      for (const label of entry.disclosure_labels) expect(marketRules(key).labels, `${key} ${label}`).toContain(label);
    }
    for (const label of engine.markets.EU_DEFAULT.disclosure_labels) expect(marketRules("NL").labels).toContain(label);
    expect(marketRules("DE").labels).not.toContain("Ad");
    expect(marketRules("FR").labels).toEqual(["Publicité", "Collaboration commerciale", "#publicité", "#collaborationcommerciale"]);
  });

  it("needs a creator licence in AE and SA, and a local check in the other GCC states", () => {
    expect(marketRules("AE").licence).toEqual({ type: "uae_media_council", required: true });
    expect(marketRules("SA").licence).toEqual({ type: "mawthooq", required: true });
    for (const m of ["QA", "KW", "BH", "OM"]) expect(marketRules(m).licence?.required).toBe("check_local");
    expect(marketRules("GB").licence).toBeNull();
  });

  it("allows #spon in NL only", () => {
    expect(marketRules("NL").weak_tags).not.toContain("#spon");
    expect(marketRules("GB").weak_tags).toContain("#spon");
  });
});

describe("disclosure", () => {
  it("passes a UK post with Ad at the start", () => {
    expect(disclosureProblems({ market: "GB", caption: "Ad | My new skincare routine with @northwind" })).toEqual([]);
  });

  it("fails a label after the first 125 characters", () => {
    const caption = "x".repeat(130) + " #ad";
    expect(disclosureProblems({ market: "US", caption })[0]).toMatch(/after the first 125/);
  });

  it("fails a weak tag used alone", () => {
    expect(disclosureProblems({ market: "GB", caption: "Love this #collab" })).toEqual(["only a weak tag; it does not count as a label"]);
  });

  it("fails a bare #ad in Germany and passes Anzeige", () => {
    expect(disclosureProblems({ market: "DE", caption: "#ad Neue Pflege" })).toHaveLength(1);
    expect(disclosureProblems({ market: "DE", caption: "Anzeige | Neue Pflege" })).toEqual([]);
  });

  it("needs the label spoken or on screen in a video", () => {
    expect(disclosureProblems({ market: "SG", caption: "#ad new drop", isVideo: true, spokenText: "hey guys" })).toEqual(["video does not say or show the label"]);
    expect(disclosureProblems({ market: "SG", caption: "#ad new drop", isVideo: true, onScreenText: "Sponsored" })).toEqual([]);
  });

  it("accepts the Arabic label in the UAE and a gift label only for a gift", () => {
    expect(disclosureProblems({ market: "AE", caption: "إعلان | عطر جديد" })).toEqual([]);
    expect(disclosureProblems({ market: "GB", caption: "Gifted by Northwind" })).toHaveLength(1);
    expect(disclosureProblems({ market: "GB", caption: "Gifted by Northwind", giftOnly: true })).toEqual([]);
  });

  it("needs the image label in France for an edited image", () => {
    expect(disclosureProblems({ market: "FR", caption: "Publicité | nouveau sérum", imageEdited: true })).toHaveLength(1);
    expect(disclosureProblems({ market: "FR", caption: "Publicité | nouveau sérum. Image retouchée", imageEdited: true })).toEqual([]);
  });
});

describe("vetting", () => {
  const base: CreatorFacts = {
    country: "AE", real_follower_pct: 90, audience_in_market_pct: 45, is_minor: false, high_risk_post_dates: [],
    competitor_deal_dates: [], active_exclusivity: false, licences: [{ type: "uae_media_council", number: "123", expires_at: "2027-06-01" }],
  };
  const ctx = { market: "AE", segment: "b2c" as const, category: "beauty", now };

  it("passes a clean licensed creator", () => expect(hardStops(base, ctx)).toEqual([]));

  it("stops on fake followers, low audience in market and a recent competitor deal", () => {
    const c = { ...base, real_follower_pct: 60, audience_in_market_pct: 10, competitor_deal_dates: ["2026-09-01"] };
    expect(hardStops(c, ctx)).toEqual(["real_followers_low", "audience_not_in_market", "competitor_deal"]);
  });

  it("uses the lower audience minimum for B2B", () => {
    expect(hardStops({ ...base, audience_in_market_pct: 25 }, { ...ctx, segment: "b2b" })).toEqual([]);
    expect(hardStops({ ...base, audience_in_market_pct: 25 }, ctx)).toEqual(["audience_not_in_market"]);
  });

  it("stops a missing or expired UAE licence", () => {
    expect(licenceStatus({ licences: [] }, "AE", now)).toBe("missing");
    expect(hardStops({ ...base, licences: [{ type: "uae_media_council", number: "1", expires_at: "2026-01-01" }] }, ctx)).toEqual(["licence_expired"]);
    expect(licenceStatus({ licences: [] }, "QA", now)).toBe("check_local");
    expect(licenceStatus({ licences: [] }, "GB", now)).toBe("not_needed");
  });

  it("stops a minor in a banned category or without guardian consent", () => {
    expect(hardStops({ ...base, is_minor: true, guardian_consent: true }, { ...ctx, category: "alcohol" })).toContain("minor");
    expect(hardStops({ ...base, is_minor: true }, ctx)).toContain("minor");
  });

  it("asks for data when the audience is unknown", () => {
    expect(needsData({ ...base, audience_in_market_pct: null })).toBe(true);
    expect(hardStops({ ...base, audience_in_market_pct: null }, ctx)).toEqual([]);
  });

  it("weights the fit score and rejects factors outside 0 to 1", () => {
    expect(fitScore({ audience_country: 1, audience_demo: 1, interest: 1, engagement_quality: 1, brand_safety: 1, content_fit: 1 })).toBe(100);
    expect(fitScore({ audience_country: 1, audience_demo: 0, interest: 0, engagement_quality: 0.5, brand_safety: 0, content_fit: 0 })).toBe(35);
    expect(() => fitScore({ audience_country: 1.2, audience_demo: 0, interest: 0, engagement_quality: 0, brand_safety: 0, content_fit: 0 })).toThrow();
  });
});

describe("fees", () => {
  it("prices from median views and CPM, rounded to 5", () => {
    expect(feeRange({ medianViews: 40_000, cpm: { low: 10, high: 20 } })).toEqual({ low: 400, high: 800 });
  });

  it("adds paid use and exclusivity uplifts", () => {
    expect(paidUsageUplift(3)).toBe(0.3);
    expect(paidUsageUplift(12)).toBe(1);
    expect(exclusivityUplift(30)).toBe(0.2);
    expect(exclusivityUplift(90)).toBeCloseTo(0.5);
    expect(feeRange({ medianViews: 40_000, cpm: { low: 10, high: 20 }, paidUsageMonths: 3, exclusivityDays: 30 })).toEqual({ low: 600, high: 1200 });
  });

  it("sends paid use over 12 months and exclusivity over 90 days to legal review", () => {
    expect(() => paidUsageUplift(13)).toThrow(/legal review/);
    expect(() => exclusivityUplift(91)).toThrow(/legal review/);
  });

  it("lets an agent offer only inside the approved range", () => {
    expect(offerAllowed(500, { low: 400, high: 650 })).toBe(true);
    expect(offerAllowed(700, { low: 400, high: 650 })).toBe(false);
  });
});

describe("outreach", () => {
  const sent1 = [{ number: 1, at: "2026-10-20T09:00:00Z" }];
  it("sends message 1, then follow-ups on day 3 and day 7, then stops", () => {
    expect(nextOutreach({ sent: [], replied: false, declined: false, doNotContact: false }, now)).toEqual({ action: "send", number: 1 });
    expect(nextOutreach({ sent: sent1, replied: false, declined: false, doNotContact: false }, now)).toEqual({ action: "wait", until: "2026-10-23T09:00:00.000Z" });
    expect(nextOutreach({ sent: sent1, replied: false, declined: false, doNotContact: false }, new Date("2026-10-23T09:00:00Z"))).toEqual({ action: "send", number: 2 });
    const three = [...sent1, { number: 2, at: "2026-10-23T09:00:00Z" }, { number: 3, at: "2026-10-27T09:00:00Z" }];
    expect(nextOutreach({ sent: three, replied: false, declined: false, doNotContact: false }, new Date("2026-11-30T00:00:00Z"))).toEqual({ action: "stop", reason: "no_reply" });
  });

  it("stops at once on a no or do-not-contact", () => {
    expect(nextOutreach({ sent: sent1, replied: true, declined: true, doNotContact: false }, now)).toEqual({ action: "stop", reason: "declined" });
    expect(nextOutreach({ sent: [], replied: false, declined: false, doNotContact: true }, now)).toEqual({ action: "stop", reason: "do_not_contact" });
  });
});

describe("payout", () => {
  it("is ready only when every post is verified, nothing is on hold and the tax form and bank are on file", () => {
    expect(payoutBlockers({ market: "GB", deliverables: 2, verifiedLive: 2, onHold: false, taxForm: null, bankReady: true })).toEqual([]);
    expect(payoutBlockers({ market: "US", deliverables: 2, verifiedLive: 1, onHold: true, taxForm: null, bankReady: false })).toEqual([
      "1 deliverable(s) not verified live", "a live post is on hold", "tax form needed: W-9 or W-8BEN or W-8BEN-E", "bank details missing",
    ]);
    expect(payoutBlockers({ market: "US", deliverables: 1, verifiedLive: 1, onHold: false, taxForm: "W-8BEN", bankReady: true })).toEqual([]);
  });

  it("counts business days: 7 target and 15 at most", () => {
    expect(addBusinessDays(new Date("2026-10-23T12:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-10-26");
    const due = payoutDue(new Date("2026-10-22T12:00:00Z"));
    expect(due.target.toISOString().slice(0, 10)).toBe("2026-11-02");
    expect(due.latest.toISOString().slice(0, 10)).toBe("2026-11-12");
  });
});

describe("measurement", () => {
  it("computes KPIs with the engine codes and null on a zero divisor", () => {
    const k = creatorKpis({ fee: 500, productCost: 80, shipping: 20, orders: 30, revenue: 1800, views: 60_000, engagements: 3000, couponSiteOrders: 0 });
    expect(k).toEqual({ attributed_revenue: 1800, cpa: 20, roas: 3, cost_per_engagement: 0.2, "influencer.cpm": 10 });
    expect(creatorKpis({ fee: 500, productCost: 0, shipping: 0, orders: 0, revenue: 0, views: 0, engagements: 0, couponSiteOrders: 0 }).cpa).toBeNull();
  });

  it("flags a leaked code above 30% coupon-site orders", () => {
    expect(codeLeaked({ orders: 10, couponSiteOrders: 4 })).toBe(true);
    expect(codeLeaked({ orders: 10, couponSiteOrders: 3 })).toBe(false);
  });

  it("builds the creator UTM link", () => {
    expect(creatorUtm("https://northwind.com/serum?ref=1", { handle: "@SamGlow", campaignId: "cmp_1", partyId: "pty_1" })).toBe(
      "https://northwind.com/serum?ref=1&utm_source=samglow&utm_medium=influencer_post&utm_campaign=cmp_1&utm_content=pty_1",
    );
  });
});

describe("system prompt", () => {
  it("puts the brain and market rules into the preamble before the task", () => {
    const { model, system } = buildSystemPrompt("influencer/vetting@1", { client_id: "c1", organization: { name: "Northwind" } }, [marketRules("AE")]);
    expect(model).toBe("claude-sonnet-5-5");
    expect(system).toContain("influencer marketing service for the client Northwind");
    expect(system).toContain("uae_media_council");
    expect(system.indexOf("<market_rules>")).toBeLessThan(system.indexOf("Goal: vet 1 creator"));
    expect(system).not.toMatch(/\{brain|\{market_rules\}/);
  });
});
