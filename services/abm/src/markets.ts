import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

/**
 * ABM market rules (markets/rules.json). The engine reads the same file as `service_overlays.abm` in
 * engine/specs/compliance-rules.json. Planning summary, not legal advice: `confirm: true` means a local lawyer checks it first.
 */

export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export interface GiftLimit {
  currency: string;
  private_sector: number;
  public_sector: number;
  public_sector_needs_written_account_approval?: boolean;
}

export interface MarketRule {
  b2b_email_basis: string;
  required_in_email: string[];
  gift_limit: GiftLimit;
  gift_banned_items?: string[];
  weekend: Weekday[];
  send_window_local?: [string, string];
  languages: string[] | string;
  arabic_required_for?: string[];
  play_order?: string[];
  bulk_email_subject_label?: string;
  bulk_applies_to_tiers?: number[];
  ramadan_mode?: string;
  data_transfer_check?: boolean;
  no_consent_action?: string;
  regional_overrides?: Record<string, Partial<MarketRule> & { privacy_law?: string }>;
  confirm: boolean;
  [key: string]: unknown;
}

interface RawRules {
  markets: Record<string, Partial<MarketRule> & { inherits?: string; per_country?: Record<string, Partial<MarketRule>> }>;
}

const raw = JSON.parse(readFileSync(dir("markets", "rules.json"), "utf8")) as RawRules;
const enums = JSON.parse(readFileSync(dir("..", "..", "engine", "contracts", "enums.json"), "utf8")) as {
  market_groups: Record<string, string[]>;
};

const EU = new Set(enums.market_groups.EU);
const GCC = new Set(enums.market_groups.GCC);

export const DEFAULT_PLAY_ORDER = ["P1", "P2"];

function merge(base: Partial<MarketRule>, over: Partial<MarketRule>): Partial<MarketRule> {
  const out: Partial<MarketRule> = { ...base, ...over };
  if (base.gift_limit && over.gift_limit) out.gift_limit = { ...base.gift_limit, ...over.gift_limit };
  return out;
}

/**
 * Rules for 1 country (ISO 3166-1 alpha-2), with an optional ISO 3166-2 subdivision such as "CA-QC".
 * EU countries use the EU block plus their own `per_country` entry, or `default` when they have none.
 * GCC countries other than AE and SA inherit from SA.
 */
export function marketRule(country: string, subdivision?: string): MarketRule {
  let rule: Partial<MarketRule>;
  if (EU.has(country)) {
    const { per_country, ...eu } = raw.markets.EU;
    rule = merge(eu, per_country?.[country] ?? per_country?.default ?? {});
  } else {
    const own = raw.markets[country];
    if (!own) throw new Error(`No ABM market rules for ${country}`);
    const { inherits, ...rest } = own;
    rule = inherits ? merge(raw.markets[inherits], rest) : rest;
  }
  if (subdivision) {
    const region = subdivision.split("-")[1];
    const ov = rule.regional_overrides?.[region];
    if (ov) rule = merge(rule, ov);
  }
  return rule as MarketRule;
}

export const isGcc = (country: string) => GCC.has(country);

/** Account country decides the play order (GCC: warm-up, then event or introduction, then executive email). */
export function playOrder(accountCountry: string): string[] {
  return marketRule(accountCountry).play_order ?? DEFAULT_PLAY_ORDER;
}

export type GiftDecision =
  | { decision: "allowed" }
  | { decision: "needs_approval"; reason: string }
  | { decision: "banned"; reason: string };

/**
 * Gift check for gate G4 (docs/approvals.md). The value is in the market currency.
 * Public-sector and government-linked accounts always need approval; over the private-sector limit needs approval;
 * banned items are never allowed.
 */
export function giftDecision(
  accountCountry: string,
  gift: { value: number; currency: string; items: string[]; publicSector: boolean },
): GiftDecision {
  const rule = marketRule(accountCountry);
  const banned = gift.items.filter((i) => rule.gift_banned_items?.includes(i));
  if (banned.length) return { decision: "banned", reason: `banned in ${accountCountry}: ${banned.join(", ")}` };
  if (gift.currency !== rule.gift_limit.currency) {
    return { decision: "needs_approval", reason: `value is in ${gift.currency}, limit is in ${rule.gift_limit.currency}` };
  }
  if (gift.publicSector) {
    const written = rule.gift_limit.public_sector_needs_written_account_approval ? " with written approval from the account" : "";
    return { decision: "needs_approval", reason: `public-sector account${written}` };
  }
  if (gift.value > rule.gift_limit.private_sector) {
    return { decision: "needs_approval", reason: `over the ${rule.gift_limit.private_sector} ${rule.gift_limit.currency} limit` };
  }
  return { decision: "allowed" };
}

/** What the compliance check expects in an ABM email, plus the Singapore "<ADV>" label on bulk tiers. */
export function emailRequirements(contactCountry: string, tier: number): { elements: string[]; subjectPrefix: string | null } {
  const rule = marketRule(contactCountry);
  const bulk = rule.bulk_email_subject_label && rule.bulk_applies_to_tiers?.includes(tier);
  return { elements: rule.required_in_email, subjectPrefix: bulk ? rule.bulk_email_subject_label! : null };
}

/** Locale for an asset: Arabic for government-linked GCC buyers, French in Quebec, else the first market language. */
export function assetLocale(accountCountry: string, opts: { subdivision?: string; governmentLinked?: boolean; contactLanguage?: string } = {}): string {
  const rule = marketRule(accountCountry, opts.subdivision);
  if (rule.languages === "contact_business_language") {
    if (!opts.contactLanguage) throw new Error(`${accountCountry} needs the contact's business language`);
    return opts.contactLanguage;
  }
  const langs = rule.languages as string[];
  if (opts.governmentLinked && rule.arabic_required_for?.length) {
    const ar = langs.find((l) => l.startsWith("ar"));
    if (ar) return ar;
  }
  return langs[0];
}
