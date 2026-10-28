/** Creative test statistics: Beta-Binomial with a Beta(1,1) prior, exact closed form (no sampling). */

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012,
  9.984369578019572e-6, 1.5056327351493116e-7,
];

/** ln Γ(x) for x > 0 (Lanczos, g = 7). */
export function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = 0.9999999999998099;
  const t = x + 7.5;
  for (let i = 0; i < LANCZOS.length; i++) a += LANCZOS[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

const lbeta = (a: number, b: number) => lgamma(a) + lgamma(b) - lgamma(a + b);

export interface Arm {
  /** Trials: impressions (the test card measures conversions per impression). */
  trials: number;
  conversions: number;
  spend: number;
}

/**
 * P(rate of B > rate of A) with posteriors Beta(1 + conv, 1 + trials − conv).
 * Exact sum over the integer shape of B: Σ_{i<αB} B(αA+i, βA+βB) / ((βB+i) B(1+i, βB) B(αA, βA)).
 */
export function probBBeatsA(a: Arm, b: Arm): number {
  for (const arm of [a, b]) {
    if (!Number.isInteger(arm.trials) || !Number.isInteger(arm.conversions) || arm.conversions < 0 || arm.conversions > arm.trials) {
      throw new RangeError("trials and conversions must be integers with 0 ≤ conversions ≤ trials");
    }
  }
  const aA = 1 + a.conversions;
  const bA = 1 + a.trials - a.conversions;
  const aB = 1 + b.conversions;
  const bB = 1 + b.trials - b.conversions;
  let total = 0;
  for (let i = 0; i < aB; i++) {
    total += Math.exp(lbeta(aA + i, bA + bB) - Math.log(bB + i) - lbeta(1 + i, bB) - lbeta(aA, bA));
  }
  return Math.min(1, Math.max(0, total));
}

export type Verdict = "win" | "lose" | "no_result";

export interface VerdictInput {
  control: Arm;
  variant: Arm;
  target_cpa: number;
  days_running: number;
}

export interface VerdictResult {
  verdict: Verdict;
  p_beat_control: number;
  reason: string;
}

/**
 * Verdict for 1 variant against the control (docs/templates/creative-test-card.md).
 * Minimum data: variant spend ≥ 2 × target CPA and ≥ 7 days. Then win when P(beat) ≥ 0.90, or with ≥ 30 conversions and a CPA ≥ 15% better.
 * Lose when P(beat) ≤ 0.10 after the minimum data, or at once on the kill rule (0 conversions after 3 × target CPA).
 */
export function testVerdict(v: VerdictInput): VerdictResult {
  const p = probBBeatsA(v.control, v.variant);
  if (v.variant.conversions === 0 && v.variant.spend >= 3 * v.target_cpa) return { verdict: "lose", p_beat_control: p, reason: "kill rule" };
  if (v.variant.spend < 2 * v.target_cpa || v.days_running < 7) return { verdict: "no_result", p_beat_control: p, reason: "minimum data not reached" };
  if (p >= 0.9) return { verdict: "win", p_beat_control: p, reason: "P(beat control) ≥ 0.90" };
  const cpa = (arm: Arm) => (arm.conversions > 0 ? arm.spend / arm.conversions : Infinity);
  if (v.variant.conversions >= 30 && cpa(v.variant) <= 0.85 * cpa(v.control)) return { verdict: "win", p_beat_control: p, reason: "≥ 30 conversions and CPA ≥ 15% better" };
  if (p <= 0.1) return { verdict: "lose", p_beat_control: p, reason: "P(beat control) ≤ 0.10" };
  return { verdict: "no_result", p_beat_control: p, reason: "no clear difference" };
}
