import { globalRules, marketRules } from "./market-rules.js";

// ---------- Disclosure (docs/markets.md, templates.md §5) ----------

export interface PostText {
  market: string;
  caption: string;
  isVideo?: boolean;
  /** Transcript of the first seconds of the video. */
  spokenText?: string;
  /** Text burned into the first frames of the video. */
  onScreenText?: string;
  /** Gift with no paid deal: a gift label is enough. */
  giftOnly?: boolean;
  /** Edited or AI-made images; France needs "Image retouchée" or "Image virtuelle". */
  imageEdited?: boolean;
}

const norm = (s: string) => s.normalize("NFC").toLocaleLowerCase();

/** True when `label` appears as its own word (with or without a leading #) inside `text`. */
function hasLabel(text: string, label: string): boolean {
  const t = norm(text);
  const bare = norm(label).replace(/^#/, "");
  const escaped = bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}_])#?${escaped}($|[^\\p{L}\\p{N}_])`, "u").test(t);
}

const firstLabel = (text: string, labels: string[]) => labels.find((l) => hasLabel(text, l));

/**
 * Checks the ad label on a creator post before approval and on the live post.
 * The label must sit in the part of the caption shown before "more", and a video must say or show it.
 * Weak tags (#sp, #spon, #collab ...) never count on their own.
 */
export function disclosureProblems(post: PostText): string[] {
  const rules = marketRules(post.market);
  const accepted = post.giftOnly ? [...rules.labels, ...rules.gift_labels] : rules.labels;
  const out: string[] = [];
  const head = post.caption.slice(0, globalRules.label_window_chars);
  if (!firstLabel(head, accepted)) {
    if (firstLabel(post.caption, accepted)) out.push(`label is after the first ${globalRules.label_window_chars} characters`);
    else if (rules.weak_tags.some((t) => hasLabel(post.caption, t))) out.push("only a weak tag; it does not count as a label");
    else out.push(`no ${post.giftOnly ? "gift or ad" : "ad"} label for ${post.market}`);
  }
  if (post.isVideo && globalRules.video_label_required) {
    const inVideo = [post.spokenText ?? "", post.onScreenText ?? ""].some((t) => firstLabel(t, accepted));
    if (!inVideo) out.push("video does not say or show the label");
  }
  if (post.imageEdited && rules.image_labels.length > 0 && !firstLabel(post.caption, rules.image_labels)) {
    out.push(`edited image needs one of: ${rules.image_labels.join(", ")}`);
  }
  return out;
}

// ---------- Vetting (playbook.md §4) ----------

export type Segment = "b2b" | "b2c";

export interface CreatorFacts {
  country: string;
  real_follower_pct: number | null;
  /** Share of the audience in the target market, 0-100. */
  audience_in_market_pct: number | null;
  is_minor: boolean;
  guardian_consent?: boolean;
  /** Posts flagged for hate, harassment or illegal content, with their dates. */
  high_risk_post_dates: string[];
  /** Dates of paid deals with a named competitor. */
  competitor_deal_dates: string[];
  active_exclusivity: boolean;
  licences: { type: string; number: string; expires_at?: string; verified?: boolean }[];
}

export interface VetContext {
  market: string;
  segment: Segment;
  category: string;
  now: Date;
}

const daysBetween = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 86_400_000;

/** Licence state for a creator who posts to `market`. */
export function licenceStatus(creator: Pick<CreatorFacts, "licences">, market: string, now: Date): "not_needed" | "ok" | "missing" | "expired" | "check_local" {
  const need = marketRules(market).licence;
  if (!need) return "not_needed";
  if (need.required === "check_local") return "check_local";
  const held = creator.licences.filter((l) => l.type === need.type);
  if (held.length === 0) return "missing";
  const live = held.filter((l) => !l.expires_at || new Date(l.expires_at) > now);
  return live.length > 0 ? "ok" : "expired";
}

/** Hard stops from the playbook. Any one stops the creator before a person sees the name. */
export function hardStops(c: CreatorFacts, ctx: VetContext): string[] {
  const out: string[] = [];
  if (c.real_follower_pct !== null && c.real_follower_pct < globalRules.min_real_follower_pct) out.push("real_followers_low");
  const minAudience = globalRules.min_audience_in_market_pct[ctx.segment];
  if (c.audience_in_market_pct !== null && c.audience_in_market_pct < minAudience) out.push("audience_not_in_market");
  if (c.is_minor && (globalRules.minor_banned_categories.includes(ctx.category) || !c.guardian_consent)) out.push("minor");
  const lookback = globalRules.brand_safety_lookback_months * 30.44;
  if (c.high_risk_post_dates.some((d) => daysBetween(ctx.now, new Date(d)) <= lookback)) out.push("brand_safety");
  if (c.active_exclusivity || c.competitor_deal_dates.some((d) => daysBetween(ctx.now, new Date(d)) <= globalRules.competitor_lookback_days)) {
    out.push("competitor_deal");
  }
  const lic = licenceStatus(c, ctx.market, ctx.now);
  if (lic === "missing" || lic === "expired") out.push("licence_" + lic);
  if (marketRules(ctx.market).restricted_categories.includes(ctx.category) && c.is_minor) out.push("restricted_category_minor");
  return [...new Set(out)];
}

/** Missing data does not stop a creator; it sends the creator back for an insights screenshot. */
export const needsData = (c: CreatorFacts) => c.real_follower_pct === null || c.audience_in_market_pct === null;

export const SCORE_WEIGHTS = {
  audience_country: 25,
  audience_demo: 15,
  interest: 15,
  engagement_quality: 20,
  brand_safety: 15,
  content_fit: 10,
} as const;

export type ScoreFactors = Record<keyof typeof SCORE_WEIGHTS, number>;

/** Fit score 0-100. Each factor is 0-1 (share of its weight earned). */
export function fitScore(f: ScoreFactors): number {
  let total = 0;
  for (const [k, w] of Object.entries(SCORE_WEIGHTS) as [keyof ScoreFactors, number][]) {
    const v = f[k];
    if (!(v >= 0 && v <= 1)) throw new Error(`factor ${k} must be between 0 and 1`);
    total += v * w;
  }
  return Math.round(total);
}

// ---------- Fees (playbook.md §5) ----------

export interface FeeInput {
  /** Median views of the last 10 non-sponsored posts on this platform. */
  medianViews: number;
  /** Market CPM band for the platform and tier, in the payout currency. */
  cpm: { low: number; high: number };
  /** Months of paid use (0 to 12). */
  paidUsageMonths?: number;
  /** Category exclusivity after the last post, in days (0 to 90). */
  exclusivityDays?: number;
  extras?: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

/** Uplift for paid use: none at 0 months, +30% at 3 months rising to +100% at 12. */
export function paidUsageUplift(months: number): number {
  if (months <= 0) return 0;
  if (months > 12) throw new Error("paid use over 12 months needs legal review");
  return months <= 3 ? 0.3 : lerp(0.3, 1, (months - 3) / 9);
}

/** Uplift for category exclusivity: none at 0 days, +20% at 30 days rising to +50% at 90. */
export function exclusivityUplift(days: number): number {
  if (days <= 0) return 0;
  if (days > 90) throw new Error("exclusivity over 90 days needs legal review");
  return days <= 30 ? 0.2 : lerp(0.2, 0.5, (days - 30) / 60);
}

/** A fair fee range from data. A person agrees the final number; agents may offer only inside it. */
export function feeRange(i: FeeInput): { low: number; high: number } {
  if (i.medianViews < 0 || i.cpm.low < 0 || i.cpm.high < i.cpm.low) throw new Error("bad fee input");
  const mult = 1 + paidUsageUplift(i.paidUsageMonths ?? 0) + exclusivityUplift(i.exclusivityDays ?? 0);
  const base = i.medianViews / 1000;
  const round = (n: number) => Math.round(n / 5) * 5;
  return { low: round(base * i.cpm.low * mult + (i.extras ?? 0)), high: round(base * i.cpm.high * mult + (i.extras ?? 0)) };
}

/** The negotiation agent may offer this amount without a person only when it is inside the approved range. */
export const offerAllowed = (amount: number, approved: { low: number; high: number }) => amount >= approved.low && amount <= approved.high;

// ---------- Outreach (pipeline.md stage 5) ----------

export interface OutreachState {
  sent: { number: number; at: string }[];
  replied: boolean;
  declined: boolean;
  doNotContact: boolean;
}

/** What to do next for 1 creator: send message N, wait, or stop. At most 3 messages; a "no" stops at once. */
export function nextOutreach(s: OutreachState, now: Date): { action: "send"; number: number } | { action: "wait"; until: string } | { action: "stop"; reason: string } {
  if (s.doNotContact) return { action: "stop", reason: "do_not_contact" };
  if (s.declined) return { action: "stop", reason: "declined" };
  if (s.replied) return { action: "stop", reason: "replied" };
  if (s.sent.length === 0) return { action: "send", number: 1 };
  const first = new Date(s.sent.find((m) => m.number === 1)?.at ?? s.sent[0].at);
  const followUps = globalRules.outreach_follow_up_days;
  const n = s.sent.length;
  if (n > followUps.length) return { action: "stop", reason: "no_reply" };
  const due = new Date(first.getTime() + followUps[n - 1] * 86_400_000);
  return now >= due ? { action: "send", number: n + 1 } : { action: "wait", until: due.toISOString() };
}

// ---------- Payout (pipeline.md stage 10) ----------

export interface PayoutCase {
  market: string;
  deliverables: number;
  verifiedLive: number;
  /** Any live post still on hold for a missing label or a changed draft. */
  onHold: boolean;
  taxForm: string | null;
  bankReady: boolean;
}

/** Reasons a payout cannot go to the finance gate yet. Empty means ready. */
export function payoutBlockers(p: PayoutCase): string[] {
  const out: string[] = [];
  if (p.verifiedLive < p.deliverables) out.push(`${p.deliverables - p.verifiedLive} deliverable(s) not verified live`);
  if (p.onHold) out.push("a live post is on hold");
  const forms = marketRules(p.market).tax_forms;
  if (forms.length > 0 && (!p.taxForm || !forms.includes(p.taxForm))) out.push(`tax form needed: ${forms.join(" or ")}`);
  if (!p.bankReady) out.push("bank details missing");
  return out;
}

/** Adds business days (Mon-Fri). Used for the payout due date: 7 target, 15 at most after proof of posting. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

export const payoutDue = (proofAt: Date) => ({
  target: addBusinessDays(proofAt, globalRules.payout_terms_business_days.target),
  latest: addBusinessDays(proofAt, globalRules.payout_terms_business_days.max),
});

// ---------- Measurement (kpis.md) ----------

export interface CreatorResult {
  fee: number;
  productCost: number;
  shipping: number;
  orders: number;
  revenue: number;
  views: number;
  engagements: number;
  /** Orders whose referrer is a coupon site. */
  couponSiteOrders: number;
}

/** KPI values with their engine codes. Null where the denominator is 0. */
export function creatorKpis(r: CreatorResult): Record<string, number | null> {
  const cost = r.fee + r.productCost + r.shipping;
  const div = (a: number, b: number) => (b > 0 ? a / b : null);
  return {
    attributed_revenue: r.revenue,
    cpa: div(cost, r.orders),
    roas: div(r.revenue, cost),
    cost_per_engagement: div(cost, r.engagements),
    "influencer.cpm": r.views > 0 ? (cost / r.views) * 1000 : null,
  };
}

/** A code leaks when more than 30% of its orders come from coupon sites; report code and link sales apart. */
export const codeLeaked = (r: Pick<CreatorResult, "orders" | "couponSiteOrders">) => r.orders > 0 && r.couponSiteOrders / r.orders > 0.3;

/** UTM link for 1 creator, as the engine analytics spec names the fields. */
export function creatorUtm(baseUrl: string, p: { handle: string; campaignId: string; partyId: string }): string {
  const u = new URL(baseUrl);
  u.searchParams.set("utm_source", p.handle.replace(/^@/, "").toLowerCase());
  u.searchParams.set("utm_medium", "influencer_post");
  u.searchParams.set("utm_campaign", p.campaignId);
  u.searchParams.set("utm_content", p.partyId);
  return u.toString();
}
