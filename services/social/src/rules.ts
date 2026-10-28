import { globalRules, marketRules, type Platform, type Weekday } from "./market-rules.js";

export type Audience = "b2b" | "b2c";

/** Engine brand profile `social.autonomy_level` (contract v0.1.0). */
export type Autonomy = "draft_only" | "approved_answers" | "auto_publish_approved_calendar";

export interface BannedTerm {
  term: string;
  markets?: string[];
}

export interface PostDraft {
  platform: Platform;
  market: string;
  caption: string;
  hashtags: string[];
  alt_text?: string;
  has_image: boolean;
  has_video: boolean;
  has_captions_file?: boolean;
  links: string[];
  /** Paid or gifted collaboration post: needs the market label at the start of the caption. */
  collab: boolean;
}

const DAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const weekday = (localDate: string): Weekday => DAYS[new Date(`${localDate}T12:00:00Z`).getUTCDay()];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Banned terms that apply in this market and appear in the text as whole words, case-insensitive. */
export function bannedTermsFound(text: string, terms: BannedTerm[], market: string): string[] {
  const country = market.slice(0, 2);
  return terms
    .filter((t) => !t.markets?.length || t.markets.includes(country))
    .filter((t) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(t.term)}($|[^\\p{L}\\p{N}])`, "iu").test(text))
    .map((t) => t.term);
}

/** True when the caption opens with the market's paid post label (after leading spaces). */
export function hasDisclosureLabel(caption: string, market: string): boolean {
  const labels = marketRules(market).paid_post_label.split("/").map((l) => l.trim()).filter(Boolean);
  const start = caption.trimStart().toLowerCase();
  return labels.some((l) => start.startsWith(l.toLowerCase()));
}

/** Adds UTM tags to a post link: utm_source = platform, utm_medium = social, utm_content = post id. */
export function utmLink(url: string, platform: Platform, campaign: string, postId: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", platform);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", campaign);
  u.searchParams.set("utm_content", postId);
  return u.toString();
}

/**
 * Code checks the checker runs before the model (docs/agents/04-checker.md, step 1).
 * Each problem is a short code; "block:" problems stop the post, the rest go back to the creator.
 */
export function postProblems(post: PostDraft, banned: BannedTerm[]): string[] {
  const out: string[] = [];
  const limit = globalRules.caption_limits[post.platform];
  if ([...post.caption].length > limit) out.push(`fix:caption_over_${limit}`);
  const [min, max] = globalRules.hashtag_ranges[post.platform];
  if (post.hashtags.length < min || post.hashtags.length > max) out.push(`fix:hashtags_${min}_to_${max}`);
  if (post.has_image && globalRules.alt_text_required) {
    if (!post.alt_text?.trim()) out.push("fix:alt_text_missing");
    else if ([...post.alt_text].length > globalRules.alt_text_max) out.push(`fix:alt_text_over_${globalRules.alt_text_max}`);
  }
  if (post.has_video && globalRules.captions_required_on_video && !post.has_captions_file) out.push("fix:video_captions_missing");
  for (const link of post.links) {
    const u = new URL(link);
    if (u.searchParams.get("utm_medium") !== "social" || u.searchParams.get("utm_source") !== post.platform) out.push(`fix:utm_missing:${u.host}`);
  }
  if (post.collab && !hasDisclosureLabel(post.caption, post.market)) out.push("block:disclosure_label_missing");
  const text = [post.caption, ...post.hashtags, post.alt_text ?? ""].join(" ");
  for (const term of bannedTermsFound(text, banned, post.market)) out.push(`block:banned_term:${term}`);
  return out;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Problems with a slot time, in the market's local time. B2B posts go on local work days only.
 * No post goes out inside a no-post window (for example Friday prayer in the GCC).
 */
export function scheduleProblems(localDate: string, localTime: string, market: string, audience: Audience): string[] {
  const rules = marketRules(market);
  const day = weekday(localDate);
  const out: string[] = [];
  if (audience === "b2b" && !rules.week.workdays.includes(day)) out.push(`not_a_work_day:${day}`);
  const t = toMinutes(localTime);
  for (const w of rules.no_post_windows ?? []) {
    if (w.day === day && t >= toMinutes(w.from) && t < toMinutes(w.to)) out.push(`no_post_window:${w.reason}`);
  }
  return out;
}

export type CheckerDecision = "pass" | "fix" | "gate_b" | "block";
export type ComplianceOutcome = "pass" | "warn" | "block";
export type FinalDecision = "publish" | "retry" | "gate_b" | "block";

/**
 * Final decision for 1 post (docs/agents/04-checker.md, "Final decision").
 * Engine compliance `block` always wins. A second `fix` goes to a person.
 * Only `auto_publish_approved_calendar` lets a clean post skip Gate B.
 */
export function finalDecision(input: {
  checker: CheckerDecision;
  compliance: ComplianceOutcome;
  brandScore: number;
  autonomy: Autonomy;
  attempt: number;
  codeProblems?: string[];
  minBrandScore?: number;
}): FinalDecision {
  const problems = input.codeProblems ?? [];
  if (input.compliance === "block" || input.checker === "block" || problems.some((p) => p.startsWith("block:"))) return "block";
  const min = input.minBrandScore ?? globalRules.min_brand_score;
  if (input.checker === "gate_b" || input.brandScore < min) return "gate_b";
  if (input.checker === "fix" || problems.length > 0) return input.attempt < 2 ? "retry" : "gate_b";
  if (input.autonomy !== "auto_publish_approved_calendar") return "gate_b";
  return input.compliance === "warn" ? "gate_b" : "publish";
}

/** A post with any new claim needs the `claim` gate (engine G3), which can never be skipped. */
export const needsClaimGate = (newClaims: string[]) => newClaims.length > 0;

export interface Slot {
  slot_id: string;
  date: string;
  local_time: string;
  platform: Platform;
  account: string;
  market: string;
  language: string;
  pillar: string;
  funnel_stage: "reach" | "engage" | "convert";
  source: string;
  flags: string[];
}

export interface Pillar {
  name: string;
  /** Target share of posts in percent. All pillars add up to 100. */
  share: number;
  offer?: boolean;
}

export const REACTIVE = "reactive";

/**
 * Code checks on the planner's calendar before Gate A (docs/agents/02-planner.md).
 * `cadence` maps account handle to the number of slots the package gives for the month.
 */
export function calendarProblems(slots: Slot[], pillars: Pillar[], cadence: Record<string, number>, audienceOf: (account: string) => Audience): string[] {
  const out: string[] = [];
  const names = new Set(pillars.map((p) => p.name));
  for (const s of slots) {
    if (s.pillar !== REACTIVE && !names.has(s.pillar)) out.push(`${s.slot_id}:unknown_pillar:${s.pillar}`);
    for (const p of scheduleProblems(s.date, s.local_time, s.market, audienceOf(s.account))) out.push(`${s.slot_id}:${p}`);
  }
  for (const [account, expected] of Object.entries(cadence)) {
    const n = slots.filter((s) => s.account === account).length;
    if (n !== expected) out.push(`${account}:slot_count_${n}_expected_${expected}`);
  }
  const planned = slots.filter((s) => s.pillar !== REACTIVE);
  const reactive = slots.length - planned.length;
  if (slots.length > 0 && reactive < Math.floor(slots.length * globalRules.reactive_share)) out.push(`reactive_slots_${reactive}_below_${Math.floor(slots.length * globalRules.reactive_share)}`);
  if (planned.length > 0) {
    for (const p of pillars) {
      const share = (planned.filter((s) => s.pillar === p.name).length / planned.length) * 100;
      if (Math.abs(share - p.share) > globalRules.pillar_tolerance_points) out.push(`pillar_share:${p.name}:${share.toFixed(0)}_target_${p.share}`);
    }
    const offers = new Set(pillars.filter((p) => p.offer).map((p) => p.name));
    const offerShare = planned.filter((s) => offers.has(s.pillar)).length / planned.length;
    if (offerShare > globalRules.max_offer_share) out.push(`offer_share_${Math.round(offerShare * 100)}_over_${globalRules.max_offer_share * 100}`);
  }
  return out;
}

export type InboxCategory =
  | "praise" | "question_simple" | "question_complex" | "complaint" | "service_issue" | "sales_lead" | "press"
  | "legal_or_regulator" | "safety" | "harassment_or_abuse" | "spam_or_scam" | "crisis_risk" | "other";

export type InboxAction = "auto_reply" | "draft_for_human" | "escalate" | "hide_or_report" | "no_action";

/** Classes the agent may never answer (engine G4): they always raise `engine/escalation.raised`. */
export const ESCALATE: InboxCategory[] = ["complaint", "press", "legal_or_regulator", "safety", "crisis_risk"];

/**
 * Enforces the community agent's rules in code, whatever the model proposed (docs/agents/05-community.md).
 * The model can only make an action safer, never riskier.
 */
export function routeInboxItem(item: {
  category: InboxCategory;
  risk: "low" | "medium" | "high";
  proposed: InboxAction;
  market: string;
  match_confidence?: number;
  reply_library_id?: string | null;
}, ctx: { autonomy: Autonomy; autoRepliesToday: number; crisis: boolean }): InboxAction {
  if (ESCALATE.includes(item.category) || item.risk === "high") return "escalate";
  // Only spam, scams and abuse are hidden by the agent. Hiding a genuine negative comment needs a person.
  if (item.proposed === "hide_or_report") {
    return item.category === "spam_or_scam" || item.category === "harassment_or_abuse" ? "hide_or_report" : "draft_for_human";
  }
  if (item.proposed !== "auto_reply") return item.proposed;
  const allowed =
    (item.category === "praise" || item.category === "question_simple") &&
    item.risk === "low" &&
    item.market !== "unknown" &&
    !!item.reply_library_id &&
    (item.match_confidence ?? 0) >= globalRules.auto_reply.min_match_confidence &&
    ctx.autonomy !== "draft_only" &&
    !ctx.crisis &&
    ctx.autoRepliesToday < globalRules.auto_reply.daily_cap_per_account;
  return allowed ? "auto_reply" : "draft_for_human";
}

export type Severity = "sev1" | "sev2" | "sev3";

/** First automatic actions per crisis level (docs/crisis-protocol.md). Pausing is a removal (G10). */
export function crisisActions(severity: Severity): { pauseScheduled: boolean; autoRepliesOff: boolean; slaMinutes: number; notifyPr: boolean } {
  switch (severity) {
    case "sev1":
      return { pauseScheduled: true, autoRepliesOff: true, slaMinutes: 30, notifyPr: true };
    case "sev2":
      return { pauseScheduled: false, autoRepliesOff: false, slaMinutes: 60, notifyPr: false };
    case "sev3":
      return { pauseScheduled: false, autoRepliesOff: false, slaMinutes: 8 * 60, notifyPr: false };
  }
}

/** KPI `engagement_rate`: (reactions + comments + shares + saves) ÷ reach. Null when reach is 0. */
export function engagementRate(m: { reactions: number; comments: number; shares: number; saves: number; reach: number }): number | null {
  if (m.reach <= 0) return null;
  return (m.reactions + m.comments + m.shares + m.saves) / m.reach;
}

/** KPI `median_reply_minutes` over a list of reply delays in minutes. Null when there are none. */
export function medianMinutes(delays: number[]): number | null {
  if (delays.length === 0) return null;
  const s = [...delays].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** KPI `share_of_voice`: client mentions ÷ (client + named competitors' mentions). Null when there are no mentions. */
export function shareOfVoice(client: number, competitors: number[]): number | null {
  const total = client + competitors.reduce((a, b) => a + b, 0);
  return total > 0 ? client / total : null;
}
