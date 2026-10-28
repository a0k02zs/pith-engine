import { programmeRules, type ProgrammeType } from "./config.js";

export interface Economics {
  /** Average order value, or first-year contract value for B2B, in the reporting currency. */
  aov: number;
  /** 0 to 1. */
  gross_margin: number;
  /** Profit the client must keep on each partner order. */
  target_contribution: number;
  /** Network or platform fee per order. */
  network_fee: number;
  /** Share of commission that is later reversed (returns, cancellations, fraud), 0 to 1. */
  reversal_rate: number;
}

/**
 * Highest commission per order that still leaves the target contribution (playbook §3).
 * Reversed commission is a cost too, so the room is divided by (1 + reversal rate).
 */
export function maxCommission(e: Economics): { amount: number; rate: number } {
  const room = e.aov * e.gross_margin - e.target_contribution - e.network_fee;
  const amount = room / (1 + e.reversal_rate);
  return { amount, rate: e.aov > 0 ? amount / e.aov : 0 };
}

export type CommissionVerdict =
  | { verdict: "fits"; headroom: number }
  | { verdict: "over_max"; over_by: number }
  | { verdict: "outside_range"; range: [number, number] }
  | { verdict: "fix_first"; reasons: string[] };

/** Checks a proposed commission rate against the client's numbers and the playbook range for the programme type. */
export function checkCommission(
  type: ProgrammeType,
  proposedRate: number,
  e: Economics,
  opts: { checkoutTracking: boolean },
): CommissionVerdict {
  const reasons: string[] = [];
  const ff = programmeRules.fix_first;
  if (e.gross_margin < ff.min_gross_margin) reasons.push(`gross margin under ${ff.min_gross_margin * 100}%`);
  if (ff.requires_checkout_tracking && !opts.checkoutTracking) reasons.push("no checkout tracking");
  const max = maxCommission(e);
  if (max.amount <= 0) reasons.push("no room for commission after contribution and fees");
  if (reasons.length) return { verdict: "fix_first", reasons };

  const proposed = e.aov * proposedRate;
  if (proposed > max.amount) return { verdict: "over_max", over_by: proposed - max.amount };
  const range = programmeRules.commission_ranges[type];
  if (proposedRate < range.min || proposedRate > range.max) return { verdict: "outside_range", range: [range.min, range.max] };
  return { verdict: "fits", headroom: max.amount - proposed };
}

/** Monthly budget cap: forecast partner revenue × commission rate × buffer, plus fixed fees. */
export function monthlyBudgetCap(forecastRevenue: number, commissionRate: number, fixedFees: number): number {
  return forecastRevenue * commissionRate * programmeRules.budget_cap_buffer + fixedFees;
}
