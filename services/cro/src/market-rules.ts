import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export interface MarketRules {
  lang: string[];
  currency: string;
  decimals: number;
  date: string;
  tax_in_price: boolean;
  cookie_consent_for_tests: boolean;
  weekend: string[];
  rule_ids: string[];
  lowest_30_day_price_on_discount?: boolean;
  double_opt_in?: boolean;
}

export interface Blackout {
  name: string;
  markets: string[];
  from: string;
  to: string;
  approximate?: boolean;
}

interface Config {
  version: number;
  markets: Record<string, MarketRules>;
  blackouts: Blackout[];
}

let cached: Config | undefined;
const config = (): Config => (cached ??= JSON.parse(readFileSync(dir("config", "market-rules.json"), "utf8")));

/** Markets with their own CRO settings. Other EU countries use the NL row until they get their own. */
export const knownMarkets = () => Object.keys(config().markets);

export function rulesFor(market: string): MarketRules {
  const m = config().markets[market];
  if (!m) throw new Error(`No CRO market rules for ${market}`);
  return m;
}

export const blackoutsFor = (market: string): Blackout[] => config().blackouts.filter((b) => b.markets.includes(market));

/** Right-to-left for Arabic. */
export const dirFor = (lang: string): "rtl" | "ltr" => (lang.toLowerCase().startsWith("ar") ? "rtl" : "ltr");

/** Money in the market's currency with its decimal places (KWD, BHD and OMR use 3). */
export function formatPrice(amount: number, market: string, lang?: string): string {
  const r = rulesFor(market);
  return new Intl.NumberFormat(lang ?? r.lang[0], {
    style: "currency",
    currency: r.currency,
    minimumFractionDigits: r.decimals,
    maximumFractionDigits: r.decimals,
  }).format(amount);
}
