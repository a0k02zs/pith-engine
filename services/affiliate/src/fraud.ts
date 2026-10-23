import { programmeRules } from "./config.js";

export interface Conversion {
  conversion_id: string;
  partner_id: string;
  amount: number;
  currency: string;
  /** Commission value in the reporting currency (GBP), for the person-review threshold. */
  amount_gbp: number;
  seconds_from_click: number | null;
  ip_conversions_same_day: number;
  /** Buyer identifiers matched to the partner's own (email, card, address or device). */
  self_referral_match: boolean;
  /** Click with no recorded page view, or from a hidden frame. */
  cookie_stuffing: boolean;
  /** Code used on a site that is not the partner of record. */
  coupon_leak: boolean;
  returned_in_lock_period: boolean;
  partner_age_days: number;
}

export type FraudDecision = "approve" | "hold" | "reverse";

export interface FraudResult {
  conversion_id: string;
  partner_id: string;
  decision: FraudDecision;
  rules: string[];
  amount: number;
  currency: string;
  amount_gbp: number;
  needs_person: boolean;
}

/**
 * Deterministic fraud rules (playbook §8). The Fraud Monitor agent explains, this function decides.
 * "Reverse" only for the rules that say reverse. A reversal over the threshold still needs a person.
 */
export function assessConversion(c: Conversion, partnerMedianCvr: number, partnerCvr: number): FraudResult {
  const f = programmeRules.fraud;
  const reverse: string[] = [];
  const hold: string[] = [];
  if (c.self_referral_match) reverse.push("self_referral");
  if (c.cookie_stuffing) reverse.push("cookie_stuffing");
  if (c.returned_in_lock_period) reverse.push("returned_in_lock_period");
  if (c.seconds_from_click !== null && c.seconds_from_click < f.min_seconds_click_to_conversion) hold.push("fast_conversion");
  if (c.ip_conversions_same_day > f.max_conversions_per_ip_per_day) hold.push("many_from_one_ip");
  if (c.coupon_leak) hold.push("coupon_leak");
  if (c.partner_age_days <= f.new_partner_days && partnerMedianCvr > 0 && partnerCvr > partnerMedianCvr * f.new_partner_cvr_multiple_of_median) {
    hold.push("new_partner_high_cvr");
  }
  const decision: FraudDecision = reverse.length ? "reverse" : hold.length ? "hold" : "approve";
  const needs_person = decision === "hold" || (decision === "reverse" && c.amount_gbp > f.person_review_over_gbp);
  return {
    conversion_id: c.conversion_id, partner_id: c.partner_id, decision, rules: [...reverse, ...hold],
    amount: c.amount, currency: c.currency, amount_gbp: c.amount_gbp, needs_person,
  };
}

/** Partners with enough holds in the last 7 days to go to a person (the agent never removes a partner). */
export function partnersForReview(holds: { partner_id: string; at: string }[], now: Date): string[] {
  const since = now.getTime() - 7 * 86_400_000;
  const counts = new Map<string, number>();
  for (const h of holds) if (new Date(h.at).getTime() >= since) counts.set(h.partner_id, (counts.get(h.partner_id) ?? 0) + 1);
  return [...counts].filter(([, n]) => n >= programmeRules.fraud.partner_review_after_holds_in_7_days).map(([id]) => id).sort();
}

/** fraud_rate KPI: value reversed for fraud ÷ value of all conversions. Returns and cancellations are not fraud. */
export function fraudRate(results: FraudResult[]): number {
  const total = results.reduce((s, r) => s + r.amount_gbp, 0);
  const fraud = results
    .filter((r) => r.decision === "reverse" && r.rules.some((x) => x === "self_referral" || x === "cookie_stuffing"))
    .reduce((s, r) => s + r.amount_gbp, 0);
  return total > 0 ? fraud / total : 0;
}
