import { describe, expect, it } from "vitest";
import { checkFit, checkReadiness, coefficientOfVariation, scenarioViolations, type FitSummary } from "../src/mmm.js";

const varied = (n: number) => Array.from({ length: n }, (_, i) => 100 + (i % 4) * 40);

describe("MMM readiness", () => {
  it("is ready with 104 weeks, varied spend and marked holidays", () => {
    const r = checkReadiness({ weeks: 104, channels: [{ channel: "search", weeklySpend: varied(104) }], markets: ["GB"], holidaysMarkedFor: ["GB"] });
    expect(r).toMatchObject({ ready: true, lowData: false, modelled: ["search"] });
  });

  it("allows 78 weeks as low data and refuses fewer", () => {
    const ch = [{ channel: "search", weeklySpend: varied(78) }];
    expect(checkReadiness({ weeks: 78, channels: ch, markets: [], holidaysMarkedFor: [] })).toMatchObject({ ready: true, lowData: true });
    expect(checkReadiness({ weeks: 77, channels: ch, markets: [], holidaysMarkedFor: [] }).ready).toBe(false);
  });

  it("drops channels with rare or flat spend", () => {
    const r = checkReadiness({
      weeks: 104, markets: [], holidaysMarkedFor: [],
      channels: [
        { channel: "search", weeklySpend: varied(104) },
        { channel: "tv", weeklySpend: varied(104).map((x, i) => (i < 60 ? 0 : x)) },
        { channel: "affiliate", weeklySpend: Array(104).fill(100) },
      ],
    });
    expect(r.modelled).toEqual(["search"]);
    expect(r.dropped.map((d) => d.channel)).toEqual(["tv", "affiliate"]);
  });

  it("allows at most 1 channel per 10 weeks", () => {
    const channels = Array.from({ length: 9 }, (_, i) => ({ channel: `c${i}`, weeklySpend: varied(80) }));
    expect(checkReadiness({ weeks: 80, channels, markets: [], holidaysMarkedFor: [] }).ready).toBe(false);
  });

  it("needs holidays marked for every market (Ramadan for the GCC)", () => {
    const r = checkReadiness({ weeks: 104, channels: [{ channel: "s", weeklySpend: varied(104) }], markets: ["GB", "AE"], holidaysMarkedFor: ["GB"] });
    expect(r.ready).toBe(false);
    expect(r.problems.join()).toContain("AE");
  });

  it("computes the coefficient of variation", () => {
    expect(coefficientOfVariation([1, 1, 1])).toBe(0);
    expect(coefficientOfVariation([0, 2])).toBe(1);
  });
});

describe("MMM fit acceptance", () => {
  const fit: FitSummary = { maxRhat: 1.01, holdoutMape: 0.08, baselineShare: 0.6, channels: [{ channel: "search", roiMedian: 2, roiCi90: [1.2, 2.9], testPositive: true }] };

  it("passes a good fit", () => expect(checkFit(fit)).toEqual({ pass: true, failures: [] }));

  it("fails on R-hat, MAPE, baseline share and a test that disagrees", () => {
    expect(checkFit({ ...fit, maxRhat: 1.2 }).pass).toBe(false);
    expect(checkFit({ ...fit, holdoutMape: 0.16 }).pass).toBe(false);
    expect(checkFit({ ...fit, baselineShare: 0.97 }).pass).toBe(false);
    expect(checkFit({ ...fit, channels: [{ ...fit.channels[0], testPositive: false }] }).pass).toBe(false);
  });

  it("does not fail an interval that crosses 0", () => {
    expect(checkFit({ ...fit, channels: [{ channel: "tv", roiMedian: 0.2, roiCi90: [-0.3, 0.8], testPositive: false }] }).pass).toBe(true);
  });
});

describe("budget scenarios", () => {
  it("flags a move over 25% in a quarter and new spend from 0", () => {
    expect(scenarioViolations({ search: 100, social: 100, tv: 0 }, { search: 125, social: 70, tv: 10 })).toEqual(["social", "tv"]);
  });
});
