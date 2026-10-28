import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { dir } from "./paths.js";

export type Channel = "sms" | "whatsapp" | "push";
export type Weekday = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface SendWindow {
  start: string;
  end: string;
  /** IANA time zone, or "recipient_local" when the contact's own zone applies. */
  tz: string;
  /** Other hours on weekend days (Canada). */
  weekend?: { start: string; end: string };
}

export interface GlobalRules {
  optout_keywords_any_language: string[];
  help_keywords: string[];
  optin_keywords: string[];
  optout_policy: string;
  consent_record_fields: string[];
  whatsapp: {
    optin_required: boolean;
    customer_service_window_hours: number;
    template_categories: string[];
    utility_must_not_contain_promotion: boolean;
    honour_block_and_stop: boolean;
  };
}

/** One market block as it is in market-rules.yaml. */
export interface RawMarket {
  name: string;
  law: string[];
  consent: Record<Channel, string>;
  consent_proof: string[];
  sender: Record<string, unknown>;
  window: SendWindow;
  window_verify?: boolean;
  weekend?: Weekday[];
  quiet_days?: string[];
  optout_keywords: string[];
  required_in_message: string[];
  pre_send_checks: string[];
  languages: string[];
  prayer_time_pause?: boolean;
  stricter_states?: Record<string, { window?: { start: string; end: string }; max_per_24h_same_topic?: number } | boolean>;
  country_overrides?: Record<string, Partial<RawMarket> & { verify?: boolean }>;
  quebec?: { language: string; rule: string };
  dnc?: { required_for: string[]; result_valid_days: number; verify?: boolean };
  [key: string]: unknown;
}

export interface RulesFile {
  global: GlobalRules;
  markets: Record<string, RawMarket>;
}

/** The rules for one contact's country (and subdivision), with overrides and global words merged in. */
export interface ResolvedRules {
  /** ISO country code of the contact, for example "FR". */
  country: string;
  /** The market block used: the country itself, or "EU" for an EU member state. */
  market: string;
  subdivision?: string;
  name: string;
  consent: Record<Channel, string>;
  window: SendWindow;
  weekend: Weekday[];
  quiet_days: string[];
  optout_keywords: string[];
  help_keywords: string[];
  optin_keywords: string[];
  required_in_message: string[];
  pre_send_checks: string[];
  languages: string[];
  /** Language that marketing must use, for example fr-CA in Quebec. */
  required_language?: string;
  max_per_24h_same_topic?: number;
  prayer_time_pause: boolean;
  dnc_valid_days?: number;
  /** True when local counsel or the aggregator must confirm a rule before the first live send. */
  verify: boolean;
}

export const EU_MEMBERS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
] as const;

/** The file the engine compliance gate reads (compliance-rules.json channel_overlays). */
export const MARKET_RULES_PATH = dir("market-rules.yaml");

let cached: RulesFile | undefined;

export function loadRulesFile(): RulesFile {
  cached ??= parse(readFileSync(MARKET_RULES_PATH, "utf8")) as RulesFile;
  return cached;
}

const unique = (words: string[]) => [...new Set(words)];

/**
 * Resolve the rules for a contact. country is ISO 3166-1 alpha-2. subdivision is ISO 3166-2,
 * for example "US-FL" or "CA-QC". Throws for a country that Pith does not serve.
 */
export function resolveMarket(country: string, subdivision?: string): ResolvedRules {
  const file = loadRulesFile();
  const cc = country.toUpperCase();
  const isEu = (EU_MEMBERS as readonly string[]).includes(cc);
  const market = isEu ? "EU" : cc;
  const base = file.markets[market];
  if (!base) throw new Error(`No messaging rules for country ${country}`);
  const override = isEu ? base.country_overrides?.[cc] ?? {} : {};

  let verify = Boolean(base.window_verify) || Boolean((base.sender as { verify?: boolean }).verify) || Boolean(base.dnc?.verify);
  if (override.verify) verify = true;

  const window: SendWindow = { ...base.window, ...(override.window ?? {}) };
  const resolved: ResolvedRules = {
    country: cc,
    market,
    name: base.name,
    consent: base.consent,
    window,
    weekend: base.weekend ?? ["Saturday", "Sunday"],
    quiet_days: override.quiet_days ?? base.quiet_days ?? [],
    optout_keywords: unique([...(override.optout_keywords ?? base.optout_keywords), ...file.global.optout_keywords_any_language]),
    help_keywords: file.global.help_keywords,
    optin_keywords: file.global.optin_keywords,
    required_in_message: base.required_in_message,
    pre_send_checks: base.pre_send_checks,
    languages: override.languages ?? base.languages,
    prayer_time_pause: Boolean(base.prayer_time_pause),
    dnc_valid_days: base.dnc?.result_valid_days,
    verify,
  };

  const sub = subdivision?.toUpperCase();
  if (sub) {
    if (!sub.startsWith(`${cc}-`)) throw new Error(`Subdivision ${subdivision} is not in ${country}`);
    resolved.subdivision = sub;
    const state = base.stricter_states?.[sub.slice(cc.length + 1)];
    if (state && typeof state === "object") {
      if (state.window) resolved.window = { ...resolved.window, ...state.window };
      resolved.max_per_24h_same_topic = state.max_per_24h_same_topic;
      if (base.stricter_states?.verify === true) resolved.verify = true;
    }
    if (sub === "CA-QC" && base.quebec) resolved.required_language = base.quebec.language;
  }
  return resolved;
}

/** Every market code in the file, for example "GB", "US", "EU". */
export const marketCodes = () => Object.keys(loadRulesFile().markets);
