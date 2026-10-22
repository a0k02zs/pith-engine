import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export interface MarketRules {
  language?: string;
  currency: string;
  date_format: string;
  tone: string;
  weekend?: string[];
  sensitive_topics: string[];
  ai_label_required: boolean;
  [key: string]: unknown;
}

const data = JSON.parse(readFileSync(dir("config", "market-rules.json"), "utf8")) as {
  markets: Record<string, MarketRules>;
};

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);

/** Content rules for an engine market code (ISO country, for example GB, AE, NL). */
export function marketRules(country: string): MarketRules {
  const key = country === "GB" ? "UK" : EU.has(country) ? "EU" : country;
  const rules = data.markets[key];
  if (!rules) throw new Error(`No content rules for market ${country}`);
  return rules;
}
