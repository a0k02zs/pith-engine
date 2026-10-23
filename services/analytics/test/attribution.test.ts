import { describe, expect, it } from "vitest";
import {
  attribute, attributeDataDriven, LOOKBACK_DAYS, pathInWindow, platformClaimRatio, removalEffectShares, ruleWeights, summarize, UNATTRIBUTED,
  type Conversion, type Touchpoint,
} from "../src/attribution.js";

const at = (day: number) => new Date(Date.UTC(2026, 9, day)).toISOString();
const tp = (id: number, channel: string, day: number): Touchpoint => ({ id, channel, occurredAt: at(day) });
const conv: Conversion = {
  id: "c1", convertedAt: at(20), value: 100,
  touchpoints: [tp(1, "paid_social", 10), tp(2, "email", 15), tp(3, "paid_search", 18), tp(4, "direct", 20)],
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("rule-based models", () => {
  const path = pathInWindow(conv, 30);

  it("keeps touches inside the lookback window, oldest first", () => {
    const old = { ...conv, touchpoints: [...conv.touchpoints, tp(0, "video", 1)] };
    expect(pathInWindow(old, 7).map((t) => t.id)).toEqual([2, 3, 4]);
    expect(pathInWindow(old, 30).map((t) => t.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it("gives all credit to the first or last touch", () => {
    expect(ruleWeights(path, "first_touch", conv.convertedAt)).toEqual([1, 0, 0, 0]);
    expect(ruleWeights(path, "last_touch", conv.convertedAt)).toEqual([0, 0, 0, 1]);
  });

  it("skips direct for last non-direct, and credits direct only when nothing else is there", () => {
    expect(ruleWeights(path, "last_non_direct", conv.convertedAt)).toEqual([0, 0, 1, 0]);
    expect(ruleWeights([tp(9, "direct", 19), tp(10, "direct", 20)], "last_non_direct", conv.convertedAt)).toEqual([0, 1]);
  });

  it("splits position-based 40/20/40", () => {
    expect(ruleWeights(path, "position_based", conv.convertedAt)).toEqual([0.4, 0.1, 0.1, 0.4]);
    expect(ruleWeights(path.slice(0, 2), "position_based", conv.convertedAt)).toEqual([0.5, 0.5]);
  });

  it("halves time-decay credit every 7 days", () => {
    const w = ruleWeights([tp(1, "a", 6), tp(2, "b", 13)], "time_decay", at(13));
    expect(w[0] / w[1]).toBeCloseTo(0.5, 10);
  });

  it("sums to 1 for every model", () => {
    for (const m of ["first_touch", "last_touch", "last_non_direct", "linear", "position_based", "time_decay"] as const) {
      expect(sum(ruleWeights(path, m, conv.convertedAt))).toBeCloseTo(1, 10);
    }
  });

  it("uses the playbook lookback windows", () => {
    expect(LOOKBACK_DAYS).toEqual({ b2c: 30, b2b: 90, b2b_enterprise: 180 });
  });
});

describe("summary", () => {
  it("counts revenue once and puts conversions with no touch in unattributed", () => {
    const lonely: Conversion = { id: "c2", convertedAt: at(20), value: 50, touchpoints: [] };
    const credits = attribute([conv, lonely], "linear", 30);
    const rows = summarize([conv, lonely], credits, { paid_search: 10 });
    expect(sum(rows.map((r) => r.revenue))).toBeCloseTo(150, 10);
    expect(rows.find((r) => r.channel === UNATTRIBUTED)?.revenue).toBe(50);
    expect(rows.find((r) => r.channel === "paid_search")?.roas).toBeCloseTo(2.5, 10);
  });

  it("computes the platform claim ratio, and null with no warehouse conversions", () => {
    expect(platformClaimRatio({ meta: 80, google: 70 }, 100)).toBe(1.5);
    expect(platformClaimRatio({ meta: 1 }, 0)).toBeNull();
  });
});

describe("data-driven (Markov removal effect)", () => {
  it("gives no credit to a channel that never leads to a conversion", () => {
    const shares = removalEffectShares([
      { channels: ["search"], converted: true },
      { channels: ["search"], converted: true },
      { channels: ["display"], converted: false },
    ]);
    expect(shares.search).toBeCloseTo(1, 10);
    expect(shares.display).toBe(0);
  });

  it("splits credit equally between 2 channels that always appear together", () => {
    const shares = removalEffectShares([
      { channels: ["social", "search"], converted: true },
      { channels: ["social", "search"], converted: false },
    ]);
    expect(shares.social).toBeCloseTo(0.5, 10);
    expect(shares.search).toBeCloseTo(0.5, 10);
  });

  it("gives each converting path 1 unit of credit", () => {
    const credits = attributeDataDriven([conv], [{ channels: ["email"], converted: false }], 30);
    expect(sum(credits.map((c) => c.credit))).toBeCloseTo(1, 10);
    expect(credits.every((c) => c.model === "data_driven")).toBe(true);
  });
});
