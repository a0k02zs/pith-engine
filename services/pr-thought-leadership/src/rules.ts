import { marketRules, weekendFor } from "./market-rules.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_MS = 24 * 60 * 60 * 1000;

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export interface JournalistState {
  party_id: string;
  do_not_contact: boolean;
  last_pitched_at?: Date | null;
}

/** Playbook rule 3 and engine G-DO-NOT-CONTACT: skip opted-out journalists and anyone pitched by any Pith client in the last 14 days. */
export function canPitch(j: JournalistState, now: Date): boolean {
  if (j.do_not_contact) return false;
  return !j.last_pitched_at || now.getTime() - j.last_pitched_at.getTime() >= 14 * DAY_MS;
}

export type ReplyClass = "interested" | "declined" | "opt_out" | "auto_reply" | "other";

const OPT_OUT = /\b(no more|unsubscribe|remove me|take me off|stop (emailing|contacting)|do not (email|contact))\b/i;

/** A journalist reply that asks to stop sets do_not_contact for every client. Only this class changes the party. */
export const isOptOut = (replyText: string) => OPT_OUT.test(replyText);

export interface PitchDraft {
  subject: string;
  body: string;
  references_article_url: string;
  follow_up: boolean;
}

/** Template T4 limits: pitch body under 150 words (follow-up under 50), subject under 9 words, no "press release" subject, names a recent article. */
export function pitchFailures(p: PitchDraft, recentArticleUrls: string[]): string[] {
  const out: string[] = [];
  const limit = p.follow_up ? 50 : 150;
  if (wordCount(p.body) >= limit) out.push(`body has ${wordCount(p.body)} words; limit is under ${limit}`);
  if (wordCount(p.subject) >= 9) out.push("subject has 9 or more words");
  if (/press release/i.test(p.subject)) out.push('subject says "press release"');
  if (!p.follow_up && !recentArticleUrls.includes(p.references_article_url)) out.push("does not reference one of the journalist's recent articles");
  return out;
}

/** Playbook §4: never more than 1 follow-up per journalist per angle. */
export const mayFollowUp = (followUpsSent: number, replied: boolean) => !replied && followUpsSent === 0;

/** Pitch timing: inside the market's pitch window, on a pitch day, never on the local weekend. `localTime` is "HH:MM" in the journalist's time zone. */
export function inPitchWindow(country: string, localDay: number, localTime: string): boolean {
  const rules = marketRules(country);
  const day = DAYS[localDay];
  if (weekendFor(country).includes(day)) return false;
  if (!rules.pitch_window.days.includes(day)) return false;
  return localTime >= rules.pitch_window.from && localTime <= rules.pitch_window.to;
}

export interface ExecPost {
  text: string;
  hashtags: string[];
  source_refs: string[];
  new_claim_ids: string[];
}

/** Template T7: hook in the first 200 characters, 0 to 3 hashtags, traceable to the executive's own notes. */
export function execPostFailures(post: ExecPost): string[] {
  const out: string[] = [];
  const hook = post.text.split("\n").slice(0, 2).join("\n");
  if (hook.length > 200) out.push("hook (first 2 lines) is over 200 characters");
  if (post.hashtags.length > 3) out.push("more than 3 hashtags");
  if (post.source_refs.length === 0) out.push("no source in the executive's own notes");
  return out;
}

/** WF-6: legal sees a post when the client is listed or the post has a new claim. */
export const postNeedsLegal = (isListed: boolean, post: Pick<ExecPost, "new_claim_ids">) => isListed || post.new_claim_ids.length > 0;

/** WF-4: a journalist request is worth drafting when fit is 0.7 or more and at least 2 hours remain before the deadline. */
export function requestWorthDrafting(score: number, deadline: Date, now: Date): boolean {
  return score >= 0.7 && deadline.getTime() - now.getTime() >= 2 * 60 * 60 * 1000;
}

export interface CrisisSignal {
  sentiment: "positive" | "neutral" | "negative";
  tier: number;
  topics: string[];
  fast_growing: boolean;
  asks_for_comment: boolean;
  national: boolean;
}

const LEVEL3_TOPICS = ["safety", "data_breach", "legal_action", "regulator", "executive_conduct"];

/** Template T9.1 severity scale, 0 to 3. Monitor agent output is checked against this before routing. */
export function crisisLevel(s: CrisisSignal): 0 | 1 | 2 | 3 {
  if (s.topics.some((t) => LEVEL3_TOPICS.includes(t))) return 3;
  if (s.sentiment !== "negative") return 0;
  if (s.national) return 3;
  if (s.tier <= 2 || s.fast_growing || s.asks_for_comment) return 2;
  return 1;
}

/** Response time in minutes per level (T9.1): level 3 15 min, level 2 60 min, level 1 same day. */
export const responseMinutes = (level: 0 | 1 | 2 | 3) => [Infinity, 8 * 60, 60, 15][level];

/** Escalation workflow pauses scheduled work in every service only at level 3. */
export const pausesAllServices = (level: number) => level >= 3;

/** Media tier from the market's tier 1 list; everything else defaults to tier 2 for named outlets and 3 otherwise. */
export function tierFor(outlet: string, country: string, isTradeOrRegional: boolean): 1 | 2 | 3 {
  if (marketRules(country).tier1.some((o) => o.toLowerCase() === outlet.toLowerCase())) return 1;
  return isTradeOrRegional ? 2 : 3;
}
