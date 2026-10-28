import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { blackoutsFor, dirFor, formatPrice, knownMarkets, rulesFor } from "../src/market-rules.js";
import { dir } from "../src/paths.js";

const enums = JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", "enums.json"), "utf8"));

describe("market rules", () => {
  it("covers the launch markets", () => {
    for (const m of ["GB", "SG", "US", "CA", "AE", "SA", "QA", "NL", "DE"]) expect(knownMarkets()).toContain(m);
  });

  it("uses only market codes from the engine enums", () => {
    const all = Object.values(enums.market_groups as Record<string, string[]>).flat();
    for (const m of knownMarkets()) expect(all).toContain(m);
  });

  it("throws on an unknown market", () => {
    expect(() => rulesFor("XX")).toThrow(/No CRO market rules/);
  });

  it("needs cookie consent before a test in every market except the US", () => {
    for (const m of knownMarkets()) expect(rulesFor(m).cookie_consent_for_tests).toBe(m !== "US");
  });

  it("has a valid date range for every blackout", () => {
    for (const m of knownMarkets()) {
      for (const b of blackoutsFor(m)) {
        expect(b.from <= b.to, b.name).toBe(true);
        expect(Number.isNaN(Date.parse(b.from))).toBe(false);
      }
    }
  });

  it("writes Arabic right to left", () => {
    expect(dirFor("ar-AE")).toBe("rtl");
    expect(dirFor("en-AE")).toBe("ltr");
  });

  it("formats prices with the market's decimals", () => {
    expect(formatPrice(1234.5, "GB")).toBe("£1,234.50");
    expect(formatPrice(12.5, "KW", "en-KW")).toMatch(/12\.500/);
    expect(formatPrice(10, "DE")).toMatch(/10,00\s?€/);
  });
});
