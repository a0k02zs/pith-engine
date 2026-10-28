import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type Platform =
  | "linkedin" | "instagram" | "tiktok" | "youtube" | "facebook" | "x"
  | "snapchat" | "pinterest" | "threads" | "whatsapp_channel" | "xing";

export interface NoPostWindow {
  day: Weekday;
  from: string;
  to: string;
  reason: string;
}

export interface GlobalRules {
  disclosure_tools: Record<string, string>;
  ai_label_required_when: string;
  alt_text_required: boolean;
  captions_required_on_video: boolean;
  music: string;
  pii_retention_days: number;
  gate_b_always: string[];
  banned_everywhere: string[];
  caption_limits: Record<Platform, number>;
  hashtag_ranges: Record<Platform, [number, number]>;
  alt_text_max: number;
  min_brand_score: number;
  auto_reply: { min_match_confidence: number; daily_cap_per_account: number };
  pillar_tolerance_points: number;
  reactive_share: number;
  max_offer_share: number;
}

export interface MarketRules {
  group: string;
  languages: string[];
  native_editor_required?: string[];
  tone: string;
  platforms: { b2b: Platform[]; b2c: Platform[] };
  paid_post_label: string;
  label_position: "start_of_caption";
  week: { workdays: Weekday[] };
  no_post_windows?: NoPostWindow[];
  banned_imagery?: string[];
  sensitive_topics?: string[];
  restricted_sectors?: string[];
  creator_licence_required?: boolean;
  creator_licence?: string;
  key_dates: string[];
  [key: string]: unknown;
}

interface RawRules {
  global: GlobalRules;
  groups: Record<string, Partial<MarketRules>>;
  countries: Record<string, Partial<MarketRules> & { group: string }>;
}

const data = JSON.parse(readFileSync(dir("config", "market-rules.json"), "utf8")) as RawRules;

export const globalRules: GlobalRules = data.global;

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);

/**
 * Social rules for an engine market code: an ISO country (GB, SA, NL) or a subdivision (CA-QC).
 * A subdivision overrides its country, a country overrides its group. EU countries with no own entry use the EU group.
 */
export function marketRules(market: string): MarketRules {
  const country = market.slice(0, 2);
  const countryEntry = data.countries[country] ?? (EU.has(country) ? { group: "EU" } : undefined);
  if (!countryEntry) throw new Error(`No social rules for market ${market}`);
  const group = data.groups[countryEntry.group];
  if (!group) throw new Error(`No social rules for group ${countryEntry.group}`);
  const sub = market.length > 2 ? data.countries[market] : undefined;
  return { ...group, ...countryEntry, ...(sub ?? {}), group: countryEntry.group } as MarketRules;
}

/** True when posts in this language must go through a native editor before Gate A. */
export function needsNativeEditor(market: string, language: string): boolean {
  return (marketRules(market).native_editor_required ?? []).includes(language);
}
