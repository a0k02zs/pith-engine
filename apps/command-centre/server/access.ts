// Access gate. One shared access code protects the whole API until the engine supplies real users.
// Uses Web Crypto only, so the same code runs in Node, on Vercel and in the browser preview build.
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export type Env = Record<string, string | undefined>;

export const SESSION_COOKIE = "pith_session";
const SESSION_HOURS = 12;
const MAX_FAILS = 8;
const FAIL_WINDOW_MS = 10 * 60_000;

/** Keys that cost money or reach real accounts. The server ignores them while the app is open. */
export const LIVE_KEYS = ["ANTHROPIC_API_KEY", "META_APP_SECRET", "RUNWAYML_API_SECRET", "HF_API_KEY_ID", "HF_API_KEY_SECRET"] as const;

/**
 * The environment the server may use. With no PITH_ACCESS_CODE anyone with the URL can call the API,
 * so the live keys are removed and every integration runs simulated.
 */
export function runtimeEnv(env: Env): Env {
  if (env.PITH_ACCESS_CODE) return env;
  const safe: Env = { ...env };
  for (const k of LIVE_KEYS) delete safe[k];
  return safe;
}

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}

/** Compares 2 strings in a time that does not depend on where they differ. */
function sameText(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export class Access {
  readonly enabled: boolean;
  private code: string;
  private secret: string;
  private now: () => number;
  private fails = new Map<string, { count: number; first: number }>();

  constructor(opts: { code?: string | null; secret?: string | null; now?: () => number } = {}) {
    this.code = opts.code ?? "";
    this.enabled = this.code.length > 0;
    // Without a separate secret the signing key comes from the code, so every server instance agrees.
    this.secret = opts.secret || `pith-session:${this.code}`;
    this.now = opts.now ?? (() => Date.now());
  }

  static fromEnv(env: Env, now?: () => number): Access {
    return new Access({ code: env.PITH_ACCESS_CODE, secret: env.PITH_SESSION_SECRET, now });
  }

  async issue(): Promise<string> {
    const exp = String(this.now() + SESSION_HOURS * 3_600_000);
    return `${exp}.${await hmac(this.secret, exp)}`;
  }

  async valid(token: string | undefined): Promise<boolean> {
    if (!token) return false;
    const [exp, sig] = token.split(".");
    if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) <= this.now()) return false;
    return sameText(sig, await hmac(this.secret, exp));
  }

  async codeMatches(given: string): Promise<boolean> {
    // Compare digests, so the length of the real code does not leak.
    return sameText(await hmac(this.secret, given), await hmac(this.secret, this.code));
  }

  private blocked(who: string): boolean {
    const f = this.fails.get(who);
    if (!f) return false;
    if (this.now() - f.first > FAIL_WINDOW_MS) {
      this.fails.delete(who);
      return false;
    }
    return f.count >= MAX_FAILS;
  }

  private fail(who: string) {
    const f = this.fails.get(who);
    if (!f || this.now() - f.first > FAIL_WINDOW_MS) this.fails.set(who, { count: 1, first: this.now() });
    else f.count += 1;
    if (this.fails.size > 5000) this.fails.clear();
  }

  /** Blocks every API call that has no valid session. Health and the session routes stay open. */
  guard(): MiddlewareHandler {
    return async (c, next) => {
      if (!this.enabled || c.req.method === "OPTIONS") return next();
      const path = c.req.path.replace(/^\/api/, "");
      if (path === "/health" || path === "/session") return next();
      if (await this.valid(getCookie(c, SESSION_COOKIE))) return next();
      return c.json({ error: "Sign in with the access code" }, 401);
    };
  }

  async status(c: Context) {
    return { protected: this.enabled, signed_in: !this.enabled || (await this.valid(getCookie(c, SESSION_COOKIE))) };
  }

  async signIn(c: Context, code: string): Promise<Response> {
    if (!this.enabled) return c.json({ protected: false, signed_in: true });
    const who = (c.req.header("x-forwarded-for") ?? "local").split(",")[0].trim();
    if (this.blocked(who)) return c.json({ error: "Too many wrong codes. Wait 10 minutes." }, 429);
    if (!code || !(await this.codeMatches(code))) {
      this.fail(who);
      return c.json({ error: "Wrong access code" }, 401);
    }
    this.fails.delete(who);
    const https = c.req.header("x-forwarded-proto") === "https" || c.req.url.startsWith("https:");
    setCookie(c, SESSION_COOKIE, await this.issue(), { path: "/", httpOnly: true, sameSite: "Lax", secure: https, maxAge: SESSION_HOURS * 3600 });
    return c.json({ protected: true, signed_in: true });
  }

  signOut(c: Context): Response {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ protected: this.enabled, signed_in: !this.enabled });
  }
}
