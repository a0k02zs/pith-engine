import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export interface MarketRules {
  language: string;
  tone: string;
  weekend: string[];
  weekend_by_country?: Record<string, string[]>;
  time_zone: string;
  pitch_window: { days: string[]; from: string; to: string };
  pitch_basis: string[];
  optout_line: boolean;
  privacy_link: boolean;
  postal_address: boolean;
  listed_rule: string;
  sensitive_topics: string[];
  banned_hype: string[];
  ai_editor_named?: boolean;
  tier1: string[];
  [key: string]: unknown;
}

const data = JSON.parse(readFileSync(dir("config", "market-rules.json"), "utf8")) as {
  markets: Record<string, MarketRules>;
};

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);
const GCC = new Set(["AE", "SA", "QA", "KW", "BH", "OM"]);

/** Engine market group for an ISO country or subdivision code (GB → UK, NL → EU, AE → GCC, CA-QC → CA). */
export function marketGroup(code: string): string {
  const country = code.slice(0, 2);
  if (country === "GB") return "UK";
  if (EU.has(country)) return "EU";
  if (GCC.has(country)) return "GCC";
  return country;
}

/** PR rules for an engine market code. */
export function marketRules(code: string): MarketRules {
  const rules = data.markets[marketGroup(code)];
  if (!rules) throw new Error(`No PR rules for market ${code}`);
  return rules;
}

/** Local weekend for a country: GCC weekends differ (UAE Saturday and Sunday, the other 5 Friday and Saturday). */
export function weekendFor(code: string): string[] {
  const rules = marketRules(code);
  return rules.weekend_by_country?.[code.slice(0, 2)] ?? rules.weekend;
}
