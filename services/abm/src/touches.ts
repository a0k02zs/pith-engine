import { marketRule, type Weekday } from "./markets.js";
import type { Tier } from "./scoring.js";

/** docs/pipeline.md §3 rule 7: touches per contact per week, counted across every Pith service. */
export const WEEKLY_TOUCH_CAP: Record<Tier, number> = { 1: 2, 2: 1, 3: 1 };

const WEEKDAYS: Weekday[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Day of the week in a time zone, from an instant. */
export function localWeekday(at: Date, timeZone: string): Weekday {
  const name = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(at).toUpperCase();
  return name.slice(0, 3) as Weekday;
}

/** Local time as "HH:MM" in a time zone. */
export function localTime(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(at);
}

export interface TouchCandidate {
  at: Date;
  /** The contact's time zone (IANA), for the send window. */
  timeZone: string;
  /** Account country decides the weekend; contact country decides the data law (markets/rules.json all_markets). */
  accountCountry: string;
  tier: Tier;
  /** Touches this contact got from any service in the 7 days before `at`. */
  touchesLast7Days: number;
  ramadan?: boolean;
  firstTouch?: boolean;
}

export type TouchBlock = "weekly_cap" | "local_weekend" | "outside_send_window" | "ramadan_cold_touch";

/** Reasons a planned touch cannot go at this time. Empty means it can go (the compliance check still runs at send time). */
export function touchBlocks(t: TouchCandidate): TouchBlock[] {
  const out: TouchBlock[] = [];
  const rule = marketRule(t.accountCountry);
  if (t.touchesLast7Days >= WEEKLY_TOUCH_CAP[t.tier]) out.push("weekly_cap");
  if (rule.weekend.includes(localWeekday(t.at, t.timeZone))) out.push("local_weekend");
  if (rule.send_window_local) {
    const [from, to] = rule.send_window_local;
    const now = localTime(t.at, t.timeZone);
    if (now < from || now >= to) out.push("outside_send_window");
  }
  if (t.ramadan && t.firstTouch && rule.ramadan_mode === "reduced_cold_touches") out.push("ramadan_cold_touch");
  return out;
}

export { WEEKDAYS };
