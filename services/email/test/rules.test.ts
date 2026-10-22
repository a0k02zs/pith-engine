import { describe, expect, it } from "vitest";
import { marketRules } from "../src/market-rules.js";
import { buildSystemPrompt } from "../src/prompt.js";
import {
  coldOutboundAllowed, consentAllows, defaultSendTime, deliverabilityLevel, finalSubject, isWorkDay, missingFooterFields,
  pickWinner, replyRoute, repermissionAllowed, requiredLanguage, subjectProblems, sunsetDue, withinFrequencyCap,
} from "../src/rules.js";

const now = new Date("2027-01-15T10:00:00Z");
const granted = (basis: string, extra = {}) => ({ status: "granted" as const, basis, captured_at: "2026-06-01T00:00:00Z", ...extra });

describe("market rules", () => {
  it("maps countries, inheritance and subdivisions", () => {
    expect(marketRules("GB").currency).toBe("GBP");
    expect(marketRules("QA").currency).toBe("QAR");
    expect(marketRules("QA").weekend).toEqual(["fri", "sat"]);
    expect(marketRules("FR").currency).toBe("EUR");
    expect(marketRules("DE").b2b_bases).toEqual(["double_opt_in"]);
    expect(requiredLanguage("CA-QC")).toBe("fr-CA");
    expect(requiredLanguage("CA")).toBeUndefined();
    expect(() => marketRules("JP")).toThrow();
  });
});

describe("consent at send time", () => {
  it("blocks withdrawn, expired and unknown consent everywhere", () => {
    for (const status of ["withdrawn", "expired", "unknown"] as const) {
      expect(consentAllows({ ...granted("consent"), status }, "US", "b2c", now).ok).toBe(false);
    }
  });
  it("accepts UK soft opt-in for B2C and corporate subscriber for B2B", () => {
    expect(consentAllows(granted("soft_opt_in"), "GB", "b2c", now).ok).toBe(true);
    expect(consentAllows(granted("corporate_subscriber"), "GB", "b2b", now).ok).toBe(true);
    expect(consentAllows(granted("corporate_subscriber"), "GB", "b2c", now).ok).toBe(false);
  });
  it("accepts only double opt-in in Germany", () => {
    expect(consentAllows(granted("consent"), "DE", "b2c", now).ok).toBe(false);
    expect(consentAllows(granted("double_opt_in"), "DE", "b2b", now).ok).toBe(true);
  });
  it("ends CASL implied consent after 6 months for an inquiry and 2 years for a purchase", () => {
    const inquiry = granted("implied_casl", { implied_from: "inquiry", captured_at: "2026-08-01T00:00:00Z" });
    expect(consentAllows(inquiry, "CA", "b2c", now).ok).toBe(true);
    expect(consentAllows(inquiry, "CA", "b2c", new Date("2027-02-05T00:00:00Z")).ok).toBe(false);
    const purchase = granted("implied_casl", { implied_from: "purchase_or_contract", captured_at: "2025-02-01T00:00:00Z" });
    expect(consentAllows(purchase, "CA", "b2c", now).ok).toBe(true);
    expect(consentAllows(purchase, "CA", "b2c", new Date("2027-02-02T00:00:00Z")).ok).toBe(false);
  });
  it("needs a source URL for the CASL business exemption", () => {
    expect(consentAllows(granted("casl_business_exemption"), "CA", "b2b", now).ok).toBe(false);
    expect(consentAllows(granted("casl_business_exemption", { source_url: "https://acme.ca/team" }), "CA", "b2b", now).ok).toBe(true);
  });
  it("allows cold outbound in GB, SG, US, CA and the GCC, not in the EU", () => {
    for (const m of ["GB", "SG", "US", "CA", "AE", "SA"]) expect(coldOutboundAllowed(m)).toBe(true);
    for (const m of ["NL", "DE", "FR"]) expect(coldOutboundAllowed(m)).toBe(false);
  });
  it("allows re-permission only outside Canada and the EU", () => {
    expect(repermissionAllowed("GB")).toBe(true);
    expect(repermissionAllowed("CA-QC")).toBe(false);
    expect(repermissionAllowed("NL")).toBe(false);
  });
});

describe("footers and subjects", () => {
  const base = ["sender_legal_name", "sender_postal_address", "unsubscribe_link", "privacy_notice_url"];
  it("needs the US ad statement only without consent", () => {
    expect(missingFooterFields(base, "US", { consentGiven: true })).toEqual([]);
    expect(missingFooterFields(base, "US", { consentGiven: false })).toEqual(["ad_identification"]);
  });
  it("needs a second contact method in Canada and an Article 14 notice for EU third-party data", () => {
    expect(missingFooterFields(base, "CA", { consentGiven: true })).toEqual(["secondary_contact_method"]);
    expect(missingFooterFields(base, "NL", { consentGiven: false, thirdPartyData: true })).toEqual(["article_14_notice"]);
    expect(missingFooterFields(base.slice(1), "GB", { consentGiven: true })).toEqual(["sender_legal_name"]);
  });
  it("adds <ADV> to unsolicited bulk email in Singapore only, once", () => {
    expect(finalSubject("New range", "SG", true)).toBe("<ADV> New range");
    expect(finalSubject("<ADV> New range", "SG", true)).toBe("<ADV> New range");
    expect(finalSubject("New range", "SG", false)).toBe("New range");
    expect(finalSubject("New range", "GB", true)).toBe("New range");
  });
  it("flags fake reply prefixes, all caps and too many emoji", () => {
    expect(subjectProblems("Re: your order")).toEqual(["fake reply or forward prefix"]);
    expect(subjectProblems("FWD: LAST CHANCE")).toEqual(["fake reply or forward prefix", "all caps"]);
    expect(subjectProblems("🔥🔥🔥🔥 Sale")).toEqual(["more than 3 emoji"]);
    expect(subjectProblems("Your 2026 report is ready")).toEqual([]);
  });
});

describe("send timing", () => {
  it("uses the local work week: Friday is off in Saudi Arabia, not in the UAE", () => {
    expect(isWorkDay("2027-01-15", "SA")).toBe(false);
    expect(isWorkDay("2027-01-15", "AE")).toBe(true);
    expect(isWorkDay("2027-01-17", "SA")).toBe(true);
    expect(isWorkDay("2027-01-17", "AE")).toBe(false);
    expect(isWorkDay("2027-01-16", "GB")).toBe(false);
  });
  it("moves GCC B2C sends to after iftar in Ramadan", () => {
    expect(defaultSendTime("AE", "b2c", true)).toBe("after_iftar");
    expect(defaultSendTime("AE", "b2c")).toBe("20:00");
    expect(defaultSendTime("GB", "b2c", true)).toBe("19:00");
    expect(defaultSendTime("SG", "b2b")).toBe("10:00");
  });
  it("caps campaigns at 1 a day and marketing email at 4 a week", () => {
    expect(withinFrequencyCap({ today: 0, last7Days: 3 }, true)).toBe(true);
    expect(withinFrequencyCap({ today: 1, last7Days: 2 }, true)).toBe(false);
    expect(withinFrequencyCap({ today: 1, last7Days: 2 }, false)).toBe(true);
    expect(withinFrequencyCap({ today: 0, last7Days: 4 }, false)).toBe(false);
  });
  it("starts sunset after 180 days for B2C and 270 for B2B", () => {
    const last = new Date("2026-07-01T00:00:00Z");
    expect(sunsetDue(last, "b2c", now)).toBe(true);
    expect(sunsetDue(last, "b2b", now)).toBe(false);
  });
});

describe("deliverability", () => {
  const base = { delivered: 10000, hard_bounces: 50, complaints: 5, unsubscribes: 20 };
  it("is ok under every target", () => expect(deliverabilityLevel(base)).toEqual({ level: "ok", over: [] }));
  it("watches over a target and stops at a stop limit", () => {
    expect(deliverabilityLevel({ ...base, complaints: 15 })).toEqual({ level: "watch", over: ["complaint_rate"] });
    expect(deliverabilityLevel({ ...base, complaints: 30 })).toEqual({ level: "stop", over: ["complaint_rate"] });
    expect(deliverabilityLevel({ ...base, hard_bounces: 200, unsubscribes: 100 })).toEqual({ level: "stop", over: ["bounce_rate", "opt_out_rate"] });
  });
});

describe("A/B winner", () => {
  const cell = (variant: string, clicks: number, delivered = 10000, revenue = 0, revenue_sq = 0) => ({ variant, delivered, clicks, revenue, revenue_sq });
  it("picks a clear click-rate winner at 95% confidence", () => {
    const r = pickWinner([cell("A", 200), cell("B", 270)], "ctr");
    expect(r.decision).toBe("winner");
    expect(r.winner_variant).toBe("B");
    expect(r.confidence).toBeGreaterThan(0.95);
    expect(r.lift).toBeCloseTo(0.35, 2);
  });
  it("keeps the control on a small difference or a small cell", () => {
    expect(pickWinner([cell("A", 200), cell("B", 215)], "ctr").decision).toBe("keep_control");
    expect(pickWinner([cell("A", 20, 900), cell("B", 60, 900)], "ctr").decision).toBe("keep_control");
  });
  it("never picks a worse challenger", () => {
    expect(pickWinner([cell("A", 300), cell("B", 200)], "ctr").winner_variant).toBe("A");
  });
  it("tests revenue per recipient with variance", () => {
    // A: 2% buy at 50 (mean 1.00). B: 3% buy at 50 (mean 1.50).
    const a = cell("A", 0, 20000, 400 * 50, 400 * 50 ** 2);
    const b = cell("B", 0, 20000, 600 * 50, 600 * 50 ** 2);
    const r = pickWinner([a, b], "revenue_per_recipient");
    expect(r.decision).toBe("winner");
    expect(r.winner_variant).toBe("B");
  });
});

describe("reply routing", () => {
  it("escalates before anything else and sends interest to sales", () => {
    expect(replyRoute("legal")).toBe("escalate");
    expect(replyRoute("press")).toBe("escalate");
    expect(replyRoute("unsubscribe")).toBe("optout");
    expect(replyRoute("meeting_request")).toBe("to_sales");
    expect(replyRoute("out_of_office")).toBe("log");
  });
});

describe("system prompt", () => {
  it("puts the brain, market rules and the agent task together", () => {
    const { model, system } = buildSystemPrompt("email/write@1", { client_id: "c-1", organization: { name: "Northwind" } }, marketRules("GB"));
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("client Northwind");
    expect(system).toContain('"currency":"GBP"');
    expect(system).toContain("brain.banned_words");
    expect(system).toContain("Goal: write campaign or flow emails");
    expect(system).not.toContain("{market_rules}");
  });
  it("uses the small model for checks", () => {
    expect(buildSystemPrompt("email/qa@1", { client_id: "c-1" }, marketRules("SG")).model).toBe("claude-haiku-5-5");
  });
});
