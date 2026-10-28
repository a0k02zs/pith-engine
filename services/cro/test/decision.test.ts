import { describe, expect, it } from "vitest";
import { dailyCheck, decide, guardrailStatus } from "../src/decision.js";

const control = { n: 10_000, x: 400 };
const winner = { name: "B", n: 10_000, x: 480 };
const flat = { name: "B", n: 10_000, x: 405 };
const loser = { name: "B", n: 10_000, x: 320 };

describe("guardrailStatus", () => {
  it("reads a fall in a higher-is-better metric as harm", () => {
    const g = guardrailStatus({ metric: "cro.sql_rate", control: { n: 10_000, x: 1_000 }, variants: [{ name: "B", n: 10_000, x: 850 }], higherIsBetter: true });
    expect(g[0].status).toBe("harmed");
  });

  it("reads a rise in refunds as harm", () => {
    const g = guardrailStatus({ metric: "refund_rate", control: { n: 5_000, x: 100 }, variants: [{ name: "B", n: 5_000, x: 170 }], higherIsBetter: false });
    expect(g[0].status).toBe("harmed");
  });

  it("uses p < 0.01, so a small change is ok", () => {
    const g = guardrailStatus({ metric: "cro.sql_rate", control: { n: 10_000, x: 1_000 }, variants: [{ name: "B", n: 10_000, x: 950 }], higherIsBetter: true });
    expect(g[0].status).toBe("ok");
  });
});

describe("dailyCheck", () => {
  it("lets a healthy test run", () => {
    const r = dailyCheck({ arms: [5_000, 5_020], guardrails: [], errorRates: [0.002, 0.003] });
    expect(r.stop).toBe(false);
    expect(r.reasons).toEqual([]);
  });

  it("stops on SRM, a harmed guardrail and page errors", () => {
    const r = dailyCheck({
      arms: [5_000, 5_600],
      guardrails: [{ metric: "refund_rate", control: { n: 5_000, x: 100 }, variants: [{ name: "B", n: 5_000, x: 170 }], higherIsBetter: false }],
      errorRates: [0.002, 0.004],
    });
    expect(r.stop).toBe(true);
    expect(r.reasons).toEqual(["srm", "guardrail", "errors"]);
  });
});

describe("decide", () => {
  it("ships a clean winner", () => {
    const r = decide({ control, variants: [winner], plannedSamplePerArm: 10_000 });
    expect(r.decision).toBe("ship");
    expect(r.winner).toBe("B");
    expect(r.reason).toContain("20.0%");
  });

  it("does not read the result before the planned sample", () => {
    expect(decide({ control, variants: [winner], plannedSamplePerArm: 12_000 }).decision).toBe("not_ready");
  });

  it("calls the test invalid on SRM or broken tracking", () => {
    expect(decide({ control, variants: [{ ...winner, n: 10_800 }], plannedSamplePerArm: 10_000 }).decision).toBe("invalid");
    expect(decide({ control, variants: [winner], plannedSamplePerArm: 10_000, trackingOk: false }).decision).toBe("invalid");
  });

  it("holds a winner that harms a guardrail", () => {
    const r = decide({
      control,
      variants: [winner],
      plannedSamplePerArm: 10_000,
      guardrails: [{ metric: "cro.sql_rate", control: { n: 400, x: 200 }, variants: [{ name: "B", n: 480, x: 170 }], higherIsBetter: true }],
    });
    expect(r.decision).toBe("hold");
    expect(r.winner).toBeNull();
  });

  it("rejects a loser and keeps the control on no difference", () => {
    expect(decide({ control, variants: [loser], plannedSamplePerArm: 10_000 }).decision).toBe("reject");
    expect(decide({ control, variants: [flat], plannedSamplePerArm: 10_000 }).decision).toBe("inconclusive");
  });

  it("picks the best clean variant in an A/B/n test", () => {
    const r = decide({ control, variants: [{ name: "B", n: 10_000, x: 470 }, { name: "C", n: 10_000, x: 520 }], plannedSamplePerArm: 10_000 });
    expect(r.decision).toBe("ship");
    expect(r.winner).toBe("C");
  });
});
