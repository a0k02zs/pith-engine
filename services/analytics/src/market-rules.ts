import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

/**
 * Analytics rules per market (docs/markets.md). Consent decides which tags may fire before a choice;
 * the warehouse region decides where the client's dataset lives.
 */

export type ConsentMode = "advanced" | "basic" | "none";
export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface MarketRules {
  market: string;
  group: string;
  analytics_before_consent: boolean;
  marketing_before_consent: boolean;
  consent_mode: ConsentMode;
  warehouse_region: string;
  warehouse_region_needs_legal_check?: boolean;
  data_transfer_check?: boolean;
  currency: string;
  week_starts: "mon" | "sun";
  report_language: string;
  modelled_conversions_column: boolean;
  gpc: boolean;
  /** Region type for geo holdout tests, or null when the market is too small for one. */
  geo_test_units: string | null;
  ramadan_controls?: boolean;
}

interface RawMarket extends Partial<MarketRules> {
  inherits?: string;
}

const data = JSON.parse(readFileSync(dir("config", "market-rules.json"), "utf8")) as {
  global: { min_cell_size: number; eu_members: string[] };
  markets: Record<string, RawMarket>;
};

/** No report shows a group of fewer people than this. */
export const MIN_CELL_SIZE = data.global.min_cell_size;

function resolve(key: string, seen: string[] = []): Omit<MarketRules, "market"> {
  const raw = data.markets[key];
  if (!raw) throw new Error(`No analytics rules for market ${key}`);
  if (seen.includes(key)) throw new Error(`Inheritance loop in analytics rules: ${[...seen, key].join(" -> ")}`);
  const { inherits, ...own } = raw;
  const base = inherits ? resolve(inherits, [...seen, key]) : {};
  return { ...base, ...own } as Omit<MarketRules, "market">;
}

/** Rules for an ISO 3166 code (GB, SG, US, CA, AE, ...) or a subdivision (CA-QC). EU members resolve to EU. */
export function rulesFor(market: string): MarketRules {
  const key = data.markets[market] ? market : data.global.eu_members.includes(market) ? "EU" : market;
  return { market, ...resolve(key) };
}

/** May a tag of this consent category fire before the visitor makes a choice? */
export function mayFireBeforeConsent(market: string, category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  const r = rulesFor(market);
  return category === "analytics" ? r.analytics_before_consent : r.marketing_before_consent;
}

/** Hide groups under the minimum cell size before a number goes in a report. */
export function suppressSmallCells<T extends { people: number }>(rows: T[]): T[] {
  return rows.filter((r) => r.people >= MIN_CELL_SIZE);
}
