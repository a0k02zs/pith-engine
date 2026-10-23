import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export interface MarketRules {
  group: string;
  currency: string;
  language: string;
  /** Lower-case labels; any one of them, placed before the first tracked link, is a disclosure. */
  disclosure_labels: string[];
  social_label_first: boolean;
  /** Licence a paid promoter needs in this market (party.json licences[].type), or null. */
  partner_licence: string | null;
  tax_forms: string[];
  vat_rate: number | null;
  ai_label_required: boolean;
  bulk_email_subject_prefix?: string;
  data_transfer_check?: boolean;
  subdivisions?: Record<string, Partial<MarketRules>>;
}

interface RawMarket extends Partial<MarketRules> {
  inherits?: string;
}

const data = JSON.parse(readFileSync(dir("config", "market-rules.json"), "utf8")) as { markets: Record<string, RawMarket> };

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);

function resolve(key: string, seen: string[] = []): MarketRules {
  const raw = data.markets[key];
  if (!raw) throw new Error(`No affiliate rules for market ${key}`);
  if (seen.includes(key)) throw new Error(`Inheritance loop in affiliate rules: ${[...seen, key].join(" -> ")}`);
  const { inherits, ...own } = raw;
  const base = inherits ? resolve(inherits, [...seen, key]) : {};
  return { ...base, ...own } as MarketRules;
}

/**
 * Rules for a country (ISO 3166-1 alpha-2) or a subdivision such as "CA-QC".
 * An EU country with no own entry gets the EU defaults.
 */
export function marketRules(code: string): MarketRules {
  const [country, sub] = [code.slice(0, 2), code.length > 2 ? code : undefined];
  const key = data.markets[country] ? country : EU.has(country) ? "EU" : country;
  const rules = resolve(key);
  const overlay = sub ? rules.subdivisions?.[sub] : undefined;
  const { subdivisions: _, ...flat } = rules;
  return overlay ? { ...flat, ...overlay } : flat;
}

export const knownMarkets = () => Object.keys(data.markets);
