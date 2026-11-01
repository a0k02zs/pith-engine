// Client account connections. Account IDs are plain settings. Access tokens are secrets:
// they live only on the server, encrypted with AES-GCM, and no API response ever contains one.
// Uses Web Crypto (globalThis.crypto) so the same code runs in Node 22 and in the preview build.
import { ApiError } from "./store.js";

export type ConnStatus = "not_connected" | "ids_saved" | "connected" | "error";

export interface MetaConnection {
  business_id: string | null;
  ad_account_id: string | null;
  page_id: string | null;
  instagram_id: string | null;
  pixel_id: string | null;
  status: ConnStatus;
  connected_by: string | null;
  connected_at: string | null;
  token_expires_at: string | null;
  scopes: string[];
  verified: { name: string; currency: string; account_status: number } | null;
  last_error: string | null;
}

export interface ClientConnections {
  meta: MetaConnection;
  google_ads: { customer_id: string | null; status: ConnStatus };
  ga4: { property_id: string | null; site_url: string | null; status: ConnStatus };
  linkedin: { ad_account_id: string | null; status: ConnStatus };
  tiktok: { advertiser_id: string | null; status: ConnStatus };
  hubspot: { portal_id: string | null; status: ConnStatus };
}

export const PLATFORM_KEYS = ["meta", "google_ads", "ga4", "linkedin", "tiktok", "hubspot"] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export function emptyConnections(): ClientConnections {
  return {
    meta: {
      business_id: null, ad_account_id: null, page_id: null, instagram_id: null, pixel_id: null, status: "not_connected",
      connected_by: null, connected_at: null, token_expires_at: null, scopes: [], verified: null, last_error: null,
    },
    google_ads: { customer_id: null, status: "not_connected" },
    ga4: { property_id: null, site_url: null, status: "not_connected" },
    linkedin: { ad_account_id: null, status: "not_connected" },
    tiktok: { advertiser_id: null, status: "not_connected" },
    hubspot: { portal_id: null, status: "not_connected" },
  };
}

// ---------- validation ----------

type FieldRule = { re: RegExp; normalize?: (v: string) => string; hint: string };
const digits = (min: number, max: number, hint: string): FieldRule => ({ re: new RegExp(`^\\d{${min},${max}}$`), hint });

export const FIELD_RULES: Record<PlatformKey, Record<string, FieldRule>> = {
  meta: {
    business_id: digits(6, 20, "Business Manager ID: digits only, from Business settings > Business info."),
    ad_account_id: { re: /^\d{6,20}$/, normalize: (v) => v.replace(/^act_/i, ""), hint: "Ad account ID: digits, with or without act_. From Ads Manager > account menu." },
    page_id: digits(6, 20, "Facebook Page ID: digits only. From the Page > About > Page transparency."),
    instagram_id: digits(6, 20, "Instagram account ID: digits only. From Business settings > Instagram accounts."),
    pixel_id: digits(6, 20, "Pixel (dataset) ID: digits only. From Events Manager."),
  },
  google_ads: { customer_id: { re: /^\d{10}$/, normalize: (v) => v.replace(/[-\s]/g, ""), hint: "Customer ID: 10 digits, for example 123-456-7890." } },
  ga4: {
    property_id: digits(6, 12, "GA4 property ID: digits only. From Admin > Property details."),
    site_url: { re: /^(https:\/\/[^\s/]+\.[^\s/]+\/?|sc-domain:[a-z0-9.-]+)$/i, hint: "Website: https://example.com/ or sc-domain:example.com." },
  },
  linkedin: { ad_account_id: digits(6, 12, "LinkedIn ad account ID: digits. From Campaign Manager > Accounts.") },
  tiktok: { advertiser_id: digits(10, 20, "TikTok advertiser ID: digits. From TikTok Ads Manager > account info.") },
  hubspot: { portal_id: digits(3, 12, "HubSpot portal (Hub) ID: digits. From the account menu.") },
};

/** Saves account IDs for one platform. Empty strings clear a field. Returns the updated record. */
export function saveIds(conn: ClientConnections, platform: string, body: Record<string, unknown>): ClientConnections[PlatformKey] {
  if (!PLATFORM_KEYS.includes(platform as PlatformKey)) throw new ApiError(404, `Unknown platform ${platform}`);
  const key = platform as PlatformKey;
  const rules = FIELD_RULES[key];
  const target = conn[key] as unknown as Record<string, unknown>;
  const errors: string[] = [];
  for (const [field, raw] of Object.entries(body)) {
    const rule = rules[field];
    if (!rule) continue;
    const v = String(raw ?? "").trim();
    if (!v) {
      target[field] = null;
      continue;
    }
    const n = rule.normalize ? rule.normalize(v) : v;
    if (!rule.re.test(n)) errors.push(rule.hint);
    else target[field] = n;
  }
  if (errors.length) throw new ApiError(400, errors.join(" "));
  const hasIds = Object.keys(rules).some((f) => target[f]);
  if (target.status !== "connected") target.status = hasIds ? "ids_saved" : "not_connected";
  return conn[key];
}

// ---------- token vault ----------

const subtle = () => globalThis.crypto.subtle;
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** AES-GCM vault. The key comes from PITH_TOKEN_KEY (32 bytes, base64). Without it the key lives only in memory. */
export class TokenVault {
  private key: Promise<CryptoKey>;
  private sealed = new Map<string, string>();
  readonly persistentKey: boolean;

  constructor(base64Key?: string | null) {
    this.persistentKey = Boolean(base64Key);
    const raw = base64Key ? unb64(base64Key) : globalThis.crypto.getRandomValues(new Uint8Array(32));
    if (raw.length !== 32) throw new Error("PITH_TOKEN_KEY must be 32 bytes, base64 encoded");
    this.key = subtle().importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  }

  async put(ref: string, secret: string) {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, await this.key, new TextEncoder().encode(secret)));
    this.sealed.set(ref, `${b64(iv)}.${b64(ct)}`);
  }

  async get(ref: string): Promise<string | null> {
    const s = this.sealed.get(ref);
    if (!s) return null;
    const [iv, ct] = s.split(".").map(unb64);
    const pt = await subtle().decrypt({ name: "AES-GCM", iv }, await this.key, ct);
    return new TextDecoder().decode(pt);
  }

  has(ref: string) {
    return this.sealed.has(ref);
  }

  delete(ref: string) {
    this.sealed.delete(ref);
  }

  /** The stored form, for tests: it must never contain the plain token. */
  rawSealed(ref: string) {
    return this.sealed.get(ref) ?? null;
  }
}

// ---------- Meta (Facebook Login for Business) ----------

export interface MetaConfig {
  app_id: string | null;
  app_secret: string | null;
  graph_version: string;
  redirect_uri: string | null;
  scopes: string[];
}

export function metaConfig(env: Record<string, string | undefined>): MetaConfig {
  return {
    app_id: env.META_APP_ID || null,
    app_secret: env.META_APP_SECRET || null,
    graph_version: env.META_GRAPH_VERSION || "v23.0",
    redirect_uri: env.META_REDIRECT_URI || (env.PUBLIC_BASE_URL ? `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/api/oauth/meta/callback` : null),
    scopes: ["ads_read", "ads_management", "business_management", "pages_show_list", "pages_read_engagement", "instagram_basic"],
  };
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

async function hmacHex(secret: string, msg: string) {
  const k = await subtle().importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await subtle().sign("HMAC", k, new TextEncoder().encode(msg)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class MetaOAuth {
  private states = new Map<string, { client_id: string; user: string; exp: number }>();
  constructor(private cfg: MetaConfig, private fetcher: Fetch, private now: () => number) {}

  get configured() {
    return Boolean(this.cfg.app_id && this.cfg.app_secret && this.cfg.redirect_uri);
  }

  private graph(path: string) {
    return `https://graph.facebook.com/${this.cfg.graph_version}${path}`;
  }

  /** The Facebook Login URL the user opens to grant Pith access to the client's assets. */
  start(clientId: string, userId: string): string {
    if (!this.configured) throw new ApiError(503, "Meta sign-in is not set up on this server yet. An admin sets META_APP_ID, META_APP_SECRET and META_REDIRECT_URI. You can save the account IDs now.");
    const state = b64(globalThis.crypto.getRandomValues(new Uint8Array(18))).replace(/[+/=]/g, "x");
    this.states.set(state, { client_id: clientId, user: userId, exp: this.now() + 10 * 60_000 });
    const q = new URLSearchParams({ client_id: this.cfg.app_id!, redirect_uri: this.cfg.redirect_uri!, state, response_type: "code", scope: this.cfg.scopes.join(",") });
    return `https://www.facebook.com/${this.cfg.graph_version}/dialog/oauth?${q}`;
  }

  /** Checks the state, swaps the code for a long-lived token. Returns the client the state was for. */
  async callback(code: string, state: string): Promise<{ client_id: string; user: string; token: string; expires_at: string | null }> {
    const s = this.states.get(state);
    this.states.delete(state);
    if (!s || s.exp < this.now()) throw new ApiError(400, "This sign-in link expired or was already used. Start again from Connections.");
    if (!this.configured) throw new ApiError(503, "Meta sign-in is not set up on this server.");
    const short = await this.json(this.graph(`/oauth/access_token?${new URLSearchParams({ client_id: this.cfg.app_id!, client_secret: this.cfg.app_secret!, redirect_uri: this.cfg.redirect_uri!, code })}`));
    const long = await this.json(this.graph(`/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: this.cfg.app_id!, client_secret: this.cfg.app_secret!, fb_exchange_token: String(short.access_token) })}`));
    const expires = typeof long.expires_in === "number" ? new Date(this.now() + long.expires_in * 1000).toISOString() : null;
    return { client_id: s.client_id, user: s.user, token: String(long.access_token ?? short.access_token), expires_at: expires };
  }

  /** Reads the ad account with the stored token, to prove the connection works. */
  async verifyAdAccount(token: string, adAccountId: string): Promise<{ name: string; currency: string; account_status: number }> {
    const proof = this.cfg.app_secret ? await hmacHex(this.cfg.app_secret, token) : null;
    const q = new URLSearchParams({ fields: "name,currency,account_status", access_token: token });
    if (proof) q.set("appsecret_proof", proof);
    const r = await this.json(this.graph(`/act_${adAccountId}?${q}`));
    return { name: String(r.name ?? ""), currency: String(r.currency ?? ""), account_status: Number(r.account_status ?? 0) };
  }

  private async json(url: string): Promise<Record<string, any>> {
    const res = await this.fetcher(url);
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || body.error) {
      // Never echo the URL: it holds the app secret or the token.
      throw new ApiError(502, `Meta said: ${body.error?.message ?? res.statusText}`);
    }
    return body;
  }
}

/** The connections a client sees in the API: account IDs and status, never a token. */
export function publicConnections(conn: ClientConnections, hasToken: (p: PlatformKey) => boolean) {
  return {
    ...conn,
    meta: { ...conn.meta, has_token: hasToken("meta") },
  };
}
