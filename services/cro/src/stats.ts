/**
 * A/B test statistics for the CRO service (docs/01-playbook.md section 5).
 * No dependencies. Every number an agent reports about a test comes from here, never from the model.
 */

export const DEFAULTS = { alpha: 0.05, power: 0.8, minDays: 14, maxDays: 42, srmAlpha: 0.001 } as const;

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error under 1.5e-7). */
export function normCdf(z: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const y = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Inverse standard normal CDF (Acklam, relative error under 1.2e-9). */
export function normInv(p: number): number {
  if (!(p > 0 && p < 1)) throw new RangeError("normInv: p must be in (0, 1)");
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const tail = (q: number) =>
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  if (p < 0.02425) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - 0.02425) return -tail(Math.sqrt(-2 * Math.log(1 - p)));
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function lnGamma(x: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const v of g) ser += v / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Upper regularized incomplete gamma Q(a, x). */
function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const front = Math.exp(-x + a * Math.log(x) - lnGamma(a));
  if (x < a + 1) {
    let ap = a;
    let del = 1 / a;
    let sum = del;
    for (let i = 0; i < 1000 && Math.abs(del) >= Math.abs(sum) * 1e-15; i++) {
      ap += 1;
      del *= x / ap;
      sum += del;
    }
    return 1 - sum * front;
  }
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return front * h;
}

export const chiSquareP = (stat: number, df: number) => gammaQ(df / 2, stat / 2);

const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

export interface PlanInput {
  /** Baseline rate of the primary metric, between 0 and 1. */
  baseline: number;
  /** Minimum detectable effect as a relative lift, for example 0.10. */
  mde: number;
  /** Eligible visitors per day across all arms. */
  dailyVisitors: number;
  arms?: number;
  alpha?: number;
  power?: number;
  minDays?: number;
  maxDays?: number;
}

export interface Plan {
  sample_per_arm: number;
  total_sample: number;
  arms: number;
  alpha_per_comparison: number;
  power: number;
  baseline: number;
  target_rate: number;
  mde_relative: number;
  days_for_sample: number;
  /** Planned run time in full weeks; null when the test is not testable. */
  days: number | null;
  testable: boolean;
}

/**
 * Sample size per arm for a 2-sided test of 2 proportions (unpooled variance).
 * With more than 2 arms, alpha is split across the variant-against-control comparisons (Bonferroni).
 */
export function plan(input: PlanInput): Plan {
  const { baseline, mde, dailyVisitors } = input;
  const arms = input.arms ?? 2;
  const alpha = input.alpha ?? DEFAULTS.alpha;
  const power = input.power ?? DEFAULTS.power;
  const minDays = input.minDays ?? DEFAULTS.minDays;
  const maxDays = input.maxDays ?? DEFAULTS.maxDays;
  if (!(baseline > 0 && baseline < 1)) throw new RangeError("baseline must be a rate between 0 and 1");
  if (!(mde > 0)) throw new RangeError("mde must be a positive relative lift");
  if (!(dailyVisitors > 0)) throw new RangeError("dailyVisitors must be above 0");
  if (!Number.isInteger(arms) || arms < 2) throw new RangeError("arms must be an integer of 2 or more");
  const p1 = baseline;
  const p2 = baseline * (1 + mde);
  if (p2 >= 1) throw new RangeError("baseline x (1 + mde) must be below 1");
  const a = alpha / (arms - 1);
  const z = normInv(1 - a / 2) + normInv(power);
  const n = Math.ceil((z * z * (p1 * (1 - p1) + p2 * (1 - p2))) / (p2 - p1) ** 2);
  const daysForSample = Math.ceil((n * arms) / dailyVisitors);
  const testable = daysForSample <= maxDays;
  return {
    sample_per_arm: n,
    total_sample: n * arms,
    arms,
    alpha_per_comparison: round(a, 4),
    power,
    baseline: p1,
    target_rate: round(p2, 6),
    mde_relative: mde,
    days_for_sample: daysForSample,
    // Full weeks, so every weekday and weekend day appears equally often.
    days: testable ? Math.max(minDays, Math.ceil(daysForSample / 7) * 7) : null,
    testable,
  };
}

export interface SrmResult {
  chi_square: number;
  df: number;
  p_value: number;
  srm_detected: boolean;
  threshold: number;
}

/** Sample ratio mismatch: chi-square goodness of fit of the arm counts against the planned split. */
export function srm(observed: number[], weights?: number[], threshold: number = DEFAULTS.srmAlpha): SrmResult {
  if (observed.length < 2) throw new RangeError("srm needs 2 or more arms");
  const w = weights ?? observed.map(() => 1);
  if (w.length !== observed.length) throw new RangeError("weights and observed must have the same length");
  const total = observed.reduce((s, v) => s + v, 0);
  const wsum = w.reduce((s, v) => s + v, 0);
  let stat = 0;
  observed.forEach((o, i) => {
    const e = (total * w[i]) / wsum;
    stat += (o - e) ** 2 / e;
  });
  const p = chiSquareP(stat, observed.length - 1);
  return { chi_square: round(stat, 4), df: observed.length - 1, p_value: p, srm_detected: p < threshold, threshold };
}

export interface Arm {
  name?: string;
  /** Visitors in the arm. */
  n: number;
  /** Visitors who converted. */
  x: number;
}

export interface Comparison {
  name: string;
  rate: number;
  control_rate: number;
  diff_abs: number;
  ci_abs: [number, number];
  lift_relative: number;
  ci_relative: [number, number];
  z: number;
  p_value: number;
  significant: boolean;
  direction: "better" | "worse" | "none";
}

/**
 * 2-proportion z-test of each variant against the control.
 * The relative-lift interval uses the log of the rate ratio (delta method).
 */
export function compare(control: Arm, variants: Arm[], alpha: number = DEFAULTS.alpha): Comparison[] {
  if (variants.length === 0) throw new RangeError("compare needs 1 or more variants");
  for (const arm of [control, ...variants]) {
    if (!(arm.n > 0) || arm.x < 0 || arm.x > arm.n) throw new RangeError("each arm needs n > 0 and 0 <= x <= n");
  }
  const a = alpha / variants.length;
  const zCrit = normInv(1 - a / 2);
  const pc = control.x / control.n;
  return variants.map((v, i) => {
    const pv = v.x / v.n;
    const pooled = (control.x + v.x) / (control.n + v.n);
    const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / control.n + 1 / v.n));
    const z = sePooled === 0 ? 0 : (pv - pc) / sePooled;
    const p = 2 * (1 - normCdf(Math.abs(z)));
    const seDiff = Math.sqrt((pc * (1 - pc)) / control.n + (pv * (1 - pv)) / v.n);
    const ratioDefined = pc > 0 && pv > 0;
    const seLog = ratioDefined ? Math.sqrt((1 - pc) / (pc * control.n) + (1 - pv) / (pv * v.n)) : NaN;
    const lr = ratioDefined ? Math.log(pv / pc) : NaN;
    const significant = p < a;
    return {
      name: v.name ?? String.fromCharCode(66 + i),
      rate: round(pv, 6),
      control_rate: round(pc, 6),
      diff_abs: round(pv - pc, 6),
      ci_abs: [round(pv - pc - zCrit * seDiff, 6), round(pv - pc + zCrit * seDiff, 6)],
      lift_relative: pc > 0 ? round(pv / pc - 1, 4) : NaN,
      ci_relative: [round(Math.exp(lr - zCrit * seLog) - 1, 4), round(Math.exp(lr + zCrit * seLog) - 1, 4)],
      z: round(z, 4),
      p_value: p,
      significant,
      direction: !significant ? "none" : pv > pc ? "better" : "worse",
    };
  });
}
