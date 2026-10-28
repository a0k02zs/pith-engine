import type { MarketRules } from "./market-rules.js";

/** Spend policy written after the budget gate (engine spend_policies; plan services 2 and 5). */
export interface SpendPolicy {
  approvedTotalDaily: number;
  maxAutoChangePct: number;
  targetCpa: number;
  cpaPausePct: number;
  cpaPauseDays: number;
}

export const DEFAULT_POLICY: Omit<SpendPolicy, "approvedTotalDaily" | "targetCpa"> = {
  maxAutoChangePct: 20,
  cpaPausePct: 50,
  cpaPauseDays: 3,
};

export type ChangeType = "add_negative" | "pause_keyword" | "pause_ad" | "pause_campaign" | "budget_move" | "bid_strategy" | "new_campaign";

export interface ProposedChange {
  type: ChangeType;
  target: string;
  /** Budget moves: the campaign's current and proposed daily budget. */
  from?: number;
  to?: number;
  reason: string;
}

/** The engine tool risk of a change. Pauses and negatives only stop spend, so they are `remove` (engine G10). */
export function riskOf(change: ProposedChange): "remove" | "spend" {
  return change.type === "add_negative" || change.type.startsWith("pause_") ? "remove" : "spend";
}

/**
 * Split the optimizer's proposals into changes the agent may apply now and changes that need gate G3b.
 * Engine G1: an agent never raises the total and never moves more than maxAutoChangePct of one campaign's budget.
 * New campaigns and bid strategy changes always go to a person.
 */
export function splitChanges(
  changes: ProposedChange[],
  currentBudgets: Record<string, number>,
  policy: SpendPolicy,
): { auto: ProposedChange[]; needsApproval: ProposedChange[] } {
  const auto: ProposedChange[] = [];
  const needsApproval: ProposedChange[] = [];
  const budgets = { ...currentBudgets };
  const total = () => Object.values(budgets).reduce((a, b) => a + b, 0);

  for (const c of changes) {
    if (riskOf(c) === "remove") {
      auto.push(c);
      continue;
    }
    if (c.type !== "budget_move" || c.from === undefined || c.to === undefined || !(c.target in budgets)) {
      needsApproval.push(c);
      continue;
    }
    const changePct = c.from === 0 ? Infinity : (Math.abs(c.to - c.from) / c.from) * 100;
    const before = budgets[c.target];
    budgets[c.target] = c.to;
    if (changePct > policy.maxAutoChangePct + 1e-9 || total() > policy.approvedTotalDaily + 1e-9) {
      budgets[c.target] = before;
      needsApproval.push(c);
    } else {
      auto.push(c);
    }
  }
  return { auto, needsApproval };
}

/** Keyword pause rule: spend of 2x target CPA or more with no conversion. */
export const shouldPauseKeyword = (spend: number, conversions: number, targetCpa: number) =>
  conversions === 0 && spend >= 2 * targetCpa;

/** Campaign pause rule (plan service 2): CPA above target by cpaPausePct for cpaPauseDays days in a row, ending today. */
export function shouldPauseCampaign(dailyCpa: (number | null)[], policy: Pick<SpendPolicy, "targetCpa" | "cpaPausePct" | "cpaPauseDays">): boolean {
  const limit = policy.targetCpa * (1 + policy.cpaPausePct / 100);
  const lastDays = dailyCpa.slice(-policy.cpaPauseDays);
  return lastDays.length === policy.cpaPauseDays && lastDays.every((cpa) => cpa !== null && cpa > limit);
}

/** Spend anomaly (W6 step 7): pace over 150% of the daily budget, or average CPC up more than 50% on the 7-day average. */
export function spendAnomaly(p: { spendToday: number; dailyBudget: number; hourOfDay: number; cpcToday: number; cpc7d: number }): string[] {
  const out: string[] = [];
  const expected = p.dailyBudget * (Math.max(p.hourOfDay, 1) / 24);
  if (p.spendToday > expected * 1.5) out.push("pace");
  if (p.cpc7d > 0 && p.cpcToday > p.cpc7d * 1.5) out.push("cpc_jump");
  return out;
}

/** Broad match needs Smart Bidding and at least 30 conversions in the last 30 days (A10 rule 2). */
export const broadMatchAllowed = (conversions30d: number, smartBidding: boolean) => smartBidding && conversions30d >= 30;

export interface ResponsiveSearchAd {
  headlines: string[];
  descriptions: string[];
  final_url: string;
}

/** Responsive search ad checks (A10 rule 3): 15 headlines of 30 characters or fewer, 4 descriptions of 90 or fewer,
 * the main keyword in at least 3 headlines, and no competitor name anywhere in the text. */
export function rsaFailures(ad: ResponsiveSearchAd, mainKeyword: string, competitorNames: string[]): string[] {
  const out: string[] = [];
  if (ad.headlines.length !== 15) out.push(`needs 15 headlines, has ${ad.headlines.length}`);
  if (ad.descriptions.length !== 4) out.push(`needs 4 descriptions, has ${ad.descriptions.length}`);
  ad.headlines.forEach((h, i) => h.length > 30 && out.push(`headline ${i + 1} is ${h.length} characters`));
  ad.descriptions.forEach((d, i) => d.length > 90 && out.push(`description ${i + 1} is ${d.length} characters`));
  const kw = mainKeyword.toLowerCase();
  if (ad.headlines.filter((h) => h.toLowerCase().includes(kw)).length < 3) out.push("main keyword in fewer than 3 headlines");
  const text = [...ad.headlines, ...ad.descriptions].join(" ").toLowerCase();
  for (const name of competitorNames) if (text.includes(name.toLowerCase())) out.push(`competitor trademark in ad text: ${name}`);
  return out;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** B2B ad schedules follow the local working week (Mon-Fri in the UAE, Sun-Thu in the rest of the GCC). */
export const isAdWorkday = (date: Date, rules: MarketRules) => rules.ad_week.includes(DAYS[date.getUTCDay()]);

/** An ad category the market bans outright cannot launch; a restricted or special category needs a country check at gate G3. */
export function adCategoryStatus(category: string, rules: MarketRules): "banned" | "check" | "ok" {
  if (rules.banned_ad_categories?.includes(category)) return "banned";
  if (rules.restricted_ad_categories.includes(category) || rules.special_ad_categories?.includes(category)) return "check";
  return "ok";
}
