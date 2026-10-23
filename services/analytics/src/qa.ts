/**
 * Data checks that run before any model or report (docs/playbook.md §7, docs/approval-gates.md "Blocks").
 * Deterministic: the thresholds are rules, not judgement, so they live in code and not in a prompt.
 */

export type CheckStatus = "pass" | "warn" | "block";

export interface QaInput {
  /** Hours since each source table last loaded, at run time. */
  sourceAgeHours: Record<string, number>;
  ordersSource: number;
  ordersWarehouse: number;
  revenueSource: number;
  revenueWarehouse: number;
  /** Platforms with spend in the prior period, and whether each has spend rows now or is flagged paused. */
  platforms: { name: string; spentLastPeriod: boolean; hasSpendNow: boolean; paused: boolean }[];
  /** Share of paid sessions with valid UTM tags, 0..1. */
  utmCoverage: number;
  /** Key events: today and yesterday counts, and whether the change log explains a change. */
  keyEvents: { name: string; today: number; yesterday: number; explained: boolean }[];
  /** Consent rate this week and last week, 0..1 (UK, EU and Quebec only; omit elsewhere). */
  consentRate?: { thisWeek: number; lastWeek: number };
  /** Share of spend with tracked results, 0..1 (KPI tracking_coverage). */
  trackingCoverage: number;
}

export interface Check {
  id: string;
  status: CheckStatus;
  detail: string;
}

export interface QaResult {
  status: CheckStatus;
  score: number;
  checks: Check[];
}

export const QA_LIMITS = {
  freshnessBlockHours: 36,
  matchRatePass: [0.95, 1.02],
  matchRateWarn: [0.9, 1.05],
  revenueGapBlock: 0.05,
  utmWarn: 0.9,
  utmBlock: 0.8,
  eventSwingWarn: 0.4,
  consentShiftWarn: 0.1,
  trackingCoverageBlock: 0.8,
  trackingCoverageTarget: 0.95,
} as const;

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function matchRateStatus(rate: number): CheckStatus {
  const [pLo, pHi] = QA_LIMITS.matchRatePass;
  const [wLo, wHi] = QA_LIMITS.matchRateWarn;
  if (rate >= pLo && rate <= pHi) return "pass";
  if (rate >= wLo && rate <= wHi) return "warn";
  return "block";
}

export function runQa(input: QaInput): QaResult {
  const checks: Check[] = [];

  const stale = Object.entries(input.sourceAgeHours).filter(([, h]) => h > QA_LIMITS.freshnessBlockHours);
  checks.push({
    id: "freshness",
    status: stale.length ? "block" : "pass",
    detail: stale.length ? `stale sources: ${stale.map(([s, h]) => `${s} (${h} h)`).join(", ")}` : "all sources loaded in the last 36 hours",
  });

  if (input.ordersSource <= 0) {
    checks.push({ id: "match_rate", status: input.ordersWarehouse > 0 ? "block" : "pass", detail: "no orders in the source system" });
  } else {
    const rate = input.ordersWarehouse / input.ordersSource;
    checks.push({ id: "match_rate", status: matchRateStatus(rate), detail: `warehouse ÷ source orders = ${pct(rate)}` });
  }

  const gap = input.revenueSource > 0 ? Math.abs(input.revenueWarehouse - input.revenueSource) / input.revenueSource : input.revenueWarehouse > 0 ? 1 : 0;
  checks.push({ id: "revenue_gap", status: gap > QA_LIMITS.revenueGapBlock ? "block" : "pass", detail: `revenue gap ${pct(gap)}` });

  const missing = input.platforms.filter((p) => p.spentLastPeriod && !p.hasSpendNow && !p.paused).map((p) => p.name);
  checks.push({ id: "spend_complete", status: missing.length ? "block" : "pass", detail: missing.length ? `no spend rows: ${missing.join(", ")}` : "spend present for every active platform" });

  const utm = input.utmCoverage;
  checks.push({ id: "utm_coverage", status: utm < QA_LIMITS.utmBlock ? "block" : utm < QA_LIMITS.utmWarn ? "warn" : "pass", detail: `${pct(utm)} of paid sessions tagged` });

  const swings = input.keyEvents.filter((e) => {
    if (e.explained) return false;
    if (e.yesterday === 0) return e.today > 0;
    return Math.abs(e.today - e.yesterday) / e.yesterday > QA_LIMITS.eventSwingWarn;
  });
  checks.push({ id: "event_volume", status: swings.length ? "warn" : "pass", detail: swings.length ? `unexplained swing: ${swings.map((e) => e.name).join(", ")}` : "no unexplained swing" });

  if (input.consentRate) {
    const shift = Math.abs(input.consentRate.thisWeek - input.consentRate.lastWeek);
    checks.push({ id: "consent_shift", status: shift >= QA_LIMITS.consentShiftWarn - 1e-9 ? "warn" : "pass", detail: `consent rate moved ${(shift * 100).toFixed(1)} points` });
  }

  const cov = input.trackingCoverage;
  checks.push({ id: "tracking_coverage", status: cov < QA_LIMITS.trackingCoverageBlock ? "block" : cov < QA_LIMITS.trackingCoverageTarget ? "warn" : "pass", detail: `${pct(cov)} of spend tracked` });

  const warns = checks.filter((c) => c.status === "warn").length;
  const blocks = checks.filter((c) => c.status === "block").length;
  return {
    status: blocks ? "block" : warns ? "warn" : "pass",
    score: Math.max(0, 100 - 15 * warns - 40 * blocks),
    checks,
  };
}
