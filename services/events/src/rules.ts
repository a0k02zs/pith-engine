import { globalRules, marketRules, type MarketRules, type Weekday } from "./market-rules.js";

// ---------- time zones (no library: Intl is enough for whole-minute offsets) ----------

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: Weekday;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock date and time of an instant in a time zone. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const p = Object.fromEntries(formatter(timeZone).formatToParts(instant).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day), hour: Number(p.hour), minute: Number(p.minute),
    weekday: p.weekday.slice(0, 3).toLowerCase() as Weekday,
  };
}

function offsetMs(instant: Date, timeZone: string): number {
  const z = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute);
  return asUtc - Math.floor(instant.getTime() / 60000) * 60000;
}

/** The instant when the wall clock in a time zone shows a date ("2027-03-09") and time ("14:00"). */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - offsetMs(new Date(guess), timeZone);
  return new Date(guess - offsetMs(new Date(first), timeZone));
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// ---------- session planning (docs/05-market-rules.md §1) ----------

/** A live session day: not the local weekend, and one of the market's best days. GCC weekends differ by country. */
export function isGoodSessionDay(date: string, market: string): boolean {
  const rules = marketRules(market);
  const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return !rules.weekend.includes(weekday) && rules.best_days.includes(weekday);
}

/** The session start instants for a market on a date, from its slots (Ramadan slots when the date is in Ramadan). */
export function sessionStarts(date: string, market: string, inRamadan = false): Date[] {
  const rules = marketRules(market);
  const slots = inRamadan && rules.ramadan_session_slots ? rules.ramadan_session_slots : rules.session_slots;
  return slots.map((slot) => zonedTimeToUtc(date, slot, rules.timezone));
}

// ---------- registration pacing (docs/02-pipeline.md stage 10) ----------

export type PacingStatus = "on_track" | "at_risk" | "off_track";

/** on_track at 90% of the target to date or more, at_risk from 60%, off_track below 60%. A zero target is on track. */
export function pacingStatus(actualToDate: number, targetToDate: number): PacingStatus {
  if (targetToDate <= 0) return "on_track";
  const ratio = actualToDate / targetToDate;
  if (ratio >= globalRules.pacing.on_track_ratio) return "on_track";
  if (ratio >= globalRules.pacing.at_risk_ratio) return "at_risk";
  return "off_track";
}

// ---------- engagement score and segments (docs/01-playbook.md §6) ----------

export interface ScoreWeights {
  attended: number;
  watch_share: number;
  asked_question: number;
  answered_poll: number;
  clicked_resource: number;
  hand_raise: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  attended: 20, watch_share: 25, asked_question: 15, answered_poll: 5, clicked_resource: 10, hand_raise: 25,
};

export type Fit = "A" | "B" | "C";
export type Segment = "hot" | "engaged" | "no_show" | "on_demand";

export interface AttendeeRecord {
  contact_id: string;
  company_id?: string;
  attended_live: boolean;
  live_minutes: number;
  replay_minutes: number;
  session_minutes: number;
  asked_question: boolean;
  answered_poll: boolean;
  clicked_resource: boolean;
  hand_raise: boolean;
  fit: Fit;
}

/** 0 to 100. Watch share counts live and replay minutes, capped at the session length. */
export function engagementScore(r: AttendeeRecord, w: ScoreWeights = DEFAULT_WEIGHTS): number {
  const watched = Math.min(r.live_minutes + r.replay_minutes, r.session_minutes);
  const share = r.session_minutes > 0 ? watched / r.session_minutes : 0;
  const raw =
    (r.attended_live ? w.attended : 0) +
    w.watch_share * share +
    (r.asked_question ? w.asked_question : 0) +
    (r.answered_poll ? w.answered_poll : 0) +
    (r.clicked_resource ? w.clicked_resource : 0) +
    (r.hand_raise ? w.hand_raise : 0);
  return Math.min(100, Math.round(raw));
}

/** An ABM target account is always fit A. */
export const effectiveFit = (r: AttendeeRecord, abmCompanyIds: string[]): Fit =>
  r.company_id && abmCompanyIds.includes(r.company_id) ? "A" : r.fit;

export function segmentOf(r: AttendeeRecord, score: number, fit: Fit = r.fit): Segment {
  if (r.hand_raise || (score >= 60 && (fit === "A" || fit === "B") && (r.attended_live || r.replay_minutes > 0))) return "hot";
  if (r.attended_live) return "engaged";
  if (r.replay_minutes > 0) return "on_demand";
  return "no_show";
}

export interface ScoredRecord {
  contact_id: string;
  score: number;
  fit: Fit;
  segment: Segment;
}

export function scoreRecords(records: AttendeeRecord[], abmCompanyIds: string[] = [], w: ScoreWeights = DEFAULT_WEIGHTS): ScoredRecord[] {
  return records.map((r) => {
    const fit = effectiveFit(r, abmCompanyIds);
    const score = engagementScore(r, w);
    return { contact_id: r.contact_id, score, fit, segment: segmentOf(r, score, fit) };
  });
}

// ---------- follow-up speed (docs/02-pipeline.md "Service levels") ----------

/** Latest moment for the first follow-up: event end + 24 hours. */
export const followUpDeadline = (eventEnd: Date) => new Date(eventEnd.getTime() + globalRules.follow_up_deadline_hours * 3600_000);

function isBusinessMinute(instant: Date, rules: MarketRules): boolean {
  const z = zonedParts(instant, rules.timezone);
  const m = z.hour * 60 + z.minute;
  return !rules.weekend.includes(z.weekday) && m >= minutesOf(globalRules.business_day_start) && m < minutesOf(globalRules.business_day_end);
}

/**
 * When to send a segment's follow-up in a market: the first local business minute at least 30 minutes after the
 * event end. The 24-hour promise wins: if business hours start too late, send at the deadline minus 1 hour.
 */
export function followUpSendTime(eventEnd: Date, market: string): Date {
  const rules = marketRules(market);
  const deadline = followUpDeadline(eventEnd);
  const latest = new Date(deadline.getTime() - 3600_000);
  for (let t = eventEnd.getTime() + 30 * 60_000; t <= latest.getTime(); t += 15 * 60_000) {
    const candidate = new Date(Math.ceil(t / (15 * 60_000)) * 15 * 60_000);
    if (candidate <= latest && isBusinessMinute(candidate, rules)) return candidate;
  }
  return latest;
}

/** Adds local business hours (weekends and nights skipped), for the sales hand-off SLA. */
export function addBusinessHours(start: Date, hours: number, market: string): Date {
  const rules = marketRules(market);
  let left = Math.round(hours * 60);
  let t = Math.floor(start.getTime() / 60_000) * 60_000;
  while (left > 0) {
    t += 60_000;
    if (isBusinessMinute(new Date(t - 60_000), rules)) left -= 1;
  }
  return new Date(t);
}

/** Hot leads reach sales within 4 business hours (webinar) or 8 (trade show, 1 business day). */
export const handOffDue = (eventEnd: Date, market: string, kind: "webinar" | "trade_show" = "webinar") =>
  addBusinessHours(
    eventEnd,
    kind === "webinar" ? globalRules.hot_lead_hand_off_business_hours : globalRules.trade_show_hand_off_business_hours,
    market,
  );

/** KPI follow_up_minutes: median minutes from event end to the first follow-up per registrant. */
export function medianFollowUpMinutes(eventEnd: Date, firstSends: Date[]): number | null {
  if (firstSends.length === 0) return null;
  const mins = firstSends.map((s) => (s.getTime() - eventEnd.getTime()) / 60_000).sort((a, b) => a - b);
  const mid = Math.floor(mins.length / 2);
  return mins.length % 2 ? mins[mid] : (mins[mid - 1] + mins[mid]) / 2;
}

// ---------- the template skip rule (docs/02-pipeline.md "Why follow-up is fast") ----------

export const FOLLOW_UP_FIELDS = [
  "first_name", "company", "session_title", "questions_block", "resources_block", "replay_url", "cta_url", "sender_name",
] as const;

const FIELD = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Merge fields in a template that are not on the allowed list. A template with any of these fails the go-live gate. */
export const unknownMergeFields = (template: string, allowed: readonly string[] = FOLLOW_UP_FIELDS) =>
  [...template.matchAll(FIELD)].map((m) => m[1]).filter((f) => !allowed.includes(f));

// A *_block field may span lines, a *_url field is 1 token, and any other field stays on 1 line.
// So a trailing field cannot hide extra text after it.
const fieldPattern = (name: string) => (name.endsWith("_block") ? "[\\s\\S]*?" : name.endsWith("_url") ? "\\S*" : "[^\\n]*");

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * True when the filled text equals the approved template with only the merge fields filled in.
 * This is the condition that lets the follow-up skip the copy gate (`only_merge_fields_changed` in events/follow_up@1).
 */
export function onlyMergeFieldsChanged(template: string, filled: string): boolean {
  const parts = template.split(FIELD);
  // split with a capture group alternates literal text and field names
  const pattern = parts.map((p, i) => (i % 2 === 0 ? escape(p) : fieldPattern(p))).join("");
  return new RegExp(`^${pattern}$`).test(filled);
}

// ---------- consent rules that are special to events (docs/05-market-rules.md §2) ----------

export type BoothFollowUp = "marketing" | "requested_only";

/**
 * What a booth lead may get after the show. A badge scan is never consent. In markets that ask the consent
 * question at the booth, only a "yes" allows marketing; otherwise the follow-up covers only what the person asked for.
 * US corporate follow-up is allowed under the CAN-SPAM opt-out regime.
 */
export function boothFollowUpScope(market: string, consentAnswer: boolean | null): BoothFollowUp {
  const rules = marketRules(market);
  if (rules.badge_scan_is_consent) return "marketing";
  if (rules.booth_consent_question) return consentAnswer === true ? "marketing" : "requested_only";
  return rules.group === "NA" || rules.group === "UK" ? "marketing" : "requested_only";
}

/** Registrant data goes to a co-host only with the partner opt-in, in markets that need a separate box. */
export const mayShareWithCoHost = (market: string, partnerOptIn: boolean) =>
  partnerOptIn || !marketRules(market).co_host_sharing_needs_separate_opt_in;

/** T-10min SMS or WhatsApp reminder: needs a consent basis the market accepts, and a clean Do Not Call check where required. */
export function smsReminderAllowed(market: string, basis: string, dncListed: boolean | null): boolean {
  const rules = marketRules(market);
  if (!rules.sms_reminder_basis.includes(basis)) return false;
  if (rules.dnc_check_for_sms) return dncListed === false;
  return true;
}

/** CASL: a registration is an inquiry, so implied consent ends about 6 months after it. Null where the market has no such rule. */
export function impliedConsentExpiry(market: string, registeredAt: Date): Date | null {
  const days = marketRules(market).implied_consent_inquiry_days;
  return days ? new Date(registeredAt.getTime() + days * 86_400_000) : null;
}

// ---------- live Q&A routing (engine G4) ----------

export const ESCALATE_CLASSES = ["complaint", "press", "legal_or_regulatory", "abuse"] as const;

export interface QaTriage {
  class: string;
  escalate: boolean;
  draft_answer: string;
  needs_live_speaker: boolean;
}

/** Where a live question goes. Escalation classes never get a drafted answer, whatever the agent returned. */
export function routeQuestion(t: QaTriage): "escalate" | "speaker" | "moderator" {
  if (t.escalate || (ESCALATE_CLASSES as readonly string[]).includes(t.class)) return "escalate";
  if (t.needs_live_speaker || !t.draft_answer.trim()) return "speaker";
  return "moderator";
}
