import type { MarketRules } from "./market-rules.js";

export type Verdict = "supported" | "unsupported" | "new_claim" | "risk";

export interface FactReport {
  items: { text: string; verdict: Verdict }[];
  needs_source: string[];
  banned_terms_found: string[];
}

/** Playbook §5 / prompts.md agent 5: fail on any unsupported or risky item, a missing source or a banned term. */
export function factCheckPasses(report: FactReport): boolean {
  return (
    report.items.every((i) => i.verdict !== "unsupported" && i.verdict !== "risk") &&
    report.needs_source.length === 0 &&
    report.banned_terms_found.length === 0
  );
}

/** Engine guardrail G3: a claim that is not in the brain needs a claim gate. */
export const needsClaimGate = (draft: { new_claims: unknown[] }) => draft.new_claims.length > 0;

/** A native editor writes or checks every language the client brain does not already hold. */
export const needsLocalization = (language: string, brainLocales: string[]) => !brainLocales.includes(language);

export interface PageStats {
  sessionsPrevious: number;
  sessionsCurrent: number;
  oldestFactDate: Date;
  lostAiCitations: boolean;
  namesRetiredProduct: boolean;
  changedTextShare?: number;
}

export type RefreshReason = "traffic_drop" | "stale_fact" | "lost_ai_citations" | "retired_product";

/** Refresh auditor rules (playbook §4 rule 6): 20% traffic fall, facts older than 12 months, lost citations, retired products. */
export function refreshReasons(page: PageStats, now: Date): RefreshReason[] {
  const reasons: RefreshReason[] = [];
  if (page.sessionsPrevious > 0 && page.sessionsCurrent <= page.sessionsPrevious * 0.8) reasons.push("traffic_drop");
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setUTCFullYear(now.getUTCFullYear() - 1);
  if (page.oldestFactDate < twelveMonthsAgo) reasons.push("stale_fact");
  if (page.lostAiCitations) reasons.push("lost_ai_citations");
  if (page.namesRetiredProduct) reasons.push("retired_product");
  return reasons;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Market rules: do not publish a major piece on the local weekend (GCC weekends differ). Default weekend is Saturday and Sunday. */
export function isPublishDay(date: Date, rules: MarketRules): boolean {
  const weekend = rules.weekend ?? ["Saturday", "Sunday"];
  return !weekend.includes(DAYS[date.getUTCDay()]);
}

export interface BriefForCheck {
  brief_id: string;
  buyer_question: string;
  source_of_question: string;
  original_input: string;
  angle: string;
  claims_needed: { text: string; new_claim: boolean }[];
  language: string;
}

/** Brief quality check from templates/content-brief.md. Returns the reasons a brief fails; empty means it passes. */
export function briefFailures(brief: BriefForCheck, approvedClaims: string[], allowedLanguages: string[]): string[] {
  const out: string[] = [];
  if (!brief.buyer_question.trim().endsWith("?")) out.push("buyer_question is not a question");
  if (!brief.original_input) out.push("no original input");
  if (!brief.angle.trim()) out.push("no angle");
  for (const c of brief.claims_needed) {
    if (!c.new_claim && !approvedClaims.includes(c.text)) out.push(`claim not in brain and not marked new: ${c.text}`);
  }
  if (!allowedLanguages.includes(brief.language)) out.push(`language ${brief.language} not allowed for this market`);
  return out;
}

/** Languages a brief may use in a market, from market rules. */
export function allowedLanguages(rules: MarketRules): string[] {
  const keys = ["language", "b2c_language", "quebec_language"] as const;
  const list = keys.map((k) => rules[k]).filter((v): v is string => typeof v === "string");
  const extra = rules["extra_languages_b2c"];
  if (Array.isArray(extra)) list.push(...(extra as string[]));
  const byCountry = rules["language_by_country"];
  if (byCountry && typeof byCountry === "object") list.push(...Object.values(byCountry as Record<string, string[]>).flat());
  return list;
}
