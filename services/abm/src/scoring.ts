/** Account scores from docs/playbook.md §5. Every score is 0 to 100. */

export type Tier = 1 | 2 | 3;

export interface FitFactors {
  /** Each factor is the share of its weight the account earns, from 0 to 1. */
  industry: number;
  size: number;
  technographic: number;
  market: number;
  situation: number;
  relationship: number;
}

/** Playbook §5.1 weights. They add up to 100. */
export const FIT_WEIGHTS: Record<keyof FitFactors, number> = {
  industry: 25,
  size: 20,
  technographic: 20,
  market: 15,
  situation: 10,
  relationship: 10,
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function fitScore(f: FitFactors): number {
  let total = 0;
  for (const k of Object.keys(FIT_WEIGHTS) as (keyof FitFactors)[]) total += FIT_WEIGHTS[k] * clamp01(f[k]);
  return round1(total);
}

export type IntentSignalType = "topic_surge" | "buying_page_visit" | "hiring" | "company_event" | "review_site";

/** Playbook §5.2: the cap per signal type and the half-life in days. */
export const INTENT_RULES: Record<IntentSignalType, { cap: number; halfLifeDays: number }> = {
  topic_surge: { cap: 30, halfLifeDays: 14 },
  buying_page_visit: { cap: 25, halfLifeDays: 7 },
  hiring: { cap: 15, halfLifeDays: 30 },
  company_event: { cap: 15, halfLifeDays: 60 },
  review_site: { cap: 15, halfLifeDays: 14 },
};

export interface IntentSignal {
  type: IntentSignalType;
  /** Points at the time the signal was seen. */
  points: number;
  observedAt: Date;
}

const DAY_MS = 86_400_000;
const ageDays = (then: Date, now: Date) => Math.max(0, (now.getTime() - then.getTime()) / DAY_MS);

/** Each signal decays by its half-life. Each type is capped, then the total is capped at 100. */
export function intentScore(signals: IntentSignal[], now: Date): number {
  const byType = new Map<IntentSignalType, number>();
  for (const s of signals) {
    const rule = INTENT_RULES[s.type];
    const decayed = s.points * 0.5 ** (ageDays(s.observedAt, now) / rule.halfLifeDays);
    byType.set(s.type, (byType.get(s.type) ?? 0) + decayed);
  }
  let total = 0;
  for (const [type, pts] of byType) total += Math.min(INTENT_RULES[type].cap, pts);
  return round1(Math.min(100, total));
}

export type EngagementType = "reply" | "meeting_accepted" | "event_attended" | "page_visit" | "ad_click" | "gift_redeemed" | "download";

/** Playbook §5.3 points. Points expire after 30 days. */
export const ENGAGEMENT_POINTS: Record<EngagementType, number> = {
  reply: 15,
  meeting_accepted: 25,
  event_attended: 15,
  page_visit: 10,
  ad_click: 5,
  gift_redeemed: 10,
  download: 10,
};

export const ENGAGEMENT_EXPIRY_DAYS = 30;

export interface EngagementSignal {
  type: EngagementType;
  /** Null for account-level signals such as an ad click from the account. */
  contactId: string | null;
  at: Date;
}

export function engagementScore(signals: EngagementSignal[], now: Date): number {
  let total = 0;
  for (const s of signals) {
    const age = ageDays(s.at, now);
    if (s.at.getTime() <= now.getTime() && age < ENGAGEMENT_EXPIRY_DAYS) total += ENGAGEMENT_POINTS[s.type];
  }
  return Math.min(100, total);
}

/** Committee members with a person-level engagement in the last `days` days. Ad clicks are account-level and do not count. */
export function engagedContacts(signals: EngagementSignal[], now: Date, days = 14): number {
  const ids = new Set<string>();
  for (const s of signals) {
    if (s.contactId && s.type !== "ad_click" && s.at.getTime() <= now.getTime() && ageDays(s.at, now) < days) ids.add(s.contactId);
  }
  return ids.size;
}

/** Playbook §5.4 start values. The reporter proposes changes; a person approves them at G6. */
export interface Thresholds {
  target_fit: number;
  tier1_fit: number;
  surge_intent: number;
  surge_delta_7d: number;
  handoff_intent: number;
  handoff_engagement: number;
  handoff_contacts: number;
  cooldown_days: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  target_fit: 60,
  tier1_fit: 80,
  surge_intent: 60,
  surge_delta_7d: 25,
  handoff_intent: 70,
  handoff_engagement: 40,
  handoff_contacts: 2,
  cooldown_days: 60,
};

/** A surge needs fresh data: a stale account can never surge (docs/pipeline.md §5). */
export function isSurge(a: { intent: number; intentSevenDaysAgo: number; stale: boolean }, t = DEFAULT_THRESHOLDS): boolean {
  if (a.stale) return false;
  return a.intent >= t.surge_intent || a.intent - a.intentSevenDaysAgo >= t.surge_delta_7d;
}

export function isSalesReady(a: { intent: number; engagement: number; engagedContacts14d: number }, t = DEFAULT_THRESHOLDS): boolean {
  return a.intent >= t.handoff_intent && a.engagement >= t.handoff_engagement && a.engagedContacts14d >= t.handoff_contacts;
}

export function needsCoolDown(lastEngagement: Date | null, listedAt: Date, now: Date, t = DEFAULT_THRESHOLDS): boolean {
  return ageDays(lastEngagement ?? listedAt, now) >= t.cooldown_days;
}

export interface TierCandidate {
  account_id: string;
  fit: number;
  /** Set by client sales. Only these accounts can be Tier 1. */
  strategic: boolean;
}

export interface TierCapacity {
  tier1_max: number;
  tier2_max: number;
  tier3_max: number;
}

/**
 * Proposed tiers for gate G1. Accounts under the target fit are left out. Tier 1 needs fit at or above tier1_fit
 * and the strategic flag. Each tier fills by fit score, highest first; an account that does not fit its tier drops to the next.
 */
export function proposeTiers(candidates: TierCandidate[], cap: TierCapacity, t = DEFAULT_THRESHOLDS): Map<string, Tier> {
  const sorted = candidates.filter((c) => c.fit >= t.target_fit).sort((a, b) => b.fit - a.fit || a.account_id.localeCompare(b.account_id));
  const out = new Map<string, Tier>();
  let n1 = 0;
  let n2 = 0;
  let n3 = 0;
  for (const c of sorted) {
    if (c.strategic && c.fit >= t.tier1_fit && n1 < cap.tier1_max) {
      out.set(c.account_id, 1);
      n1++;
    } else if (n2 < cap.tier2_max) {
      out.set(c.account_id, 2);
      n2++;
    } else if (n3 < cap.tier3_max) {
      out.set(c.account_id, 3);
      n3++;
    }
  }
  return out;
}

/** Playbook §6: roles each tier must fill before outreach. */
export const COMMITTEE_TARGET: Record<Tier, number> = { 1: 4, 2: 3, 3: 1 };

export function committeeCoverage(rolesFilled: number, tier: Tier): number {
  return Math.min(1, rolesFilled / COMMITTEE_TARGET[tier]);
}
