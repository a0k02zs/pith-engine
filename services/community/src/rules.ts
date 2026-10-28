import { globalRules, type MarketRules, type RightsLevel } from "./market-rules.js";

// ---------- Review requests (playbook §2 rules 1 to 4, §6) ----------

export type BusinessType = "ecommerce" | "ecommerce_use_needed" | "local_service" | "hospitality" | "saas" | "app" | "b2b_service";

/** Default delay between the trigger event and the first request (playbook §6). */
export const DEFAULT_DELAY_HOURS: Record<BusinessType, number> = {
  ecommerce: 7 * 24,
  ecommerce_use_needed: 14 * 24,
  local_service: 2,
  hospitality: 24,
  saas: 30 * 24,
  app: 30 * 24,
  b2b_service: 3 * 24,
};

/** The learned delay may move the default by up to 50% either way. */
export function requestDelayHours(type: BusinessType, learnedHours?: number): number {
  const base = DEFAULT_DELAY_HOURS[type];
  if (learnedHours === undefined) return base;
  return Math.min(base * 1.5, Math.max(base * 0.5, learnedHours));
}

export type Channel = "email" | "sms" | "whatsapp" | "in_app";

export interface RequestContext {
  platform: string;
  channel: Channel;
  consentBasis: string | null;
  lastRequestAt?: Date;
  openTicket: boolean;
  alreadyReviewed: boolean;
  optedOut: boolean;
  dncListed?: boolean;
  now: Date;
}

export type SkipReason =
  | "platform_forbids_asks"
  | "use_platform_native_request"
  | "opted_out"
  | "already_reviewed"
  | "open_ticket"
  | "asked_recently"
  | "no_consent_basis"
  | "dnc_listed";

/** Why a review request must not go out. Empty means it may go out. */
export function requestSkipReasons(ctx: RequestContext, rules: MarketRules): SkipReason[] {
  const out: SkipReason[] = [];
  const platform = ctx.platform.toLowerCase();
  if (globalRules.no_ask_platforms.includes(platform)) out.push("platform_forbids_asks");
  if (globalRules.native_request_only_platforms.includes(platform)) out.push("use_platform_native_request");
  if (ctx.optedOut) out.push("opted_out");
  if (ctx.alreadyReviewed) out.push("already_reviewed");
  if (ctx.openTicket) out.push("open_ticket");
  if (ctx.lastRequestAt) {
    const days = (ctx.now.getTime() - ctx.lastRequestAt.getTime()) / 86_400_000;
    if (days < globalRules.max_requests_per_contact_days) out.push("asked_recently");
  }
  const bases = ctx.channel === "sms" || ctx.channel === "whatsapp" ? rules.sms_bases : rules.review_request_bases;
  if (ctx.channel !== "in_app" && (!ctx.consentBasis || !bases.includes(ctx.consentBasis))) out.push("no_consent_basis");
  if (rules.dnc_check && (ctx.channel === "sms" || ctx.channel === "whatsapp") && ctx.dncListed !== false) out.push("dnc_listed");
  return out;
}

const hhmm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

function localMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return get("hour") * 60 + get("minute");
}

/** Earliest time at or after `at` that is outside local quiet hours (default 20:00 to 09:00). */
export function nextSendTime(at: Date, timeZone: string): Date {
  const start = hhmm(globalRules.quiet_hours.start);
  const end = hhmm(globalRules.quiet_hours.end);
  const quiet = (m: number) => (start > end ? m >= start || m < end : m >= start && m < end);
  const t = new Date(at);
  t.setUTCSeconds(0, 0);
  for (let i = 0; i < 24 * 4 + 1; i++) {
    const m = localMinutes(t, timeZone);
    if (!quiet(m)) return t;
    t.setUTCMinutes(t.getUTCMinutes() + 15 - (t.getUTCMinutes() % 15));
  }
  throw new Error("No send window found in 24 hours");
}

/** A happiness check is not gating only if every rating sees the public review link (playbook §6). */
export function isReviewGating(linkShownForRating: Record<1 | 2 | 3 | 4 | 5, boolean>): boolean {
  return Object.values(linkShownForRating).some((shown) => !shown);
}

export interface Incentive {
  platform: string;
  sameForAnyRating: boolean;
  disclosedInReview: boolean;
}

/** Playbook §2 rule 4: never on platforms that ban it, always the same for any rating, always disclosed. */
export function incentiveAllowed(i: Incentive): boolean {
  return !globalRules.no_incentive_platforms.includes(i.platform.toLowerCase()) && i.sameForAnyRating && i.disclosedInReview;
}

// ---------- Review replies (playbook §7, engine guardrail G4) ----------

export interface ReplyDraft {
  class: "positive" | "mixed" | "negative";
  risk: "green" | "amber" | "red";
  suspected_policy_violation: boolean;
}

export interface TrialStats {
  firstReplyAt?: Date;
  repliesApproved: number;
  repliesEdited: number;
  now: Date;
}

/** Auto-post opens after 30 days in which every reply was approved and under 10% were edited. */
export function autoReplyTrialPassed(s: TrialStats): boolean {
  if (!s.firstReplyAt || s.repliesApproved === 0) return false;
  const days = (s.now.getTime() - s.firstReplyAt.getTime()) / 86_400_000;
  return days >= globalRules.auto_reply_trial_days && s.repliesEdited / s.repliesApproved < globalRules.auto_reply_max_edit_rate;
}

export type ReplyRoute = "escalate" | "human" | "auto";

/** Who handles a reply. Negative, red or suspected-violation reviews are escalations: the agent may not reply. */
export function replyRoute(d: ReplyDraft, trialPassed: boolean, brandScore: number): ReplyRoute {
  if (d.class === "negative" || d.risk === "red" || d.suspected_policy_violation) return "escalate";
  if (d.class === "mixed" || d.risk === "amber") return "human";
  return trialPassed && brandScore >= globalRules.auto_reply_min_brand_score ? "auto" : "human";
}

// ---------- UGC rights (playbook §8, engine rights-grant.json, guardrail G8) ----------

export type GrantScope = "likeness" | "ugc_reuse" | "paid_usage" | "whitelisting";
export type UgcUse = "organic_repost" | "owned_channel" | "paid_ad" | "case_study";

/** Engine scopes for a person shown in content at a rights level. Every person grant carries likeness. */
export function grantScopes(level: RightsLevel, whitelisting = false): GrantScope[] {
  const scopes: GrantScope[] = ["likeness", "ugc_reuse"];
  if (level === "R3") scopes.push("paid_usage");
  if (level === "R3" && whitelisting) scopes.push("whitelisting");
  return scopes;
}

/** Expiry for a grant that starts at `start`, from the rights level. */
export function grantExpiry(level: RightsLevel, start: Date): Date {
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + globalRules.rights_months[level]);
  return end;
}

/** Lowest rights level that covers a use. A hashtag "yes" (R1) only covers an organic repost. */
export const LEVEL_FOR_USE: Record<UgcUse, RightsLevel> = {
  organic_repost: "R1",
  owned_channel: "R2",
  paid_ad: "R3",
  case_study: "R4",
};

export interface Grant {
  person_name: string;
  scope: GrantScope[];
  markets: string[];
  channels: string[];
  starts_at: string;
  expires_at: string | null;
  revoked_at?: string | null;
  is_minor?: boolean;
  guardian_evidence_ref?: string;
  rights_level: RightsLevel;
}

/** Uses each level covers (playbook §8). R4 is a B2B case study: owned channels, not paid ads. */
export const USES_COVERED: Record<RightsLevel, UgcUse[]> = {
  R1: ["organic_repost"],
  R2: ["organic_repost", "owned_channel"],
  R3: ["organic_repost", "owned_channel", "paid_ad"],
  R4: ["organic_repost", "owned_channel", "case_study"],
};

/** Why a grant does not cover one use in one market and channel. Empty means it covers it. */
export function grantGaps(g: Grant, use: UgcUse, market: string, channel: string, now: Date): string[] {
  const out: string[] = [];
  if (!USES_COVERED[g.rights_level].includes(use)) out.push(`level ${g.rights_level} does not cover ${use}`);
  if (!g.scope.includes("likeness")) out.push("no likeness scope");
  if (use === "paid_ad" && !g.scope.includes("paid_usage")) out.push("no paid_usage scope");
  if (!g.markets.includes(market.slice(0, 2))) out.push(`market ${market} not granted`);
  if (!g.channels.includes(channel)) out.push(`channel ${channel} not granted`);
  if (new Date(g.starts_at) > now) out.push("not started");
  if (g.expires_at && new Date(g.expires_at) <= now) out.push("expired");
  if (g.revoked_at) out.push("revoked");
  if (g.is_minor && !g.guardian_evidence_ref) out.push("minor without guardian evidence");
  return out;
}

/** Content may be used only if every person shown has a grant that covers the use (engine G8). */
export function contentCleared(peopleShown: string[], grants: Grant[], use: UgcUse, market: string, channel: string, now: Date): boolean {
  if (peopleShown.length === 0) return false;
  return peopleShown.every((p) => grants.some((g) => g.person_name === p && grantGaps(g, use, market, channel, now).length === 0));
}

export type ExpiryAction = "none" | "warn" | "pull";

/** Daily rights check: warn 30 days before expiry, pull at expiry or revocation. */
export function expiryAction(g: Pick<Grant, "expires_at" | "revoked_at">, now: Date): ExpiryAction {
  if (g.revoked_at) return "pull";
  if (!g.expires_at) return "none";
  const days = (new Date(g.expires_at).getTime() - now.getTime()) / 86_400_000;
  if (days <= 0) return "pull";
  return days <= globalRules.rights_expiry_warning_days ? "warn" : "none";
}

/** Gates a paid rights deal needs before anything is signed or paid (engine G2). */
export function rightsDealGates(level: RightsLevel, paymentAmount: number): ("contract" | "payout")[] {
  const gates: ("contract" | "payout")[] = [];
  if (level === "R3" || paymentAmount > 0) gates.push("contract");
  if (paymentAmount > 0) gates.push("payout");
  return gates;
}

/** Extra paperwork a market needs before UGC runs as a paid ad. */
export function paidAdRequirements(rules: MarketRules): string[] {
  const out = [`label:${rules.paid_ugc_label}`];
  if (rules.paid_post_licence) out.push(`licence:${rules.paid_post_licence}`);
  if (rules.publicity_release_for_ads) out.push("publicity_release");
  if (rules.explicit_face_consent) out.push("explicit_face_consent");
  if (rules.label_ai_media) out.push("ai_media_label_if_edited");
  return out;
}

// ---------- Moderation and community (playbook §9, engine G4, G10) ----------

export type ModerationLabel = "green" | "amber" | "red";
export type ModerationAction = "keep" | "queue" | "hide" | "hide_and_escalate";
export type IntendedUse = "community_live" | UgcUse;

/** Paid ad use is never green: a person always approves it. */
export function effectiveLabel(label: ModerationLabel, use: IntendedUse): ModerationLabel {
  return use === "paid_ad" && label === "green" ? "amber" : label;
}

export function moderationAction(label: ModerationLabel, use: IntendedUse, isSpam = false): ModerationAction {
  if (isSpam) return "hide";
  const l = effectiveLabel(label, use);
  if (l === "red") return "hide_and_escalate";
  return l === "amber" ? "queue" : "keep";
}

/** Topics that make an item red in this market, on top of the brain's sensitive topics. */
export function redTopicsFor(rules: MarketRules, brainSensitive: string[] = []): string[] {
  const base = ["hate", "harassment", "threat", "self_harm", "sexual", "personal_data", "illegal_goods", "safety_incident", "legal_threat", "press", "regulator"];
  return [...new Set([...base, ...rules.extra_sensitive_topics, ...brainSensitive])];
}

export interface MemberQuarter {
  membersHelped: number;
  guidelineBreaks: number;
}

/** Champion invite rule. Reviews and ratings play no part (playbook §2 rule 4). */
export const championEligible = (m: MemberQuarter) => m.membersHelped >= globalRules.champion_min_members_helped && m.guidelineBreaks === 0;

/** The host agent must say it is an AI in its first message to each member (EU AI Act Art. 50; all markets by default). */
export function hostMessageOk(text: string, isFirstMessage: boolean, rules: MarketRules): boolean {
  if (!isFirstMessage || !rules.ai_disclosure_required) return true;
  return /\b(AI|A\.I\.|artificial intelligence|IA|KI)\b|ذكاء اصطناعي/i.test(text);
}

/** EU Omnibus Directive: a review widget states whether and how reviews are checked. */
export const widgetNeedsVerificationNote = (rules: MarketRules) => rules.review_widget_verification_note;
