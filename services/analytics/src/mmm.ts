/**
 * Marketing mix model checks (docs/playbook.md §4, config/meridian-config.yaml).
 * The fit itself runs in a Python job (Google Meridian). These checks decide whether to fit, whether
 * to trust the fit, and whether a budget scenario stays inside the limits a person agreed to.
 */

export interface ChannelSeries {
  channel: string;
  /** Weekly spend, oldest first. */
  weeklySpend: number[];
}

export interface ReadinessInput {
  weeks: number;
  channels: ChannelSeries[];
  /** Markets whose holiday weeks are marked. */
  holidaysMarkedFor: string[];
  markets: string[];
}

export interface Readiness {
  ready: boolean;
  lowData: boolean;
  modelled: string[];
  dropped: { channel: string; reason: string }[];
  problems: string[];
}

export const MMM_LIMITS = {
  minWeeks: 104,
  minWeeksLowData: 78,
  minActiveShare: 0.5,
  minSpendCv: 0.2,
  weeksPerChannel: 10,
  maxRhat: 1.1,
  maxHoldoutMape: 0.15,
  targetHoldoutMape: 0.1,
  baselineShare: [0.2, 0.95],
  maxChannelChangePerQuarter: 0.25,
} as const;

export function coefficientOfVariation(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (mean === 0) return 0;
  const variance = xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance) / mean;
}

export function checkReadiness(input: ReadinessInput): Readiness {
  const problems: string[] = [];
  const dropped: { channel: string; reason: string }[] = [];
  if (input.weeks < MMM_LIMITS.minWeeksLowData) problems.push(`only ${input.weeks} weeks of data; need ${MMM_LIMITS.minWeeksLowData} or more`);
  const lowData = input.weeks >= MMM_LIMITS.minWeeksLowData && input.weeks < MMM_LIMITS.minWeeks;

  const modelled: string[] = [];
  for (const c of input.channels) {
    const active = c.weeklySpend.filter((x) => x > 0).length / Math.max(1, c.weeklySpend.length);
    if (active < MMM_LIMITS.minActiveShare) { dropped.push({ channel: c.channel, reason: "spend in under 50% of weeks" }); continue; }
    if (coefficientOfVariation(c.weeklySpend) <= MMM_LIMITS.minSpendCv) { dropped.push({ channel: c.channel, reason: "spend does not vary enough" }); continue; }
    modelled.push(c.channel);
  }
  const maxChannels = Math.floor(input.weeks / MMM_LIMITS.weeksPerChannel);
  if (modelled.length > maxChannels) problems.push(`${modelled.length} channels for ${input.weeks} weeks; merge to ${maxChannels} or fewer`);
  if (modelled.length === 0) problems.push("no channel can be modelled");

  const unmarked = input.markets.filter((m) => !input.holidaysMarkedFor.includes(m));
  if (unmarked.length) problems.push(`holidays not marked for: ${unmarked.join(", ")}`);

  return { ready: problems.length === 0, lowData, modelled, dropped, problems };
}

export interface ChannelFit {
  channel: string;
  roiMedian: number;
  roiCi90: [number, number];
  /** Lift test result for this channel, if any: true if the test found a positive effect. */
  testPositive?: boolean;
}

export interface FitSummary {
  maxRhat: number;
  holdoutMape: number;
  baselineShare: number;
  channels: ChannelFit[];
}

export function checkFit(fit: FitSummary): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (fit.maxRhat > MMM_LIMITS.maxRhat) failures.push(`R-hat ${fit.maxRhat} over ${MMM_LIMITS.maxRhat}: the sampler did not converge`);
  if (fit.holdoutMape > MMM_LIMITS.maxHoldoutMape) failures.push(`holdout MAPE ${(fit.holdoutMape * 100).toFixed(1)}% over 15%`);
  const [lo, hi] = MMM_LIMITS.baselineShare;
  if (fit.baselineShare < lo || fit.baselineShare > hi) failures.push(`baseline share ${(fit.baselineShare * 100).toFixed(0)}% outside 20% to 95%`);
  for (const c of fit.channels) {
    if (c.testPositive === undefined) continue;
    const modelPositive = c.roiCi90[0] > 0;
    const modelNegative = c.roiCi90[1] <= 0;
    if ((c.testPositive && modelNegative) || (!c.testPositive && modelPositive)) {
      failures.push(`${c.channel}: model ROI disagrees in direction with the lift test`);
    }
  }
  return { pass: failures.length === 0, failures };
}

/** Channels whose budget a scenario moves by more than 25% in 1 quarter. Such a move needs a test first. */
export function scenarioViolations(current: Record<string, number>, proposed: Record<string, number>): string[] {
  const out: string[] = [];
  for (const ch of new Set([...Object.keys(current), ...Object.keys(proposed)])) {
    const a = current[ch] ?? 0;
    const b = proposed[ch] ?? 0;
    if (a === 0 ? b > 0 : Math.abs(b - a) / a > MMM_LIMITS.maxChannelChangePerQuarter + 1e-9) out.push(ch);
  }
  return out.sort();
}
