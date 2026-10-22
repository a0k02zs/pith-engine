import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export interface MarketRules {
  locales: string[];
  currency: string;
  date_format: string;
  spelling: string;
  engines: string[];
  ad_week: string[];
  consent_mode_required: boolean;
  restricted_ad_categories: string[];
  banned_ad_categories?: string[];
  special_ad_categories?: string[];
  b2c_required_locales?: string[];
  required_locales_by_subdivision?: Record<string, string[]>;
  compliance_rules: string[];
  [key: string]: unknown;
}

const data = JSON.parse(readFileSync(dir("config", "market-rules.json"), "utf8")) as {
  markets: Record<string, MarketRules>;
};

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);

/** Search rules for an engine market code (ISO country, for example GB, AE, NL, or a subdivision such as CA-QC). */
export function marketRules(market: string): MarketRules {
  const country = market.slice(0, 2);
  const key = country === "GB" ? "UK" : EU.has(country) ? "EU" : country;
  const rules = data.markets[key];
  if (!rules) throw new Error(`No search rules for market ${market}`);
  return rules;
}

/** Locales a page set must have in a market. Quebec needs French; GCC B2C needs Arabic. */
export function requiredLocales(market: string, segment: "b2b" | "b2c"): string[] {
  const rules = marketRules(market);
  const out = new Set<string>();
  for (const l of rules.required_locales_by_subdivision?.[market] ?? []) out.add(l);
  if (segment === "b2c") for (const l of rules.b2c_required_locales ?? []) out.add(l);
  return [...out];
}
