import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface GlobalRules {
  follow_up_deadline_hours: number;
  hot_lead_hand_off_business_hours: number;
  trade_show_hand_off_business_hours: number;
  replay_ready_hours: number;
  live_captions_required: boolean;
  recording_notice_required: boolean;
  attendee_cameras_default_off: boolean;
  biometric_check_in_allowed: boolean;
  pacing: { on_track_ratio: number; at_risk_ratio: number; first_alert_days_before: number };
  business_day_start: string;
  business_day_end: string;
}

export interface MarketRules {
  group: string;
  timezone: string;
  weekend: Weekday[];
  session_slots: string[];
  ramadan_session_slots?: string[];
  best_days: Weekday[];
  languages: string[];
  date_format: string;
  currency: string;
  badge_scan_is_consent: boolean;
  booth_consent_question: boolean;
  co_host_sharing_needs_separate_opt_in: boolean;
  sms_reminder_basis: string[];
  dnc_check_for_sms: boolean;
  implied_consent_inquiry_days?: number;
  tone: string;
  subdivisions?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

interface RawMarket extends Partial<MarketRules> {
  inherits?: string;
}

const data = JSON.parse(readFileSync(dir("config", "market-rules.json"), "utf8")) as {
  global: GlobalRules;
  markets: Record<string, RawMarket>;
};

export const globalRules: GlobalRules = data.global;

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);

function resolve(key: string, seen: string[] = []): MarketRules {
  const raw = data.markets[key];
  if (!raw) throw new Error(`No events rules for market ${key}`);
  if (seen.includes(key)) throw new Error(`Inheritance loop in events rules: ${[...seen, key].join(" -> ")}`);
  const { inherits, ...own } = raw;
  const base = inherits ? resolve(inherits, [...seen, key]) : {};
  return { ...base, ...own } as MarketRules;
}

/** Events rules for an engine market code: an ISO country (GB, AE, NL) or a subdivision (CA-QC, US-CA). */
export function marketRules(market: string): MarketRules {
  const country = market.slice(0, 2);
  const key = data.markets[country] ? country : EU.has(country) ? "EU_DEFAULT" : country;
  const rules = resolve(key);
  const sub = market.length > 2 ? rules.subdivisions?.[market] : undefined;
  return sub ? { ...rules, ...sub } : rules;
}
