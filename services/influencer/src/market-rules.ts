import { readFileSync } from "node:fs";
import { dir, engineDir } from "./paths.js";

export interface Licence {
  type: "uae_media_council" | "mawthooq" | "other";
  /** true: block without a verified licence. "check_local": a person confirms the local rule before the deal. */
  required: true | "check_local";
}

export interface InfluencerMarketRules {
  market: string;
  /** Labels the engine accepts (compliance-rules.json disclosure_labels) plus this service's extra labels. */
  labels: string[];
  gift_labels: string[];
  weak_tags: string[];
  image_labels: string[];
  licence: Licence | null;
  restricted_categories: string[];
  outreach_notice: string;
  tax_forms: string[];
  language: { subdivision: string; required: string } | null;
  currency: string | null;
}

interface OverlayEntry {
  extra_labels?: string[];
  gift_labels?: string[];
  weak_tags_extra?: string[];
  weak_tags_allowed?: string[];
  image_labels?: string[];
  /** Stricter market rule: only these labels count (FR). */
  labels_only?: string[];
  licence?: Licence | null;
  restricted_categories?: string[];
  restricted_categories_extra?: string[];
  outreach_notice?: string;
  tax_forms?: string[];
  language?: { subdivision: string; required: string } | null;
  inherits?: string;
}

interface EngineMarket {
  group?: string;
  currency?: string;
  disclosure_labels?: string[];
  inherits?: string;
}

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const overlay = readJson(dir("config", "market-rules.json")) as {
  global: Record<string, unknown> & { weak_tags: string[] };
  markets: Record<string, OverlayEntry>;
};
const engineRules = readJson(engineDir("specs", "compliance-rules.json")) as { markets: Record<string, EngineMarket> };
const enums = readJson(engineDir("contracts", "enums.json")) as { market_groups: Record<string, string[]> };

export const globalRules = overlay.global as {
  label_window_chars: number;
  weak_tags: string[];
  video_label_required: boolean;
  gift_needs_label: boolean;
  min_real_follower_pct: number;
  min_audience_in_market_pct: { b2c: number; b2b: number };
  brand_safety_lookback_months: number;
  competitor_lookback_days: number;
  minor_banned_categories: string[];
  payout_terms_business_days: { target: number; max: number };
  outreach_follow_up_days: number[];
  max_review_rounds: number;
};

const groupOf = (market: string) => Object.entries(enums.market_groups).find(([, ms]) => ms.includes(market))?.[0];

/** Engine resolution: a market entry merges over its group default (EU members -> EU_DEFAULT, GCC -> GCC_DEFAULT). */
function engineMarket(market: string): EngineMarket {
  const group = groupOf(market);
  const fallback = group === "EU" ? engineRules.markets.EU_DEFAULT : group === "GCC" ? engineRules.markets.GCC_DEFAULT : undefined;
  return { ...(fallback ?? {}), ...Object.fromEntries(Object.entries(engineRules.markets[market] ?? {}).filter(([, v]) => v != null)) };
}

function overlayEntry(market: string): OverlayEntry {
  const own = overlay.markets[market];
  const parentKey = own?.inherits ?? (groupOf(market) === "EU" ? "EU_DEFAULT" : undefined);
  const parent = parentKey ? overlay.markets[parentKey] : undefined;
  if (!own && !parent) throw new Error(`No influencer market rules for ${market}`);
  const merged: OverlayEntry = { ...(parent ?? {}), ...(own ?? {}) };
  merged.extra_labels = [...(parent?.extra_labels ?? []), ...(own?.extra_labels ?? [])];
  merged.restricted_categories = [...(merged.restricted_categories ?? []), ...(own?.restricted_categories_extra ?? [])];
  return merged;
}

const uniq = (xs: string[]) => [...new Set(xs)];

/** Influencer rules for one ISO country code (GB, US, AE, DE ...). */
export function marketRules(market: string): InfluencerMarketRules {
  const eng = engineMarket(market);
  const o = overlayEntry(market);
  const weak = globalRules.weak_tags
    .concat(o.weak_tags_extra ?? [])
    .filter((t) => !(o.weak_tags_allowed ?? []).includes(t));
  const bare = (t: string) => t.toLocaleLowerCase().replace(/^#/, "");
  const weakBare = new Set(weak.map(bare));
  // A label that is a weak tag in this market does not count (DE: a bare "#ad" or "Ad").
  const labels = o.labels_only ?? uniq([...(eng.disclosure_labels ?? []), ...(o.extra_labels ?? [])]).filter((l) => !weakBare.has(bare(l)));
  return {
    market,
    labels,
    gift_labels: o.gift_labels ?? [],
    weak_tags: uniq(weak),
    image_labels: o.image_labels ?? [],
    licence: o.licence ?? null,
    restricted_categories: uniq(o.restricted_categories ?? []),
    outreach_notice: o.outreach_notice ?? "opt_out",
    tax_forms: o.tax_forms ?? [],
    language: o.language ?? null,
    currency: eng.currency ?? null,
  };
}

/** Every market this service has rules for: the 4 single markets, the 6 GCC states and the EU members. */
export const supportedMarkets = (): string[] =>
  ["UK", "SG", "NA", "GCC", "EU"].flatMap((g) => enums.market_groups[g] ?? []);
