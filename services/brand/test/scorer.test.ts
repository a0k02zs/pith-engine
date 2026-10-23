import { describe, expect, it } from "vitest";
import { checkCalibration, combineScore, findBannedTerms, WEIGHTS } from "../src/scorer.js";
import { readJson } from "../src/registry.js";
import { dir } from "../src/paths.js";

describe("brand-score rubric", () => {
  it("has weights that add up to 100", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("gives 100 when every dimension is 100", () => {
    const all = { voice: 100, terminology: 100, claims: 100, banned_terms: 100, locale: 100, visual: 100 };
    expect(combineScore(all).score).toBe(100);
  });

  it("moves the visual weight to voice and terminology for text-only assets", () => {
    const r = combineScore({ voice: 100, terminology: 100, claims: 100, banned_terms: 100, locale: 100 });
    expect(r.score).toBe(100);
    expect(r.weights.visual).toBe(0);
    expect(r.weights.voice).toBeCloseTo(36.67, 2);
    expect(r.weights.terminology).toBeCloseTo(18.33, 2);
  });

  it("sets claims to 0 and flags it when 1 claim is not approved", () => {
    const all = { voice: 100, terminology: 100, claims: 100, banned_terms: 100, locale: 100, visual: 100 };
    const r = combineScore(all, { unapprovedClaims: 1 });
    expect(r.score).toBe(75);
    expect(r.flags).toContain("claim");
  });

  it("sets banned_terms to 0 when a banned term appears", () => {
    const all = { voice: 100, terminology: 100, claims: 100, banned_terms: 100, locale: 100, visual: 100 };
    const r = combineScore(all, { bannedTermHits: 2 });
    expect(r.score).toBe(90);
    expect(r.flags).toEqual(["banned_term"]);
  });

  it("clamps dimension scores to 0..100", () => {
    expect(combineScore({ voice: 150, terminology: -20, claims: 100, banned_terms: 100, locale: 100, visual: 100 }).score).toBe(85);
  });
});

describe("findBannedTerms", () => {
  const brain = readJson(dir("examples", "brand-profile.example.json"));

  it("finds a banned term from the example brain, in any case", () => {
    expect(findBannedTerms("A Revolutionary close tool", brain, "GB")).toEqual(["revolutionary"]);
  });

  it("matches whole words only", () => {
    expect(findBannedTerms("revolutionaryish wording", brain, "GB")).toEqual([]);
  });

  it("respects the markets of a term", () => {
    const b = { banned_terms: [{ term: "cheap", markets: ["AE"] }] };
    expect(findBannedTerms("cheap and fast", b, "GB")).toEqual([]);
    expect(findBannedTerms("cheap and fast", b, "AE")).toEqual(["cheap"]);
  });
});

describe("scorer calibration", () => {
  const good = (n: number) => Array.from({ length: 20 }, (_, i) => (i < n ? 85 : 70));
  const bad = (n: number) => Array.from({ length: 20 }, (_, i) => (i < n ? 40 : 65));

  it("passes at 18 of 20 each way", () => {
    expect(checkCalibration(good(18), bad(18)).passed).toBe(true);
  });

  it("fails at 17 on-brand", () => {
    const r = checkCalibration(good(17), bad(20));
    expect(r.passed).toBe(false);
    expect(r.onBrandPass).toBe(17);
  });

  it("fails when an off-brand sample scores 60, the boundary", () => {
    const off = [...bad(17), 60, 60, 60];
    expect(checkCalibration(good(20), off).passed).toBe(false);
  });

  it("fails without 20 samples on each side", () => {
    expect(checkCalibration([90], bad(20)).problems[0]).toMatch(/Need 20 on-brand samples/);
  });
});
