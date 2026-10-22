import { describe, expect, it } from "vitest";
import { allowedLanguages, briefFailures, factCheckPasses, isPublishDay, needsClaimGate, needsLocalization, refreshReasons } from "../src/rules.js";
import { marketRules } from "../src/market-rules.js";
import { buildSystemPrompt } from "../src/prompt.js";

describe("fact check", () => {
  const ok = { items: [{ text: "a", verdict: "supported" as const }], needs_source: [], banned_terms_found: [] };
  it("passes when every item is supported", () => expect(factCheckPasses(ok)).toBe(true));
  it("passes a new claim (the claim gate handles it)", () =>
    expect(factCheckPasses({ ...ok, items: [{ text: "b", verdict: "new_claim" }] })).toBe(true));
  it("fails on unsupported, risk, missing source or banned term", () => {
    expect(factCheckPasses({ ...ok, items: [{ text: "b", verdict: "unsupported" }] })).toBe(false);
    expect(factCheckPasses({ ...ok, items: [{ text: "b", verdict: "risk" }] })).toBe(false);
    expect(factCheckPasses({ ...ok, needs_source: ["x"] })).toBe(false);
    expect(factCheckPasses({ ...ok, banned_terms_found: ["cheap"] })).toBe(false);
  });
});

describe("gates", () => {
  it("needs a claim gate only for new claims", () => {
    expect(needsClaimGate({ new_claims: [] })).toBe(false);
    expect(needsClaimGate({ new_claims: [{}] })).toBe(true);
  });
  it("needs localization for a language the brain does not hold", () => {
    expect(needsLocalization("ar-AE", ["en-GB", "en"])).toBe(true);
    expect(needsLocalization("en-GB", ["en-GB"])).toBe(false);
  });
});

describe("refresh", () => {
  const now = new Date("2027-04-01T00:00:00Z");
  const base = { sessionsPrevious: 1000, sessionsCurrent: 950, oldestFactDate: new Date("2026-09-01"), lostAiCitations: false, namesRetiredProduct: false };
  it("flags nothing on a healthy page", () => expect(refreshReasons(base, now)).toEqual([]));
  it("flags a 20% traffic fall at the boundary", () => {
    expect(refreshReasons({ ...base, sessionsCurrent: 800 }, now)).toEqual(["traffic_drop"]);
    expect(refreshReasons({ ...base, sessionsCurrent: 801 }, now)).toEqual([]);
  });
  it("flags facts older than 12 months, lost citations and retired products", () => {
    expect(refreshReasons({ ...base, oldestFactDate: new Date("2026-03-31"), lostAiCitations: true, namesRetiredProduct: true }, now))
      .toEqual(["stale_fact", "lost_ai_citations", "retired_product"]);
  });
});

describe("market rules", () => {
  it("maps engine country codes to content rules", () => {
    expect(marketRules("GB").currency).toBe("GBP");
    expect(marketRules("NL").currency).toBe("EUR");
    expect(marketRules("SA").currency).toBe("SAR");
    expect(() => marketRules("JP")).toThrow();
  });
  it("does not publish on the local weekend", () => {
    const friday = new Date("2027-01-22T09:00:00Z");
    const sunday = new Date("2027-01-24T09:00:00Z");
    expect(isPublishDay(friday, marketRules("SA"))).toBe(false);
    expect(isPublishDay(friday, marketRules("AE"))).toBe(true);
    expect(isPublishDay(sunday, marketRules("AE"))).toBe(false);
    expect(isPublishDay(sunday, marketRules("SA"))).toBe(true);
    expect(isPublishDay(sunday, marketRules("GB"))).toBe(false);
  });
  it("allows French for Canada and Arabic for the UAE", () => {
    expect(allowedLanguages(marketRules("CA"))).toEqual(expect.arrayContaining(["en-CA", "fr-CA"]));
    expect(allowedLanguages(marketRules("AE"))).toEqual(expect.arrayContaining(["en", "ar-AE"]));
  });
});

describe("brief check", () => {
  const brief = {
    brief_id: "cm-2027Q1-001", buyer_question: "How long does a CRM migration take?", source_of_question: "sales_call",
    original_input: "expert_interview", angle: "Data clean-up takes most of the time.", language: "en-GB",
    claims_needed: [{ text: "Used by 400 UK firms", new_claim: false }],
  };
  const langs = allowedLanguages(marketRules("GB"));
  it("passes a good brief", () => expect(briefFailures(brief, ["Used by 400 UK firms"], langs)).toEqual([]));
  it("fails an unapproved claim that is not marked new, and a wrong language", () => {
    const f = briefFailures({ ...brief, language: "en-US", claims_needed: [{ text: "No.1 in the UK", new_claim: false }] }, [], langs);
    expect(f).toHaveLength(2);
  });
});

describe("system prompt", () => {
  it("puts the brain, market rules and the agent task together", () => {
    const { model, system } = buildSystemPrompt("content/drafter@1", { client_id: "c-1", organization: { name: "Acme" } }, marketRules("GB"));
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("client Acme");
    expect(system).toContain('"currency":"GBP"');
    expect(system).toContain("brain.banned_terms");
    expect(system).toContain("Task: write the {format}");
    expect(system).not.toContain("{market_rules}");
  });
});
