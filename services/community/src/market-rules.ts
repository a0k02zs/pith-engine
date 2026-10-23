import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export type RightsLevel = "R1" | "R2" | "R3" | "R4";

export interface GlobalRules {
  max_requests_per_contact_days: number;
  reminders_per_order: number;
  reminder_after_days: number;
  quiet_hours: { start: string; end: string };
  no_ask_platforms: string[];
  native_request_only_platforms: string[];
  no_incentive_platforms: string[];
  rights_expiry_warning_days: number;
  withdrawal_removal_days: number;
  auto_reply_trial_days: number;
  auto_reply_max_edit_rate: number;
  auto_reply_min_brand_score: number;
  rights_months: Record<RightsLevel, number>;
  champion_min_members_helped: number;
  review_request_purpose: string;
}

export interface MarketRules {
  group: string;
  languages: string[];
  weekend: Weekday[];
  review_request_bases: string[];
  sms_bases: string[];
  dnc_check: boolean;
  paid_ugc_label: string;
  ai_disclosure_required: boolean;
  review_widget_verification_note: boolean;
  paid_post_licence: string | null;
  extra_sensitive_topics: string[];
  tone: string;
  explicit_face_consent?: boolean;
  publicity_release_for_ads?: boolean;
  label_ai_media?: boolean;
  data_transfer_check_before_sync?: boolean;
  subdivisions?: Record<string, Partial<MarketRules>>;
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
  if (!raw) throw new Error(`No community rules for market ${key}`);
  if (seen.includes(key)) throw new Error(`Inheritance loop in community rules: ${[...seen, key].join(" -> ")}`);
  const { inherits, ...own } = raw;
  const base = inherits ? resolve(inherits, [...seen, key]) : {};
  return { ...base, ...own } as MarketRules;
}

/** Community rules for an engine market code: an ISO country (GB, AE, NL) or a subdivision (CA-QC). */
export function marketRules(market: string): MarketRules {
  const country = market.slice(0, 2);
  const key = data.markets[country] ? country : EU.has(country) ? "EU_DEFAULT" : country;
  const rules = resolve(key);
  const sub = market.length > 2 ? rules.subdivisions?.[market] : undefined;
  return sub ? { ...rules, ...sub } : rules;
}
