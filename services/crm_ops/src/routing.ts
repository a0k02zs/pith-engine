import { marketGroup, marketOverlay, type Weekday } from "./markets.js";
import { defaultModel, type Grade, type ScoreModel } from "./score.js";

/** Default working hours of a queue in local time. 8 hours, so 16 business hours = 2 business days (warm SLA). */
export const DEFAULT_HOURS = { start: "09:00", end: "17:00" };

export interface Calendar {
  /** IANA time zone of the lead, for example Europe/London or Asia/Riyadh. */
  timeZone: string;
  market: string;
  hours?: { start: string; end: string };
  /** Local public holidays as YYYY-MM-DD. The SLA clock pauses on them. */
  holidays?: string[];
}

const WEEKDAYS: Weekday[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localParts(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")) + Number(get("second")) / 60,
    weekday: get("weekday") as Weekday,
  };
}

/** UTC instant of a local wall-clock time (date YYYY-MM-DD, minutes after midnight) in a time zone. */
function zoned(date: string, minutes: number, timeZone: string): Date {
  const guess = new Date(`${date}T00:00:00Z`).getTime() + minutes * 60_000;
  let t = guess;
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(t), timeZone);
    const shown = new Date(`${p.date}T00:00:00Z`).getTime() + p.minutes * 60_000;
    t += guess - shown;
  }
  return new Date(t);
}

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const nextDate = (date: string) => new Date(new Date(`${date}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);

function isWorkingDay(date: string, cal: Calendar): boolean {
  const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return marketOverlay(cal.market).working_days.includes(weekday) && !(cal.holidays ?? []).includes(date);
}

/** True when `at` falls inside the local working week and working hours of the lead's market. */
export function inBusinessHours(at: Date, cal: Calendar): boolean {
  const h = cal.hours ?? DEFAULT_HOURS;
  const p = localParts(at, cal.timeZone);
  return isWorkingDay(p.date, cal) && p.minutes >= toMin(h.start) && p.minutes < toMin(h.end);
}

/** Adds business minutes to `from`. Time outside working hours, weekends and holidays does not count. */
export function addBusinessMinutes(from: Date, minutes: number, cal: Calendar): Date {
  const h = cal.hours ?? DEFAULT_HOURS;
  const start = toMin(h.start);
  const end = toMin(h.end);
  let { date, minutes: cursor } = localParts(from, cal.timeZone);
  let left = minutes;
  for (let guard = 0; guard < 3660; guard++) {
    if (isWorkingDay(date, cal)) {
      cursor = Math.max(cursor, start);
      if (cursor < end) {
        if (left <= end - cursor) return zoned(date, cursor + left, cal.timeZone);
        left -= end - cursor;
      }
    }
    date = nextDate(date);
    cursor = 0;
  }
  throw new Error("No working time found in 10 years: check the market calendar");
}

export interface SlaTimers {
  sla_due_at: string;
  sla_escalate_1: string;
  sla_escalate_2: string;
  in_business_hours: boolean;
}

/**
 * SLA timers for a routed MQL (§5): hot = 5 minutes, then 15 and 60; warm = 4 business hours, then 8 and 16. All in
 * business time, so a lead that arrives after hours starts its clock at the next business hour.
 */
export function slaTimers(grade: Grade, routedAt: Date, cal: Calendar, model: ScoreModel = defaultModel): SlaTimers {
  if (grade !== "A" && grade !== "B") throw new Error(`Grade ${grade} has no sales SLA`);
  const g = model.grades.find((x) => x.grade === grade)!;
  const minutes = g.sla_minutes !== undefined
    ? [g.sla_minutes, ...(g.escalate_minutes ?? [])]
    : [g.sla_business_hours! * 60, ...(g.escalate_business_hours ?? []).map((h) => h * 60)];
  const [due, e1, e2] = minutes.map((m) => addBusinessMinutes(routedAt, m, cal).toISOString());
  return { sla_due_at: due, sla_escalate_1: e1, sla_escalate_2: e2, in_business_hours: inBusinessHours(routedAt, cal) };
}

export interface Rep {
  id: string;
  /** Queues the rep works: UK, SG, NA, GCC, EU, enterprise. */
  queues: string[];
  /** Language tags, for example en, fr, ar. */
  languages: string[];
  timeZone: string;
  on_leave?: boolean;
  last_assigned_at?: string;
  holidays?: string[];
}

export interface RoutingLead {
  market: string;
  company_size_band?: string;
  account_owner_id?: string;
  abm_tier?: number;
  abm_owner_id?: string;
}

export interface RouteResult {
  owner_id: string;
  rule: "account_owner" | "abm_tier1" | "quebec" | "gcc" | "enterprise" | "regional";
  queue?: string;
  /** True when no rep in the queue was in working hours, so the oldest-assigned rep got the lead anyway. */
  out_of_hours_fallback?: boolean;
}

function repInHours(rep: Rep, at: Date, market: string): boolean {
  return inBusinessHours(at, { timeZone: rep.timeZone, market, holidays: rep.holidays });
}

/** Round-robin: the rep with the oldest last assignment, among reps in working hours first. */
function roundRobin(reps: Rep[], at: Date, market: string): { rep: Rep; fallback: boolean } | undefined {
  const active = reps.filter((r) => !r.on_leave);
  if (!active.length) return undefined;
  const order = (list: Rep[]) => [...list].sort((a, b) => (a.last_assigned_at ?? "").localeCompare(b.last_assigned_at ?? "") || a.id.localeCompare(b.id));
  const inHours = active.filter((r) => repInHours(r, at, market));
  return inHours.length ? { rep: order(inHours)[0], fallback: false } : { rep: order(active)[0], fallback: true };
}

/**
 * Routing in the rule order of §5: account owner, ABM tier 1, Quebec, GCC, enterprise, then the regional queue.
 * `enterpriseBands` lists the company size bands at or above the client's enterprise band.
 */
export function routeLead(lead: RoutingLead, reps: Rep[], at: Date, enterpriseBands: string[] = []): RouteResult {
  if (lead.account_owner_id) return { owner_id: lead.account_owner_id, rule: "account_owner" };
  if (lead.abm_tier === 1 && lead.abm_owner_id) return { owner_id: lead.abm_owner_id, rule: "abm_tier1" };
  const group = marketGroup(lead.market);
  if (!group) throw new Error(`Market ${lead.market} is outside the 5 Pith markets`);
  const queue = (q: string) => reps.filter((r) => r.queues.includes(q));
  const pick = (list: Rep[], rule: RouteResult["rule"], q: string): RouteResult | undefined => {
    const r = roundRobin(list, at, lead.market);
    return r && { owner_id: r.rep.id, rule, queue: q, ...(r.fallback ? { out_of_hours_fallback: true } : {}) };
  };
  if (lead.market === "CA-QC") {
    const french = queue("NA").filter((r) => r.languages.includes("fr"));
    const hit = pick(french, "quebec", "NA") ?? pick(queue("NA"), "quebec", "NA");
    if (hit) return hit;
  }
  if (group === "GCC") {
    const gcc = queue("GCC");
    const arabic = lead.market === "SA" ? gcc.filter((r) => r.languages.includes("ar")) : [];
    const hit = pick(arabic, "gcc", "GCC") ?? pick(gcc, "gcc", "GCC");
    if (hit) return hit;
  }
  if (lead.company_size_band && enterpriseBands.includes(lead.company_size_band)) {
    const hit = pick(queue("enterprise"), "enterprise", "enterprise");
    if (hit) return hit;
  }
  const hit = pick(queue(group), "regional", group);
  if (!hit) throw new Error(`No active rep in queue ${group}`);
  return hit;
}
