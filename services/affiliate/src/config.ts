import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type ProgrammeType =
  | "affiliate_physical" | "affiliate_digital" | "affiliate_recurring" | "coupon_cashback" | "agency_referral" | "reseller";

export interface CommissionRange {
  model: "cpa_percent" | "recurring_percent" | "revenue_share";
  min: number;
  max: number;
  max_recurring_months?: number;
  cookie_days: number;
  lock_days: [number, number];
}

export interface ProgrammeRules {
  reporting_currency: string;
  commission_ranges: Record<ProgrammeType, CommissionRange>;
  fix_first: { min_gross_margin: number; requires_checkout_tracking: boolean };
  budget_cap_buffer: number;
  activation_plan: { day: number; action: string; if?: string }[];
  scorecard: {
    weights: Record<ScoreItem, number>;
    approve_at: number;
    review_at: number;
    reject_if_brand_safety_at_or_below: number;
  };
  fraud: {
    min_seconds_click_to_conversion: number;
    max_conversions_per_ip_per_day: number;
    new_partner_days: number;
    new_partner_cvr_multiple_of_median: number;
    partner_review_after_holds_in_7_days: number;
    person_review_over_gbp: number;
  };
  payout: { min_payout_gbp: number; require_tax_form: boolean; require_payout_method: boolean };
}

export type ScoreItem = "audience_fit" | "content_fit" | "reach" | "quality" | "incrementality" | "brand_safety";

export const programmeRules = JSON.parse(readFileSync(dir("config", "programme-rules.json"), "utf8")) as ProgrammeRules;
