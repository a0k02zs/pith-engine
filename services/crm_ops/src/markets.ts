import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export interface DsrDeadline {
  days: number;
  basis: string;
  extend?: string;
}

/** crm_ops build and operations data for 1 market (config/market-overlay.json). Send eligibility stays in the engine. */
export interface MarketOverlay {
  working_days: Weekday[];
  followup_language: string | Record<string, string>;
  dsr_deadline: DsrDeadline;
  data_location?: { allowed: string[]; other_needs?: string; flag_at_gate?: string };
  enrichment_requires?: string[];
  form_must_capture?: string[];
  route_preference?: string;
  route?: string;
  hold_until?: string;
  holiday_pause?: { eid_nurture_pause: string; sla_pauses_on_public_holidays: boolean };
  engine_rules: string[];
  subdivisions?: Record<string, unknown>;
  [key: string]: unknown;
}

interface RawMarket extends Partial<MarketOverlay> {
  inherits?: string;
}

const overlay = JSON.parse(readFileSync(dir("config", "market-overlay.json"), "utf8")) as { markets: Record<string, RawMarket> };
const enums = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "enums.json"), "utf8")) as {
  market_groups: Record<string, string[]>;
  market_launch_order: string[];
};

/** Engine market groups: UK, SG, NA, GCC, EU, each a list of ISO countries. */
export const marketGroups = enums.market_groups;
export const allCountries: string[] = Object.values(marketGroups).flat();

/** The engine market group (UK, SG, NA, GCC, EU) of a country or subdivision code, or undefined outside the 5 markets. */
export function marketGroup(market: string): string | undefined {
  const country = market.slice(0, 2);
  return Object.keys(marketGroups).find((g) => marketGroups[g].includes(country));
}

export const inMarkets = (market: string) => marketGroup(market) !== undefined;

function resolve(key: string, seen: string[] = []): MarketOverlay {
  const raw = overlay.markets[key];
  if (!raw) throw new Error(`No crm_ops overlay for market ${key}`);
  if (seen.includes(key)) throw new Error(`Inheritance loop in market overlay: ${[...seen, key].join(" -> ")}`);
  const { inherits, ...own } = raw;
  const base = inherits ? resolve(inherits, [...seen, key]) : {};
  // engine_rules add up through inheritance; other keys override.
  const rules = [...((base as Partial<MarketOverlay>).engine_rules ?? []), ...(own.engine_rules ?? [])];
  return { ...base, ...own, engine_rules: [...new Set(rules)] } as MarketOverlay;
}

/**
 * Overlay for an engine market code: an ISO country (GB, SA, DE) or a subdivision (CA-QC). A subdivision entry
 * overrides its country, and an EU country without its own entry uses EU_DEFAULT (overlay "resolution").
 */
export function marketOverlay(market: string): MarketOverlay {
  const country = market.slice(0, 2);
  const group = marketGroup(country);
  if (!group) throw new Error(`Market ${market} is outside the 5 Pith markets`);
  const key = overlay.markets[country] ? country : group === "EU" ? "EU_DEFAULT" : country;
  const rules = resolve(key);
  const sub = market.length > 2 ? rules.subdivisions?.[market] : undefined;
  if (sub && typeof sub === "object") {
    const { dsr_deadline_days, ...rest } = sub as Record<string, unknown>;
    const dsr = typeof dsr_deadline_days === "number" ? { ...rules.dsr_deadline, days: dsr_deadline_days } : rules.dsr_deadline;
    return { ...rules, ...rest, dsr_deadline: dsr } as MarketOverlay;
  }
  return rules;
}

/** Language for sales follow-up and nurture: the overlay value per audience, or the contact's own language in the EU. */
export function followupLanguage(market: string, audience: "b2b" | "b2c", contactLanguage?: string): string | undefined {
  const lang = marketOverlay(market).followup_language;
  const value = typeof lang === "string" ? lang : lang[audience];
  return value === "contact.language" ? contactLanguage : value;
}

/** Legal deadline for a data subject request received at `receivedAt` (calendar days, before any extension). */
export function dsrDueDate(market: string, receivedAt: Date): Date {
  return new Date(receivedAt.getTime() + marketOverlay(market).dsr_deadline.days * 86_400_000);
}

/** True when a CRM sync outside the country needs a counsel check first (Saudi PDPL, SA-DATA-TRANSFER). */
export function needsDataTransferCheck(market: string, crmRegion: string): boolean {
  const allowed = marketOverlay(market).data_location?.allowed ?? ["any"];
  return !allowed.includes("any") && !allowed.includes(crmRegion);
}
