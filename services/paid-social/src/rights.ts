/** Creator ads: which rights grants allow which ad type, the end date, and what to pause when a grant ends. */

export interface RightsGrant {
  id: string;
  scope: string[];
  markets?: string[];
  starts_at?: string;
  expires_at?: string | null;
  revoked_at?: string | null;
}

export type CreatorAdType = "spark" | "partnership" | "whitelisted";

/** A grant is usable on a date when it has started, is not revoked and has not expired, and covers the market (no markets list means all). */
export function grantUsable(g: RightsGrant, market: string, on: Date): boolean {
  if (g.revoked_at) return false;
  if (g.starts_at && new Date(g.starts_at) > on) return false;
  if (g.expires_at && new Date(g.expires_at) <= on) return false;
  const iso = market.slice(0, 2);
  return !g.markets || g.markets.length === 0 || g.markets.includes(iso);
}

/**
 * The ad type the grants allow: Spark Ad (TikTok) or partnership ad (Meta) need paid_usage; running from the creator's handle needs whitelisting.
 * Returns null when no usable grant allows a creator ad on the platform.
 */
export function creatorAdType(platform: string, grants: RightsGrant[], market: string, on: Date): CreatorAdType | null {
  const scopes = new Set(grants.filter((g) => grantUsable(g, market, on)).flatMap((g) => g.scope));
  if (scopes.has("paid_usage") && platform === "tiktok") return "spark";
  if (scopes.has("paid_usage") && platform === "meta") return "partnership";
  if (scopes.has("whitelisting")) return "whitelisted";
  return null;
}

const DAY_MS = 86_400_000;

/** Latest allowed end date (YYYY-MM-DD, UTC): 2 days before the earliest expiry of the grants used. Null when no grant expires. */
export function latestEndDate(grants: RightsGrant[]): string | null {
  const expiries = grants.map((g) => g.expires_at).filter((e): e is string => !!e).map((e) => new Date(e).getTime());
  if (expiries.length === 0) return null;
  return new Date(Math.min(...expiries) - 2 * DAY_MS).toISOString().slice(0, 10);
}

export interface LiveAd {
  ad_id: string;
  platform: string;
  rights_grant_ids: string[];
}

/** Live ads to pause after engine/rights.changed for a grant that is no longer active. */
export const adsToPause = (ads: LiveAd[], grantId: string) => ads.filter((a) => a.rights_grant_ids.includes(grantId));
