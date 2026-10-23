import { describe, expect, it } from "vitest";
import { matchRateStatus, runQa, type QaInput } from "../src/qa.js";

const good: QaInput = {
  sourceAgeHours: { ga4: 10, orders: 4 },
  ordersSource: 1000, ordersWarehouse: 990,
  revenueSource: 50_000, revenueWarehouse: 49_500,
  platforms: [{ name: "meta", spentLastPeriod: true, hasSpendNow: true, paused: false }],
  utmCoverage: 0.96,
  keyEvents: [{ name: "purchase", today: 100, yesterday: 95, explained: false }],
  trackingCoverage: 0.97,
};

describe("data checks", () => {
  it("passes clean data with a score of 100", () => {
    const r = runQa(good);
    expect(r.status).toBe("pass");
    expect(r.score).toBe(100);
    expect(r.checks.map((c) => c.id)).not.toContain("consent_shift");
  });

  it("uses the match-rate bands 95-102% pass and 90-105% warn", () => {
    expect(matchRateStatus(0.95)).toBe("pass");
    expect(matchRateStatus(1.02)).toBe("pass");
    expect(matchRateStatus(0.92)).toBe("warn");
    expect(matchRateStatus(1.05)).toBe("warn");
    expect(matchRateStatus(0.89)).toBe("block");
    expect(matchRateStatus(1.06)).toBe("block");
  });

  it("blocks stale data, a revenue gap over 5% and missing spend", () => {
    expect(runQa({ ...good, sourceAgeHours: { ga4: 37 } }).status).toBe("block");
    expect(runQa({ ...good, revenueWarehouse: 47_000 }).status).toBe("block");
    expect(runQa({ ...good, platforms: [{ name: "meta", spentLastPeriod: true, hasSpendNow: false, paused: false }] }).status).toBe("block");
    expect(runQa({ ...good, platforms: [{ name: "meta", spentLastPeriod: true, hasSpendNow: false, paused: true }] }).status).toBe("pass");
  });

  it("warns on UTM coverage under 90% and blocks under 80%", () => {
    expect(runQa({ ...good, utmCoverage: 0.85 }).status).toBe("warn");
    expect(runQa({ ...good, utmCoverage: 0.79 }).status).toBe("block");
  });

  it("warns on an unexplained event swing over 40% and ignores an explained one", () => {
    expect(runQa({ ...good, keyEvents: [{ name: "purchase", today: 50, yesterday: 100, explained: false }] }).status).toBe("warn");
    expect(runQa({ ...good, keyEvents: [{ name: "purchase", today: 50, yesterday: 100, explained: true }] }).status).toBe("pass");
  });

  it("warns on a consent shift of 10 points", () => {
    const r = runQa({ ...good, consentRate: { thisWeek: 0.6, lastWeek: 0.7 } });
    expect(r.checks.find((c) => c.id === "consent_shift")?.status).toBe("warn");
  });

  it("scores 100 - 15 per warn - 40 per block, never under 0", () => {
    expect(runQa({ ...good, utmCoverage: 0.85, trackingCoverage: 0.9 }).score).toBe(70);
    expect(runQa({ ...good, sourceAgeHours: { a: 99 }, revenueWarehouse: 0, utmCoverage: 0, trackingCoverage: 0 }).score).toBe(0);
  });
});
