import { describe, expect, it } from "vitest";
import { incrementalLift, isUnderpowered, MIN_TEST_DAYS, minimumDetectableLift, sampleSizePerGroup } from "../src/experiment.js";

describe("test sizing", () => {
  it("round-trips: the sample size for a lift detects that lift", () => {
    const n = sampleSizePerGroup(0.05, 0.1);
    expect(minimumDetectableLift(0.05, n, n)).toBeLessThanOrEqual(0.1);
    expect(minimumDetectableLift(0.05, n - 100, n - 100)).toBeGreaterThan(0.1);
  });

  it("needs about 23,500 people per group to see a 10% lift on a 5% rate", () => {
    expect(sampleSizePerGroup(0.05, 0.1)).toBeGreaterThan(23_000);
    expect(sampleSizePerGroup(0.05, 0.1)).toBeLessThan(24_000);
  });

  it("calls a test underpowered when its MDE is over 2 times the expected lift", () => {
    expect(isUnderpowered(0.21, 0.1)).toBe(true);
    expect(isUnderpowered(0.2, 0.1)).toBe(false);
  });

  it("computes relative lift and refuses a 0 control rate", () => {
    expect(incrementalLift(0.055, 0.05)).toBeCloseTo(0.1, 10);
    expect(() => incrementalLift(0.1, 0)).toThrow();
  });

  it("runs tests at least 21 days", () => expect(MIN_TEST_DAYS).toBe(21));
});
