import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type ConsentUse = "filmed" | "avatar" | "voice_clone" | "paid" | "creator_reuse";

export interface GlobalRules {
  loudness_lufs: { social: number; broadcast_eu: number; tolerance: number };
  caption: { max_chars_per_line: number; max_lines: number; max_drift_s: number };
  words_per_second: Record<string, number>;
  min_impressions_per_variant: number;
  fatigue: { hook_rate_drop: number; max_frequency: number; frequency_window_days: number };
  takedown_deadline_hours: number;
  track_days: Record<"A" | "B" | "C", number>;
  consent_scopes_for_use: Record<ConsentUse, string[]>;
  actor_label: string;
}

export interface MarketRules {
  group: string;
  languages: string[];
  currency: string;
  date_format: string;
  paid_label: string;
  paid_label_en?: string;
  ai_label: string;
  ai_label_en?: string;
  ai_label_required_from?: string;
  retouch_label?: string;
  actor_label_required?: boolean;
  consent_for_every_person: boolean;
  creator_licence_required?: boolean;
  french_master_required?: boolean;
  data_residency_check?: boolean;
  dpia_before_clone?: boolean;
  native_review: boolean;
  rtl?: boolean;
  tone: string;
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
  if (!raw) throw new Error(`No video rules for market ${key}`);
  if (seen.includes(key)) throw new Error(`Inheritance loop in video rules: ${[...seen, key].join(" -> ")}`);
  const { inherits, ...own } = raw;
  const base = inherits ? resolve(inherits, [...seen, key]) : {};
  return { ...base, ...own } as MarketRules;
}

/** Video rules for an engine market code: an ISO country (GB, AE, NL) or a subdivision (CA-QC). */
export function marketRules(market: string): MarketRules {
  const country = market.slice(0, 2);
  const key = data.markets[country] ? country : EU.has(country) ? "EU_DEFAULT" : country;
  const rules = resolve(key);
  const sub = market.length > 2 ? rules.subdivisions?.[market] : undefined;
  return sub ? { ...rules, ...sub } : rules;
}
