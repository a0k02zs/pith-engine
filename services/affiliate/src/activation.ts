import { programmeRules } from "./config.js";

export interface PartnerActivity {
  partner_id: string;
  days_since_join: number;
  clicks: number;
  conversions: number;
  /** Actions already done, so a daily run never repeats one. */
  done: string[];
}

/** The 90-day activation step due today, or null (playbook §6). Conditions are "clicks == 0" or "conversions == 0". */
export function nextActivation(p: PartnerActivity): string | null {
  const due = programmeRules.activation_plan
    .filter((s) => s.day <= p.days_since_join && !p.done.includes(s.action))
    .filter((s) => {
      if (!s.if) return true;
      const m = /^(clicks|conversions) == 0$/.exec(s.if);
      if (!m) throw new Error(`Unknown activation condition: ${s.if}`);
      return p[m[1] as "clicks" | "conversions"] === 0;
    });
  return due.length ? due[due.length - 1].action : null;
}

export type Tier = "gold" | "silver" | "bronze";

export interface TierInput {
  partner_id: string;
  current: Tier;
  /** Partner revenue for each of the last months, oldest first. */
  monthly_revenue: number[];
  monthly_conversions: number[];
}

/**
 * Monthly tier review. Gold: in the top 10% of partner revenue in each of the last 3 months.
 * Silver: at least 1 conversion last month. Upgrades are proposals; a person approves them (budget_change gate).
 */
export function reviewTiers(partners: TierInput[]): { partner_id: string; from: Tier; to: Tier; needs_approval: boolean }[] {
  const months = 3;
  const share = 0.1;
  const n = Math.max(1, Math.ceil(partners.length * share));
  // Gold: in the top N partners by revenue in each of the last 3 months. Ties at the cutoff do not qualify.
  const topSets = Array.from({ length: months }, (_, m) => {
    const value = (p: TierInput) => p.monthly_revenue.at(-months + m) ?? 0;
    return new Set(
      [...partners].filter((p) => value(p) > 0).sort((a, b) => value(b) - value(a)).slice(0, n).map((p) => p.partner_id),
    );
  });
  const order: Tier[] = ["bronze", "silver", "gold"];
  const out = [];
  for (const p of partners) {
    const gold = topSets.every((top) => top.has(p.partner_id));
    const to: Tier = gold ? "gold" : (p.monthly_conversions.at(-1) ?? 0) >= 1 ? "silver" : "bronze";
    if (to !== p.current) out.push({ partner_id: p.partner_id, from: p.current, to, needs_approval: order.indexOf(to) > order.indexOf(p.current) });
  }
  return out;
}

/** activation_rate KPI for one join cohort: partners with a conversion within 90 days ÷ partners who joined. */
export function activationRate(cohort: { days_to_first_conversion: number | null }[]): number {
  if (!cohort.length) return 0;
  return cohort.filter((p) => p.days_to_first_conversion !== null && p.days_to_first_conversion <= 90).length / cohort.length;
}
