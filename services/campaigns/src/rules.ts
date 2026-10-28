import { readFileSync } from "node:fs";
import { dir } from "./paths.js";
import { LAUNCH_ORDER, marketGroup, marketRules, type Weekday } from "./market-rules.js";

export type Audience = "b2b" | "b2c";
export type CampaignType = "product_launch" | "seasonal_push" | "demand_generation" | "event_led" | "brand_awareness" | "market_entry";

interface Playbook {
  campaign_types: Record<CampaignType, { weeks: [number, number]; audiences: Audience[]; split: Record<string, number> }>;
  budget: {
    proven_promising_test: [number, number, number];
    test_reserve_share: number;
    test_reserve_days: number;
    min_channel_share: number;
    min_expected_conversions_per_channel: number;
    holdout_threshold_usd: number;
    holdout_share: number;
  };
  optimizer: {
    max_auto_change_pct: number;
    min_days_before_judging: number;
    min_conversions_before_judging: number;
    cpa_pause_pct: number;
    cpa_pause_days: number;
    spend_spike_multiple: number;
    fatigue_ctr_drop: number;
    fatigue_min_frequency: number;
    off_pace_share_at_mid_flight: number;
  };
  rollout: { clean_days_before_next_market: number };
  flight_phases: Record<"tease" | "launch" | "sustain", number>;
}

export const playbook = JSON.parse(readFileSync(dir("config", "playbook.json"), "utf8")) as Playbook;

/** Services whose budget share buys media. Content is owned work, so the minimum share rule skips it. */
export const PAID_SERVICES = ["paid_social", "search", "video", "influencer", "messaging", "abm", "affiliate"];

/** Playbook default channel split for a campaign type, as money amounts that sum to the budget. */
export function defaultSplit(type: CampaignType, budget: number): Record<string, number> {
  const split = playbook.campaign_types[type]?.split;
  if (!split) throw new Error(`Unknown campaign type ${type}`);
  return Object.fromEntries(Object.entries(split).map(([svc, share]) => [svc, round2(share * budget)]));
}

export interface BudgetPlan {
  total_budget: number;
  /** Budget in USD at the finance rate, used only for the holdout threshold. */
  total_budget_usd: number;
  channels: Record<string, number>;
  test_reserve: number;
  holdout_share: number;
  /** Forecast conversions per paid channel, from the strategy agent. */
  expected_conversions?: Record<string, number>;
}

/** Budget rules a concept must meet before G2/G3 (playbook budget section). Returns the broken rules. */
export function budgetPlanProblems(plan: BudgetPlan): string[] {
  const b = playbook.budget;
  const problems: string[] = [];
  const allocated = Object.values(plan.channels).reduce((a, v) => a + v, 0) + plan.test_reserve;
  if (allocated > plan.total_budget + 0.01) problems.push(`allocated ${round2(allocated)} is over the budget ${plan.total_budget}`);
  for (const [svc, amount] of Object.entries(plan.channels)) {
    if (!PAID_SERVICES.includes(svc)) continue;
    if (amount < b.min_channel_share * plan.total_budget - 0.01) problems.push(`${svc} has less than ${pct(b.min_channel_share)} of the budget`);
    const conv = plan.expected_conversions?.[svc];
    if (conv !== undefined && conv < b.min_expected_conversions_per_channel)
      problems.push(`${svc} expects ${conv} conversions, under ${b.min_expected_conversions_per_channel}`);
  }
  if (plan.test_reserve < b.test_reserve_share * plan.total_budget - 0.01) problems.push(`test reserve is under ${pct(b.test_reserve_share)}`);
  if (plan.total_budget_usd > b.holdout_threshold_usd && plan.holdout_share < b.holdout_share)
    problems.push(`budget over ${b.holdout_threshold_usd} USD needs a ${pct(b.holdout_share)} holdout`);
  return problems;
}

export interface BudgetMove {
  from: string;
  to: string;
  amount: number;
}

/**
 * Optimizer move class. "auto" stays inside the spend policy (at most 20% of the source channel's daily
 * budget, into a channel already in the plan, total unchanged); anything else needs the G5 budget_change gate.
 */
export function classifyMove(move: BudgetMove, dailyBudgets: Record<string, number>, totalChange = 0): "auto" | "needs_g5" {
  const source = dailyBudgets[move.from];
  if (source === undefined || dailyBudgets[move.to] === undefined) return "needs_g5";
  if (totalChange > 0 || move.amount <= 0) return "needs_g5";
  return move.amount <= (playbook.optimizer.max_auto_change_pct / 100) * source + 1e-9 ? "auto" : "needs_g5";
}

export interface AdSetDay {
  spend: number;
  planned_spend: number;
  conversions: number;
  cpa: number | null;
}

/**
 * Auto-pause rule, oldest day first. Spend over 2x plan on the latest day pauses at once (safety rule, no
 * waiting period). CPA over target by 50% for 3 days in a row pauses only after the waiting period:
 * 3 days of data or 50 conversions, whichever comes first.
 */
export function pauseReason(days: AdSetDay[], targetCpa: number): string | null {
  const o = playbook.optimizer;
  const last = days.at(-1);
  if (!last) return null;
  if (last.spend > o.spend_spike_multiple * last.planned_spend) return "spend_spike";
  const conversions = days.reduce((a, d) => a + d.conversions, 0);
  if (days.length < o.min_days_before_judging && conversions < o.min_conversions_before_judging) return null;
  const recent = days.slice(-o.cpa_pause_days);
  const limit = targetCpa * (1 + o.cpa_pause_pct / 100);
  if (recent.length === o.cpa_pause_days && recent.every((d) => d.cpa !== null && d.cpa > limit)) return "cpa_drift";
  return null;
}

/** Creative fatigue: click rate down 30% from the first 3 days' rate and frequency above 4. */
export function isFatigued(firstDaysCtr: number, currentCtr: number, frequency: number): boolean {
  const o = playbook.optimizer;
  return frequency > o.fatigue_min_frequency && currentCtr <= firstDaysCtr * (1 - o.fatigue_ctr_drop) + 1e-12;
}

/** Off-pace: at or after mid-flight, spend under 80% of the plan so far. */
export function isOffPace(spentToDate: number, plannedToDate: number, flightShareElapsed: number): boolean {
  return flightShareElapsed >= 0.5 && spentToDate < playbook.optimizer.off_pace_share_at_mid_flight * plannedToDate;
}

/** Day counts for each flight phase (tease, launch, sustain); the sustain phase takes the rounding. */
export function flightPhases(days: number): { tease: number; launch: number; sustain: number } {
  const tease = Math.round(days * playbook.flight_phases.tease);
  const launch = Math.round(days * playbook.flight_phases.launch);
  return { tease, launch, sustain: days - tease - launch };
}

/** Next market in the rollout: the launch order, and 7 clean days in the live market first. */
export function nextMarketReady(live: string, next: string, cleanDays: number): { ok: boolean; reason?: string } {
  const need = playbook.rollout.clean_days_before_next_market;
  if (cleanDays < need) return { ok: false, reason: `${live} has ${cleanDays} clean days, needs ${need}` };
  const [a, b] = [LAUNCH_ORDER.indexOf(marketGroup(live.slice(0, 2))), LAUNCH_ORDER.indexOf(marketGroup(next.slice(0, 2)))];
  if (b < a) return { ok: false, reason: `${next} comes before ${live} in the launch order` };
  return { ok: true };
}

/** Lead countries for a group in a rollout: GCC starts with AE and SA; EU starts with at most 2 countries. */
export function leadCountryProblems(countries: string[]): string[] {
  const problems: string[] = [];
  const byGroup = new Map<string, string[]>();
  for (const c of countries) byGroup.set(marketGroup(c), [...(byGroup.get(marketGroup(c)) ?? []), c]);
  for (const [group, list] of byGroup) {
    const rules = marketRules(list[0]);
    if (rules.max_lead_countries !== undefined && list.length > rules.max_lead_countries)
      problems.push(`${group} leads with ${list.length} countries, max ${rules.max_lead_countries}`);
    if (rules.first_countries && list.some((c) => !rules.first_countries!.includes(c)))
      problems.push(`${group} leads with countries outside ${rules.first_countries.join(", ")}`);
  }
  return problems;
}

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface LaunchDateInput {
  market: string;
  audience: Audience;
  /** ISO date (yyyy-mm-dd) in the market's time zone. */
  date: string;
  /** Ramadan start and end for the year, ISO dates; they move each year so the caller passes them. */
  ramadan?: { start: string; end: string };
  /** Eid campaigns are meant to launch at the end of Ramadan. */
  eid_campaign?: boolean;
}

/** Launch date checks: B2B launches not on the market's weekend; no GCC launch in the last 10 days of Ramadan. */
export function launchDateProblems(input: LaunchDateInput): string[] {
  const rules = marketRules(input.market);
  const problems: string[] = [];
  const day = new Date(`${input.date}T00:00:00Z`);
  if (input.audience === "b2b" && rules.weekend.includes(WEEKDAYS[day.getUTCDay()]))
    problems.push(`${input.date} is a weekend day in ${input.market}`);
  if (rules.ramadan_rules && !input.eid_campaign) {
    if (!input.ramadan) problems.push(`${input.market} launch needs this year's Ramadan dates`);
    else {
      const end = new Date(`${input.ramadan.end}T00:00:00Z`).getTime();
      const blockFrom = end - ((rules.ramadan_no_launch_last_days ?? 10) - 1) * 86_400_000;
      if (day.getTime() >= blockFrom && day.getTime() <= end) problems.push(`${input.date} is in the last ${rules.ramadan_no_launch_last_days} days of Ramadan`);
    }
  }
  return problems;
}

export interface UtmInput {
  platform: string;
  channel: string;
  year: number;
  slug: string;
  artifact_id: string;
  variant: string;
  market: string;
  term?: string;
}

/** Tags a landing URL with the shared Pith UTM standard (engine service-integration spec). */
export function utmUrl(url: string, u: UtmInput): string {
  if (!/^[a-z0-9-]+$/.test(u.slug)) throw new Error(`Campaign slug must be lowercase letters, digits and dashes: ${u.slug}`);
  const out = new URL(url);
  const params: Record<string, string | undefined> = {
    utm_source: u.platform.toLowerCase(),
    utm_medium: u.channel,
    utm_campaign: `${u.year}-${u.slug}`,
    utm_content: `${u.artifact_id.replace(/-/g, "").slice(0, 8)}-${u.variant}`,
    utm_term: u.term,
    pith_mkt: u.market,
  };
  for (const [k, v] of Object.entries(params)) if (v) out.searchParams.set(k, v);
  return out.toString();
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (n: number) => `${Math.round(n * 100)}%`;
