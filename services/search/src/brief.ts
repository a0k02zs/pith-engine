import type { MarketRules } from "./market-rules.js";

export interface BriefForCheck {
  market: string;
  locale: string;
  main_question: string;
  direct_answer: string;
  title_tag: string;
  meta_description: string;
  facts: { text: string; source_url: string | null }[];
  claims: { text: string; new_claim: boolean }[];
  internal_links_out: string[];
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Brief check from templates T4 and the GEO rules in the playbook: the answer comes first in 50 words or fewer,
 * every fact has a source, claims are approved or marked new, title and meta fit, and the locale belongs to the market.
 */
export function briefFailures(brief: BriefForCheck, approvedClaims: string[], rules: MarketRules): string[] {
  const out: string[] = [];
  if (!brief.main_question.trim().endsWith("?")) out.push("main_question is not a question");
  if (words(brief.direct_answer) === 0) out.push("no direct answer");
  if (words(brief.direct_answer) > 50) out.push(`direct answer is ${words(brief.direct_answer)} words (max 50)`);
  if (brief.title_tag.length > 60) out.push(`title tag is ${brief.title_tag.length} characters (max 60)`);
  if (brief.meta_description.length > 155) out.push(`meta description is ${brief.meta_description.length} characters (max 155)`);
  for (const f of brief.facts) if (!f.source_url) out.push(`fact without a source: ${f.text}`);
  for (const c of brief.claims) {
    if (!c.new_claim && !approvedClaims.includes(c.text)) out.push(`claim not in brain and not marked new: ${c.text}`);
  }
  if (brief.internal_links_out.length < 3) out.push("fewer than 3 internal links out");
  if (!rules.locales.includes(brief.locale) && !(rules.extra_b2c_locales as string[] | undefined)?.includes(brief.locale)) {
    out.push(`locale ${brief.locale} not allowed for ${brief.market}`);
  }
  return out;
}

/** Engine guardrail G3: a new claim needs a claim gate (G6) before the expert gate. */
export const needsClaimGate = (draft: { new_claims: unknown[] }) => draft.new_claims.length > 0;

/** Drafts must not go to the expert with an open "[SOURCE NEEDED]" marker. */
export const openSourceMarkers = (body: string) => (body.match(/\[SOURCE NEEDED\]/g) ?? []).length;
