import type { ResolvedRules, Weekday } from "./market-rules.js";

export type Purpose = "marketing" | "utility";

export interface WindowOptions {
  /** The contact's IANA time zone. Required when the market window is "recipient_local". */
  tz?: string;
  purpose?: Purpose;
  /** "broadcast" turns on the prayer-time pause where the market has one. */
  kind?: "broadcast" | "triggered";
  /** Public holidays in the contact's country, as local dates "YYYY-MM-DD". */
  holidays?: string[];
  /** Prayer times (UTC) for the contact's city. Used only for broadcasts in a market with prayer_time_pause. */
  prayer_times?: { from: Date; to: Date }[];
}

export type WindowResult =
  | { allowed: true; local: LocalTime }
  | { allowed: false; reason: "outside_hours" | "quiet_day" | "public_holiday" | "prayer_time" | "no_time_zone"; local?: LocalTime };

export interface LocalTime {
  date: string;
  time: string;
  weekday: Weekday;
  tz: string;
}

export function localTime(at: Date, tz: string): LocalTime {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: parts.weekday as Weekday,
    tz,
  };
}

/** The time zone to use for a contact: the market zone, or the contact's own zone for "recipient_local". */
export function zoneFor(rules: ResolvedRules, contactTz?: string): string | undefined {
  return rules.window.tz === "recipient_local" ? contactTz : rules.window.tz;
}

/**
 * Check one send time against the market window. Utility messages have no hour limit.
 * Start is inclusive and end is exclusive, as in market-rules.yaml.
 */
export function checkWindow(rules: ResolvedRules, at: Date, opts: WindowOptions = {}): WindowResult {
  const tz = zoneFor(rules, opts.tz);
  if (!tz) return { allowed: false, reason: "no_time_zone" };
  const local = localTime(at, tz);
  if ((opts.purpose ?? "marketing") === "utility") return { allowed: true, local };

  if (rules.quiet_days.includes(local.weekday)) return { allowed: false, reason: "quiet_day", local };
  if (rules.quiet_days.includes("public_holiday") && opts.holidays?.includes(local.date)) {
    return { allowed: false, reason: "public_holiday", local };
  }

  const weekendHours = rules.window.weekend && rules.weekend.includes(local.weekday) ? rules.window.weekend : undefined;
  const { start, end } = weekendHours ?? rules.window;
  if (local.time < start || local.time >= end) return { allowed: false, reason: "outside_hours", local };

  if (rules.prayer_time_pause && opts.kind === "broadcast") {
    const t = at.getTime();
    if (opts.prayer_times?.some((p) => t >= p.from.getTime() && t < p.to.getTime())) {
      return { allowed: false, reason: "prayer_time", local };
    }
  }
  return { allowed: true, local };
}

const STEP_MS = 15 * 60 * 1000;
const MAX_DAYS = 14;

/**
 * The first allowed send time at or after `from`, in 15-minute steps.
 * Returns undefined when nothing is allowed within 14 days, or when the time zone is not known.
 */
export function nextAllowed(rules: ResolvedRules, from: Date, opts: WindowOptions = {}): Date | undefined {
  if (!zoneFor(rules, opts.tz)) return undefined;
  const first = Math.ceil(from.getTime() / STEP_MS) * STEP_MS;
  const last = from.getTime() + MAX_DAYS * 24 * 60 * 60 * 1000;
  if (checkWindow(rules, from, opts).allowed) return from;
  for (let t = first; t <= last; t += STEP_MS) {
    const at = new Date(t);
    if (checkWindow(rules, at, opts).allowed) return at;
  }
  return undefined;
}
