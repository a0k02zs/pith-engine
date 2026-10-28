import { describe, expect, it } from "vitest";
import {
  activationRate, assessConversion, buildPayout, checkCommission, checkRegistration, disclosureFindings, fraudRate,
  marketRules, maxCommission, monthlyBudgetCap, nextActivation, partnersForReview, payoutApprovalDetail, reversalRate,
  reviewTiers, scorePartner, severity, type Conversion, type FraudResult,
} from "../src/index.js";

const econ = { aov: 80, gross_margin: 0.55, target_contribution: 20, network_fee: 2, reversal_rate: 0.1 };

describe("commission economics", () => {
  it("computes the maximum commission per order", () => {
    const m = maxCommission(econ);
    expect(m.amount).toBeCloseTo(20, 6);
    expect(m.rate).toBeCloseTo(0.25, 6);
  });

  it("accepts a rate inside the range and under the maximum, with headroom", () => {
    const v = checkCommission("affiliate_physical", 0.1, econ, { checkoutTracking: true });
    expect(v).toEqual({ verdict: "fits", headroom: expect.closeTo(12, 6) });
  });

  it("rejects a rate over the maximum before the range check", () => {
    const v = checkCommission("affiliate_digital", 0.3, { ...econ, gross_margin: 0.4 }, { checkoutTracking: true });
    expect(v.verdict).toBe("over_max");
  });

  it("flags a rate outside the playbook range", () => {
    expect(checkCommission("affiliate_physical", 0.15, econ, { checkoutTracking: true })).toEqual({ verdict: "outside_range", range: [0.05, 0.1] });
  });

  it("says fix first for low margin, no tracking or no room", () => {
    const v = checkCommission("affiliate_physical", 0.05, { ...econ, gross_margin: 0.15 }, { checkoutTracking: false });
    expect(v.verdict).toBe("fix_first");
    if (v.verdict === "fix_first") {
      expect(v.reasons).toContain("no checkout tracking");
      expect(v.reasons.some((r) => r.startsWith("gross margin under"))).toBe(true);
      expect(v.reasons).toContain("no room for commission after contribution and fees");
    }
  });

  it("sets the budget cap with the 1.2 buffer plus fees", () => {
    expect(monthlyBudgetCap(50_000, 0.08, 500)).toBeCloseTo(5_300, 6);
  });
});

describe("partner scorecard", () => {
  const good = { audience_fit: 5, content_fit: 4, reach: 3, quality: 4, incrementality: 4, brand_safety: 5 };

  it("approves a strong candidate", () => {
    expect(scorePartner(good)).toEqual({ total: 4.2, recommend: "approve", missing: [] });
  });

  it("rejects on low brand safety whatever the total", () => {
    expect(scorePartner({ ...good, brand_safety: 2 }).recommend).toBe("reject");
  });

  it("counts missing data as 0 and lists it", () => {
    const r = scorePartner({ ...good, reach: null, quality: null });
    expect(r.missing).toEqual(["reach", "quality"]);
    expect(r.total).toBe(3.15);
    expect(r.recommend).toBe("review");
  });

  it("rejects a score outside 0 to 5", () => {
    expect(() => scorePartner({ ...good, reach: 7 })).toThrow(/0 to 5/);
  });
});

const conv = (over: Partial<Conversion> = {}): Conversion => ({
  conversion_id: "c1", partner_id: "p1", amount: 8, currency: "GBP", amount_gbp: 8, seconds_from_click: 600,
  ip_conversions_same_day: 1, self_referral_match: false, cookie_stuffing: false, coupon_leak: false,
  returned_in_lock_period: false, partner_age_days: 200, ...over,
});

describe("fraud rules", () => {
  it("approves a clean conversion", () => {
    expect(assessConversion(conv(), 0.02, 0.02)).toMatchObject({ decision: "approve", rules: [], needs_person: false });
  });

  it("reverses self-referral and cookie stuffing; reverse wins over hold", () => {
    const r = assessConversion(conv({ self_referral_match: true, seconds_from_click: 3 }), 0.02, 0.02);
    expect(r.decision).toBe("reverse");
    expect(r.rules).toEqual(["self_referral", "fast_conversion"]);
    expect(r.needs_person).toBe(false);
  });

  it("holds fast conversions, IP bursts, coupon leaks and hot new partners", () => {
    expect(assessConversion(conv({ seconds_from_click: 4 }), 0.02, 0.02).rules).toEqual(["fast_conversion"]);
    expect(assessConversion(conv({ ip_conversions_same_day: 4 }), 0.02, 0.02).rules).toEqual(["many_from_one_ip"]);
    expect(assessConversion(conv({ coupon_leak: true }), 0.02, 0.02).rules).toEqual(["coupon_leak"]);
    expect(assessConversion(conv({ partner_age_days: 10 }), 0.02, 0.07).rules).toEqual(["new_partner_high_cvr"]);
    expect(assessConversion(conv({ partner_age_days: 10 }), 0.02, 0.06).decision).toBe("approve");
    expect(assessConversion(conv({ seconds_from_click: 4 }), 0.02, 0.02).needs_person).toBe(true);
  });

  it("sends a reversal over £500 to a person", () => {
    expect(assessConversion(conv({ cookie_stuffing: true, amount_gbp: 600, amount: 600 }), 0, 0).needs_person).toBe(true);
  });

  it("flags partners with 3 holds in 7 days", () => {
    const now = new Date("2026-11-08T00:00:00Z");
    const holds = [
      { partner_id: "p1", at: "2026-11-07T10:00:00Z" }, { partner_id: "p1", at: "2026-11-05T10:00:00Z" },
      { partner_id: "p1", at: "2026-11-02T10:00:00Z" }, { partner_id: "p2", at: "2026-11-07T10:00:00Z" },
      { partner_id: "p2", at: "2026-11-06T10:00:00Z" }, { partner_id: "p2", at: "2026-10-20T10:00:00Z" },
    ];
    expect(partnersForReview(holds, now)).toEqual(["p1"]);
  });

  it("counts only fraud reversals in the fraud rate, and every reversal in the reversal rate", () => {
    const rs = [
      assessConversion(conv({ conversion_id: "a", amount_gbp: 50 }), 0, 0),
      assessConversion(conv({ conversion_id: "b", amount_gbp: 25, self_referral_match: true }), 0, 0),
      assessConversion(conv({ conversion_id: "c", amount_gbp: 25, returned_in_lock_period: true }), 0, 0),
    ];
    expect(fraudRate(rs)).toBeCloseTo(0.25, 6);
    expect(reversalRate(rs)).toBeCloseTo(0.5, 6);
  });
});

describe("activation and tiers", () => {
  it("picks the latest due step that is not done", () => {
    expect(nextActivation({ partner_id: "p", days_since_join: 0, clicks: 0, conversions: 0, done: [] })).toBe("welcome");
    expect(nextActivation({ partner_id: "p", days_since_join: 4, clicks: 0, conversions: 0, done: ["welcome"] })).toBe("link_check");
    expect(nextActivation({ partner_id: "p", days_since_join: 4, clicks: 5, conversions: 0, done: ["welcome"] })).toBeNull();
    expect(nextActivation({ partner_id: "p", days_since_join: 61, clicks: 9, conversions: 0, done: ["welcome", "content_ideas", "first_month_report"] })).toBe("mark_dormant");
    expect(nextActivation({ partner_id: "p", days_since_join: 61, clicks: 9, conversions: 2, done: ["welcome", "content_ideas", "first_month_report"] })).toBeNull();
  });

  it("moves partners between tiers and marks upgrades for approval", () => {
    const filler = Array.from({ length: 9 }, (_, i) => ({ partner_id: `f${i}`, current: "silver" as const, monthly_revenue: [100, 100, 100], monthly_conversions: [1, 1, 1] }));
    const changes = reviewTiers([
      { partner_id: "top", current: "silver", monthly_revenue: [5000, 6000, 7000], monthly_conversions: [50, 60, 70] },
      { partner_id: "quiet", current: "silver", monthly_revenue: [100, 0, 0], monthly_conversions: [1, 0, 0] },
      ...filler,
    ]);
    expect(changes).toEqual([
      { partner_id: "top", from: "silver", to: "gold", needs_approval: true },
      { partner_id: "quiet", from: "silver", to: "bronze", needs_approval: false },
    ]);
  });

  it("computes the activation rate for a cohort", () => {
    expect(activationRate([{ days_to_first_conversion: 12 }, { days_to_first_conversion: 120 }, { days_to_first_conversion: null }, { days_to_first_conversion: 90 }])).toBe(0.5);
    expect(activationRate([])).toBe(0);
  });
});

describe("payout file", () => {
  const r = (id: string, partner: string, decision: FraudResult["decision"], amount: number, currency = "GBP"): FraudResult => ({
    conversion_id: id, partner_id: partner, decision, rules: [], amount, currency, amount_gbp: amount, needs_person: false,
  });
  const fx = { GBP: 1, USD: 0.8, AED: 0.2 };
  const profile = (party_id: string, currency: string, over = {}) => ({ party_id, currency, tax_form_on_file: true, payout_method_on_file: true, carried_forward: 0, ...over });

  it("pays approved conversions past the lock period, nets reversals and groups by currency", () => {
    const file = buildPayout("2026-10", [
      { result: r("1", "p1", "approve", 40), lock_passed: true },
      { result: r("2", "p1", "approve", 30), lock_passed: false },
      { result: r("3", "p1", "reverse", 10), lock_passed: false },
      { result: r("4", "p2", "approve", 100, "USD"), lock_passed: true },
      { result: r("5", "p2", "hold", 50, "USD"), lock_passed: true },
      { result: r("6", "p2", "hold", 20, "USD"), lock_passed: true, hold_approved: true },
    ], [profile("p1", "GBP"), profile("p2", "USD")], fx, 1000);
    expect(file.lines).toEqual([
      { party_id: "p1", currency: "GBP", conversions: 1, gross: 40, reversals: 10, carried_forward: 0, net: 30 },
      { party_id: "p2", currency: "USD", conversions: 2, gross: 120, reversals: 0, carried_forward: 0, net: 120 },
    ]);
    expect(file.totals_by_currency).toEqual({ GBP: 30, USD: 120 });
    expect(file.total_reporting).toBe(126);
    expect(file.within_cap).toBe(true);
  });

  it("blocks partners with no tax form or payout method and carries small balances", () => {
    const file = buildPayout("2026-10", [
      { result: r("1", "p1", "approve", 40), lock_passed: true },
      { result: r("2", "p2", "approve", 40), lock_passed: true },
      { result: r("3", "p3", "approve", 10), lock_passed: true },
    ], [profile("p1", "GBP", { tax_form_on_file: false }), profile("p2", "GBP", { payout_method_on_file: false }), profile("p3", "GBP")], fx, 1000);
    expect(file.lines).toEqual([]);
    expect(file.blocked.map((b) => b.reason)).toEqual(["tax form missing", "payout method missing"]);
    expect(file.carried).toEqual([{ party_id: "p3", net: 10 }]);
  });

  it("reports over cap so the workflow stops before approval", () => {
    const file = buildPayout("2026-10", [{ result: r("1", "p1", "approve", 500), lock_passed: true }], [profile("p1", "GBP")], fx, 400);
    expect(file.within_cap).toBe(false);
  });

  it("builds the engine payout batch payload", () => {
    const file = buildPayout("2026-10", [{ result: r("1", "p1", "approve", 40), lock_passed: true }], [profile("p1", "GBP")], fx, 1000);
    expect(payoutApprovalDetail(file, (id) => `https://portal.example/statements/${id}`)).toEqual({
      lines: [{ party_id: "p1", amount: 40, currency: "GBP", period: "2026-10", proof_url: "https://portal.example/statements/p1" }],
      totals_by_currency: { GBP: 40 },
    });
  });

  it("refuses a partner paid in 2 currencies and an unknown FX rate", () => {
    expect(() => buildPayout("2026-10", [{ result: r("1", "p1", "approve", 1), lock_passed: true }, { result: r("2", "p1", "approve", 1, "USD"), lock_passed: true }], [], fx, 1)).toThrow(/GBP and USD/);
    expect(() => buildPayout("2026-10", [{ result: r("1", "p1", "approve", 30, "SGD"), lock_passed: true }], [profile("p1", "SGD")], fx, 1)).toThrow(/No FX rate/);
  });
});

describe("disclosure and market rules", () => {
  const now = new Date("2026-10-22T00:00:00Z");
  const party = { country: "GB" };

  it("accepts a label before the first link and rejects one after it", () => {
    expect(disclosureFindings({ text: "Ad · Affiliate link: I earn a commission. Buy here", first_link_at: 44, kind: "page" }, "GB", party, now)).toEqual([]);
    expect(disclosureFindings({ text: "Buy here. This post has an affiliate link", first_link_at: 0, kind: "page" }, "GB", party, now)).toEqual(["weak_disclosure"]);
    expect(disclosureFindings({ text: "My honest review. Buy here", first_link_at: 18, kind: "page" }, "GB", party, now)).toEqual(["no_disclosure"]);
  });

  it("does not count 'ad' inside another word", () => {
    expect(disclosureFindings({ text: "Read my adventure guide. Buy here", first_link_at: 25, kind: "page" }, "GB", party, now)).toEqual(["no_disclosure"]);
  });

  it("needs the label at the start of a social post", () => {
    const long = "Loving this serum after 6 weeks of daily use, my skin feels great #ad link";
    expect(disclosureFindings({ text: long, first_link_at: 70, kind: "social_post" }, "GB", party, now)).toEqual(["weak_disclosure"]);
    expect(disclosureFindings({ text: "#ad Loving this serum, link below", first_link_at: 25, kind: "social_post" }, "GB", party, now)).toEqual([]);
  });

  it("uses French labels for Quebec", () => {
    expect(marketRules("CA-QC").language).toBe("fr-CA");
    expect(disclosureFindings({ text: "Publicité · lien affilié : acheter ici", first_link_at: 30, kind: "page" }, "CA-QC", { country: "CA" }, now)).toEqual([]);
    expect(disclosureFindings({ text: "Ad · Affiliate link: buy here", first_link_at: 22, kind: "page" }, "CA-QC", { country: "CA" }, now)).toEqual(["no_disclosure"]);
  });

  it("needs a current Media Council permit in the UAE and Mawthooq in Saudi Arabia", () => {
    const post = { text: "إعلان · رابط تسويق بالعمولة", first_link_at: 20, kind: "page" as const };
    expect(disclosureFindings(post, "AE", { country: "AE" }, now)).toEqual(["missing_licence"]);
    expect(disclosureFindings(post, "AE", { country: "AE", licences: [{ type: "uae_media_council", number: "1", expires_at: "2027-01-01T00:00:00Z" }] }, now)).toEqual([]);
    expect(disclosureFindings(post, "AE", { country: "AE", licences: [{ type: "uae_media_council", number: "1", expires_at: "2026-01-01T00:00:00Z" }] }, now)).toEqual(["missing_licence"]);
    expect(disclosureFindings(post, "SA", { country: "SA", licences: [{ type: "uae_media_council", number: "1" }] }, now)).toEqual(["missing_licence"]);
    expect(disclosureFindings(post, "QA", { country: "QA" }, now)).toEqual([]);
    expect(severity("missing_licence", false)).toBe("serious");
    expect(severity("weak_disclosure", false)).toBe("minor");
    expect(severity("weak_disclosure", true)).toBe("serious");
  });

  it("needs an AI label on AI media in the EU, with EU defaults for countries with no own entry", () => {
    const page = { text: "Werbung · Affiliate-Link: hier kaufen", first_link_at: 30, kind: "page" as const, has_ai_media: true };
    expect(disclosureFindings(page, "DE", { country: "DE" }, now)).toEqual(["ai_label"]);
    expect(disclosureFindings({ ...page, text: "Werbung · Affiliate-Link (Bild KI-generiert): hier kaufen" }, "DE", { country: "DE" }, now)).toEqual([]);
    expect(marketRules("PL").currency).toBe("EUR");
    expect(marketRules("BH")).toMatchObject({ currency: "BHD", vat_rate: 0.1, partner_licence: null });
    expect(() => marketRules("JP")).toThrow(/No affiliate rules/);
  });
});

describe("deal desk", () => {
  const reg = { registration_id: "r2", partner_id: "pB", company_domain: "Acme.com", registered_at: "2026-10-20T00:00:00Z" };

  it("accepts a clean registration", () => {
    expect(checkRegistration(reg, [], [], 90)).toEqual({ registration_id: "r2", decision: "accept" });
  });

  it("finds CRM conflicts and an earlier partner inside the window", () => {
    const d = checkRegistration(reg, [{ company_domain: "acme.com", type: "open_opportunity", record_id: "opp-1" }], [
      { registration_id: "r1", partner_id: "pA", company_domain: "acme.com", registered_at: "2026-09-01T00:00:00Z" },
      { registration_id: "r0", partner_id: "pC", company_domain: "acme.com", registered_at: "2026-01-01T00:00:00Z" },
    ], 90);
    expect(d).toEqual({ registration_id: "r2", decision: "conflict", conflicts: [{ type: "open_opportunity", record_id: "opp-1" }, { type: "other_partner", record_id: "r1" }] });
  });
});
