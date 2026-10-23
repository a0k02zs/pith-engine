import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { assetLocale, emailRequirements, giftDecision, isGcc, marketRule, playOrder } from "../src/markets.js";

const enums = JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", "enums.json"), "utf8"));
const overlays = JSON.parse(readFileSync(dir("..", "..", "engine", "specs", "compliance-rules.json"), "utf8")).service_overlays;

describe("market rules", () => {
  it("is the file the engine compliance gate reads for ABM", () => {
    expect(JSON.stringify(overlays.abm)).toContain("services/abm/markets/rules.json");
  });

  it("has rules for every launch country", () => {
    for (const c of ["GB", "US", "CA", "SG", ...enums.market_groups.GCC, ...enums.market_groups.EU]) {
      expect(() => marketRule(c), c).not.toThrow();
      expect(marketRule(c).gift_limit.currency, c).toMatch(/^[A-Z]{3}$/);
    }
    expect(() => marketRule("JP")).toThrow(/No ABM market rules/);
  });

  it("uses the stricter opt-in basis for Germany and EU countries with no own entry", () => {
    expect(marketRule("DE").b2b_email_basis).toBe("opt_in");
    expect(marketRule("FR").b2b_email_basis).toBe("legitimate_interest_role_relevant");
    expect(marketRule("IE").b2b_email_basis).toBe("opt_in");
    expect(marketRule("IE").required_in_email).toContain("article_14_notice_link");
  });

  it("lets Qatar, Kuwait, Bahrain and Oman inherit Saudi rules but keep their own currency", () => {
    const kw = marketRule("KW");
    expect(kw.weekend).toEqual(["FRI", "SAT"]);
    expect(kw.gift_banned_items).toContain("alcohol");
    expect(kw.gift_limit).toMatchObject({ currency: "KWD", private_sector: 25, public_sector_needs_written_account_approval: true });
  });

  it("uses French and Law 25 in Quebec", () => {
    expect(marketRule("CA", "CA-QC")).toMatchObject({ languages: ["fr-CA"], privacy_law: "Law 25" });
    expect(assetLocale("CA", { subdivision: "CA-QC" })).toBe("fr-CA");
    expect(assetLocale("CA")).toBe("en-CA");
  });

  it("starts GCC accounts with warm plays before executive email", () => {
    expect(isGcc("AE")).toBe(true);
    expect(isGcc("GB")).toBe(false);
    expect(playOrder("SA")).toEqual(["P1", "P4", "P2"]);
    expect(playOrder("GB")).toEqual(["P1", "P2"]);
  });
});

describe("gifts (gate G4)", () => {
  it("allows a small private-sector gift", () => {
    expect(giftDecision("GB", { value: 40, currency: "GBP", items: ["book"], publicSector: false })).toEqual({ decision: "allowed" });
  });

  it("needs approval over the limit, for public sector, or in another currency", () => {
    expect(giftDecision("GB", { value: 60, currency: "GBP", items: [], publicSector: false }).decision).toBe("needs_approval");
    expect(giftDecision("US", { value: 10, currency: "USD", items: [], publicSector: true }).decision).toBe("needs_approval");
    expect(giftDecision("SG", { value: 10, currency: "USD", items: [], publicSector: false }).decision).toBe("needs_approval");
  });

  it("asks for written account approval for GCC public sector", () => {
    const d = giftDecision("AE", { value: 100, currency: "AED", items: [], publicSector: true });
    expect(d).toEqual({ decision: "needs_approval", reason: "public-sector account with written approval from the account" });
  });

  it("bans alcohol and pork in the GCC", () => {
    expect(giftDecision("QA", { value: 50, currency: "QAR", items: ["alcohol"], publicSector: false }).decision).toBe("banned");
  });
});

describe("email requirements and locale", () => {
  it("adds the <ADV> subject label only on Singapore Tier 3", () => {
    expect(emailRequirements("SG", 3).subjectPrefix).toBe("<ADV>");
    expect(emailRequirements("SG", 1).subjectPrefix).toBeNull();
    expect(emailRequirements("GB", 3).subjectPrefix).toBeNull();
  });

  it("needs a postal address in US and Canadian email", () => {
    expect(emailRequirements("US", 2).elements).toContain("postal_address");
    expect(emailRequirements("CA", 2).elements).toContain("postal_address");
  });

  it("uses Arabic for government-linked GCC buyers and the contact language in the EU", () => {
    expect(assetLocale("AE", { governmentLinked: true })).toBe("ar-AE");
    expect(assetLocale("AE")).toBe("en");
    expect(assetLocale("DE", { contactLanguage: "de-DE" })).toBe("de-DE");
    expect(() => assetLocale("DE")).toThrow(/business language/);
  });
});
