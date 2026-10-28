import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface DeliverabilityLimit {
  target: number;
  stop: number;
}

export interface GlobalRules {
  unsubscribe_deadline_hours: number;
  one_click_unsubscribe_required: boolean;
  blocked_consent_statuses: string[];
  required_footer_fields: string[];
  deliverability_limits: { complaint_rate: DeliverabilityLimit; hard_bounce_rate: DeliverabilityLimit; unsubscribe_rate: DeliverabilityLimit };
  frequency_cap: { campaigns_per_day: number; marketing_emails_per_week: number };
  ban_fake_reply_prefixes: boolean;
}

export interface MarketRules {
  group: string;
  b2c_bases: string[];
  b2b_bases: string[];
  cold_outbound_allowed: boolean;
  cold_outbound_requires?: string[];
  subject_prefix_unsolicited: string | null;
  extra_footer_fields?: string[];
  implied_consent_expiry_days?: { purchase_or_contract: number; inquiry: number };
  data_transfer_check_before_sync?: boolean;
  language?: string;
  b2c_language?: string;
  currency: string;
  date_format: string;
  weekend: Weekday[];
  default_send_time: { b2b: string; b2c: string; b2c_ramadan?: string };
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
  if (!raw) throw new Error(`No email rules for market ${key}`);
  if (seen.includes(key)) throw new Error(`Inheritance loop in email rules: ${[...seen, key].join(" -> ")}`);
  const { inherits, ...own } = raw;
  const base = inherits ? resolve(inherits, [...seen, key]) : {};
  return { ...base, ...own } as MarketRules;
}

/** Email rules for an engine market code: an ISO country (GB, AE, NL) or a subdivision (CA-QC, US-CA). */
export function marketRules(market: string): MarketRules {
  const country = market.slice(0, 2);
  const key = data.markets[country] ? country : EU.has(country) ? "EU_DEFAULT" : country;
  const rules = resolve(key);
  const sub = market.length > 2 ? rules.subdivisions?.[market] : undefined;
  return sub ? { ...rules, ...sub } : rules;
}
