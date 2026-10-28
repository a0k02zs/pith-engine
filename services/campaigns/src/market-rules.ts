import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export type MarketGroup = "UK" | "SG" | "NA" | "GCC" | "EU";

interface GroupRules {
  weekend: Weekday[];
  weekend_by_country?: Record<string, Weekday[]>;
  currencies: Record<string, string>;
  ramadan_rules: boolean;
  ramadan_no_launch_last_days?: number;
  first_countries?: string[];
  max_lead_countries?: number;
  required_language?: Record<string, string>;
}

export interface MarketRules {
  market: string;
  country: string;
  group: MarketGroup;
  weekend: Weekday[];
  currency: string;
  ramadan_rules: boolean;
  ramadan_no_launch_last_days?: number;
  language?: string;
  first_countries?: string[];
  max_lead_countries?: number;
}

const data = JSON.parse(readFileSync(dir("config", "markets.json"), "utf8")) as { groups: Record<MarketGroup, GroupRules> };
const enums = JSON.parse(readFileSync(dir("vendor", "engine-v0.1.0", "enums.json"), "utf8")) as {
  market_groups: Record<MarketGroup, string[]>;
  market_launch_order: MarketGroup[];
};

export const LAUNCH_ORDER: MarketGroup[] = enums.market_launch_order;

export function marketGroup(country: string): MarketGroup {
  const group = (Object.keys(enums.market_groups) as MarketGroup[]).find((g) => enums.market_groups[g].includes(country));
  if (!group) throw new Error(`Market ${country} is not in a Pith market group`);
  return group;
}

/** Campaign rules for an engine market code: an ISO country (GB, AE, NL) or a subdivision (CA-QC). */
export function marketRules(market: string): MarketRules {
  const country = market.slice(0, 2);
  const group = marketGroup(country);
  const g = data.groups[group];
  return {
    market,
    country,
    group,
    weekend: g.weekend_by_country?.[country] ?? g.weekend,
    currency: g.currencies[country] ?? g.currencies["*"],
    ramadan_rules: g.ramadan_rules,
    ramadan_no_launch_last_days: g.ramadan_no_launch_last_days,
    language: g.required_language?.[market],
    first_countries: g.first_countries,
    max_lead_countries: g.max_lead_countries,
  };
}
