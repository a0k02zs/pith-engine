import { describe, expect, it } from "vitest";
import { maxConfidence, priority, schedule } from "../src/planning.js";

describe("priority", () => {
  it("is impact x confidence / effort", () => {
    expect(priority(5, 4, 2)).toBe(10);
    expect(priority(3, 3, 3)).toBe(3);
    expect(priority(2, 1, 3)).toBe(0.67);
  });

  it("rejects scores outside 1 to 5", () => {
    expect(() => priority(6 as never, 1, 1)).toThrow(RangeError);
    expect(() => priority(1, 1, 0 as never)).toThrow(RangeError);
  });
});

describe("maxConfidence", () => {
  it("allows 4 or 5 only with 2 evidence types or a past win", () => {
    expect(maxConfidence(["analytics", "survey"], false)).toBe(5);
    expect(maxConfidence(["analytics", "analytics"], false)).toBe(3);
    expect(maxConfidence([], true)).toBe(5);
    expect(maxConfidence([], false)).toBe(1);
  });
});

describe("schedule", () => {
  const base = { baseline: 0.1, mde: 0.2, dailyVisitors: 1000 };

  it("starts on the earliest date when no event is near", () => {
    const s = schedule({ ...base, markets: ["GB"], earliestStart: "2027-01-11" });
    expect(s.design).toBe("ab");
    expect(s.start).toBe("2027-01-11");
    expect(s.end).toBe("2027-01-24");
    expect(s.avoided).toEqual([]);
  });

  it("moves the start past Black Friday and Christmas in the UK", () => {
    const s = schedule({ ...base, dailyVisitors: 500, markets: ["GB"], earliestStart: "2026-11-16" });
    expect(s.avoided.map((b) => b.name)).toEqual(["Black Friday to Cyber Monday", "Christmas to Boxing Day"]);
    expect(s.start).toBe("2026-12-27");
  });

  it("does not run a GCC test across Ramadan", () => {
    const s = schedule({ ...base, markets: ["AE"], earliestStart: "2027-02-01" });
    expect(s.avoided.some((b) => b.name.startsWith("Ramadan"))).toBe(true);
    expect(s.start! > "2027-03-12").toBe(true);
  });

  it("avoids events in every target market", () => {
    const one = schedule({ ...base, markets: ["US"], earliestStart: "2026-12-01" });
    const two = schedule({ ...base, markets: ["US", "AE"], earliestStart: "2026-12-01" });
    expect(two.start! > one.start!).toBe(true);
  });

  it("hands a low-traffic test to the fallback rule", () => {
    const s = schedule({ baseline: 0.04, mde: 0.1, dailyVisitors: 300, markets: ["GB"], earliestStart: "2027-01-11" });
    expect(s.design).toBe("not_testable");
    expect(s.fallback).toBe("bolder_change");
    expect(s.start).toBeNull();
  });

  it("marks a 3-arm plan as A/B/n", () => {
    expect(schedule({ ...base, arms: 3, markets: ["GB"], earliestStart: "2027-01-11" }).design).toBe("abn");
  });
});
