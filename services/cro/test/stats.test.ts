import { describe, expect, it } from "vitest";
import { chiSquareP, compare, normCdf, normInv, plan, srm } from "../src/stats.js";

describe("normal distribution", () => {
  it("matches table values", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 7);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 4);
    expect(normInv(0.975)).toBeCloseTo(1.959964, 5);
    expect(normInv(0.8)).toBeCloseTo(0.841621, 5);
    expect(normInv(0.001)).toBeCloseTo(-3.090232, 5);
  });

  it("rejects p outside (0, 1)", () => {
    expect(() => normInv(0)).toThrow(RangeError);
    expect(() => normInv(1)).toThrow(RangeError);
  });

  it("gives chi-square p-values from the table", () => {
    expect(chiSquareP(3.841, 1)).toBeCloseTo(0.05, 3);
    expect(chiSquareP(10.828, 1)).toBeCloseTo(0.001, 4);
    expect(chiSquareP(5.991, 2)).toBeCloseTo(0.05, 3);
  });
});

describe("plan", () => {
  it("needs 39,473 per arm for a 4% baseline and a 10% lift", () => {
    const p = plan({ baseline: 0.04, mde: 0.1, dailyVisitors: 2000 });
    expect(p.sample_per_arm).toBe(39473);
    expect(p.days_for_sample).toBe(40);
    expect(p.days).toBe(42);
    expect(p.testable).toBe(true);
  });

  it("needs 3,839 per arm from 10% to 12%", () => {
    expect(plan({ baseline: 0.1, mde: 0.2, dailyVisitors: 1000 }).sample_per_arm).toBe(3839);
  });

  it("runs at least 14 days and in full weeks", () => {
    const p = plan({ baseline: 0.1, mde: 0.2, dailyVisitors: 100_000 });
    expect(p.days).toBe(14);
    expect(plan({ baseline: 0.1, mde: 0.2, dailyVisitors: 500 }).days).toBe(21);
  });

  it("is not testable when the sample needs more than 42 days", () => {
    const p = plan({ baseline: 0.04, mde: 0.1, dailyVisitors: 1000 });
    expect(p.testable).toBe(false);
    expect(p.days).toBeNull();
  });

  it("splits alpha across variants (Bonferroni)", () => {
    const two = plan({ baseline: 0.1, mde: 0.2, dailyVisitors: 1000 });
    const three = plan({ baseline: 0.1, mde: 0.2, dailyVisitors: 1000, arms: 3 });
    expect(three.alpha_per_comparison).toBe(0.025);
    expect(three.sample_per_arm).toBeGreaterThan(two.sample_per_arm);
    expect(three.total_sample).toBe(three.sample_per_arm * 3);
  });

  it("rejects bad input", () => {
    expect(() => plan({ baseline: 0, mde: 0.1, dailyVisitors: 1 })).toThrow(RangeError);
    expect(() => plan({ baseline: 0.6, mde: 1, dailyVisitors: 1 })).toThrow(RangeError);
    expect(() => plan({ baseline: 0.1, mde: 0.1, dailyVisitors: 0 })).toThrow(RangeError);
    expect(() => plan({ baseline: 0.1, mde: 0.1, dailyVisitors: 1, arms: 1 })).toThrow(RangeError);
  });
});

describe("srm", () => {
  it("finds no mismatch on an even split", () => {
    const r = srm([10_000, 10_050]);
    expect(r.srm_detected).toBe(false);
    expect(r.df).toBe(1);
  });

  it("finds a mismatch below p = 0.001", () => {
    const r = srm([10_000, 10_600]);
    expect(r.p_value).toBeLessThan(0.001);
    expect(r.srm_detected).toBe(true);
  });

  it("uses the planned weights", () => {
    expect(srm([9_000, 1_000], [9, 1]).srm_detected).toBe(false);
    expect(srm([9_000, 1_000]).srm_detected).toBe(true);
  });

  it("rejects bad input", () => {
    expect(() => srm([1])).toThrow(RangeError);
    expect(() => srm([1, 2], [1])).toThrow(RangeError);
  });
});

describe("compare", () => {
  it("finds a significant lift with its interval", () => {
    const [c] = compare({ n: 10_000, x: 400 }, [{ name: "B", n: 10_000, x: 480 }]);
    expect(c.name).toBe("B");
    expect(c.lift_relative).toBe(0.2);
    expect(c.z).toBeCloseTo(2.7582, 3);
    expect(c.p_value).toBeCloseTo(0.00581, 4);
    expect(c.significant).toBe(true);
    expect(c.direction).toBe("better");
    expect(c.ci_relative[0]).toBeGreaterThan(0);
    expect(c.ci_relative[0]).toBeLessThan(0.2);
    expect(c.ci_relative[1]).toBeGreaterThan(0.2);
  });

  it("finds no difference on equal rates", () => {
    const [c] = compare({ n: 5_000, x: 200 }, [{ n: 5_000, x: 200 }]);
    expect(c.p_value).toBeCloseTo(1, 6);
    expect(c.direction).toBe("none");
  });

  it("corrects alpha for many variants", () => {
    // p is about 0.04: significant with 1 variant, not with 2 (alpha 0.025 each).
    const control = { n: 10_000, x: 400 };
    const v = { name: "B", n: 10_000, x: 460 };
    expect(compare(control, [v])[0].significant).toBe(true);
    expect(compare(control, [v, { name: "C", n: 10_000, x: 400 }])[0].significant).toBe(false);
  });

  it("rejects bad arms", () => {
    expect(() => compare({ n: 0, x: 0 }, [{ n: 1, x: 0 }])).toThrow(RangeError);
    expect(() => compare({ n: 10, x: 11 }, [{ n: 10, x: 1 }])).toThrow(RangeError);
    expect(() => compare({ n: 10, x: 1 }, [])).toThrow(RangeError);
  });
});
