import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export type Platform = "meta" | "linkedin" | "tiktok" | "snapchat";

export interface MarketRules {
  group: string;
  currency: string;
  languages?: string[];
  weekend: Weekday[];
  platforms_b2b: Platform[];
  platforms_b2c: Platform[];
  pixel_needs_consent: boolean;
  special_ad_category: boolean;
  alcohol_banned: boolean;
  creator_licence: string | null;
  x_allowed: boolean;
  no_profiling_of_minors?: boolean;
  required_language?: string;
  hfss_online_ban_from?: string;
  /** Engine compliance rule ids: global ones first, then the market's own. */
  rule_ids: string[];
  [key: string]: unknown;
}

interface RulesFile {
  global: { rule_ids: string[]; platforms: Platform[]; list_upload: { channel: string; purpose: string }; political_ads: boolean };
  eu_default: Omit<MarketRules, "languages">;
  markets: Record<string, Partial<MarketRules>>;
}

const file = JSON.parse(readFileSync(dir("config", "market-rules.json"), "utf8")) as RulesFile;

export const globalRules = file.global;
export const markets = () => Object.keys(file.markets);

/** Rules for 1 market (ISO code, or CA-QC). EU markets start from eu_default. Throws for a market we do not serve. */
export function marketRules(market: string): MarketRules {
  const own = file.markets[market];
  if (!own) throw new Error(`No paid social rules for market ${market}`);
  const base = own.group === "EU" ? file.eu_default : {};
  const merged = { ...base, ...own } as MarketRules;
  const ruleIds = [...file.global.rule_ids, ...(base as Partial<MarketRules>).rule_ids ?? [], ...(own.rule_ids ?? [])];
  return { ...merged, rule_ids: [...new Set(ruleIds)] };
}

export function platformsFor(market: string, model: "b2b" | "b2c"): Platform[] {
  const r = marketRules(market);
  return model === "b2b" ? r.platforms_b2b : r.platforms_b2c;
}

const DAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** True when the date (YYYY-MM-DD) is a weekend day in the market. The UAE uses Sat and Sun; the other GCC markets use Fri and Sat. */
export function isWeekend(market: string, date: string): boolean {
  return marketRules(market).weekend.includes(DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]);
}
