import { describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";
import { Store } from "../server/store.js";

const NOW = Date.UTC(2026, 10, 1, 12);

describe("HTTP API", () => {
  const store = new Store({ now: NOW, seed: 3 });
  const app = createApp(store);

  it("serves health with the contract version", async () => {
    const r = await app.request("/api/health");
    expect(r.status).toBe(200);
    expect((await r.json()).contract_version).toBe("0.1.1");
  });

  it("returns 18 services", async () => {
    const r = await app.request("/api/services");
    expect((await r.json()).length).toBe(18);
  });

  it("returns 403 to a service token on decisions", async () => {
    const a = store.approvals.find((x) => x.status === "open")!;
    const r = await app.request(`/api/approvals/${a.id}/decisions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Service abc", "x-pith-user": "u-boss" },
      body: JSON.stringify({ decision: "approved" }),
    });
    expect(r.status).toBe(403);
  });

  it("starts a run with 202 and returns 404 for an unknown run", async () => {
    const c = store.clients[0];
    const r = await app.request("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json", "x-pith-user": "u-boss" },
      body: JSON.stringify({ client_id: c.id, workflow_id: "email.monthly_calendar" }),
    });
    expect(r.status).toBe(202);
    const run = await r.json();
    const d = await app.request(`/api/runs/${run.id}`);
    expect((await d.json()).workflow.id).toBe("email.monthly_calendar");
    expect((await app.request("/api/runs/nope")).status).toBe(404);
  });

  it("filters the inbox to the caller's roles with assignee=me", async () => {
    const r = await app.request("/api/approvals?status=open&assignee=me", { headers: { "x-pith-user": "u-analyst" } });
    const rows = await r.json();
    for (const a of rows) expect(a.required_roles).toContain("analytics_lead");
  });

  it("unknown API paths return 404 JSON", async () => {
    const r = await app.request("/api/nothing");
    expect(r.status).toBe(404);
  });
});

describe("Packages API", () => {
  const app = createApp(new Store({ now: NOW, seed: 3 }));

  it("lists 5 regions, 8 industries and 120 packages", async () => {
    const s = await (await app.request("/api/packages")).json();
    expect(s.regions.map((r: { id: string }) => r.id)).toEqual(["UK", "SG", "NA", "GCC", "EU"]);
    expect(s.industries.length).toBe(8);
    expect(s.package_count).toBe(120);
  });

  it("returns 3 tiers for a region and industry, with the foundation in each", async () => {
    const r = await app.request("/api/packages/GCC/b2c_property");
    expect(r.status).toBe(200);
    const list = await r.json();
    expect(list.map((p: { tier: string }) => p.tier)).toEqual(["launch", "growth", "scale"]);
    for (const p of list) expect(p.lines.some((l: { service: string }) => l.service === "brand")).toBe(true);
    // B2C in the GCC must carry the Arabic and RTL pack in its price.
    expect(list[0].prices[0].addons.some((a: { id: string }) => a.id === "gcc_arabic")).toBe(true);
    expect(list[0].prices.map((p: { currency: string }) => p.currency)).toEqual(["AED", "SAR"]);
  });

  it("returns 404 for an unknown industry", async () => {
    expect((await app.request("/api/packages/UK/nope")).status).toBe(404);
  });
});

describe("access gate", () => {
  const boot = async (now = () => NOW) => {
    const { Access, runtimeEnv } = await import("../server/access.js");
    const store = new Store({ now: NOW, seed: 3 });
    const access = Access.fromEnv({ PITH_ACCESS_CODE: "correct horse battery" }, now);
    return { app: createApp(store, undefined, access), access, runtimeEnv };
  };
  const signIn = (app: ReturnType<typeof createApp>, code: string, ip = "1.1.1.1") =>
    app.request("/api/session", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip, "x-forwarded-proto": "https" }, body: JSON.stringify({ code }) });

  it("stays open when no access code is set, and says so", async () => {
    const app = createApp(new Store({ now: NOW, seed: 3 }));
    expect((await (await app.request("/api/health")).json()).protected).toBe(false);
    expect(await (await app.request("/api/session")).json()).toEqual({ protected: false, signed_in: true });
    expect((await app.request("/api/clients")).status).toBe(200);
  });

  it("blocks every route but health and session without a session", async () => {
    const { app } = await boot();
    expect((await app.request("/api/health")).status).toBe(200);
    expect(await (await app.request("/api/session")).json()).toEqual({ protected: true, signed_in: false });
    for (const path of ["/api/clients", "/api/meta", "/api/integrations", "/api/audit", "/api/nothing"]) {
      expect((await app.request(path, { headers: { "x-pith-user": "u-boss" } })).status, path).toBe(401);
    }
    expect((await app.request("/api/runs", { method: "POST", body: "{}" })).status).toBe(401);
  });

  it("rejects a wrong code and accepts the right one with an HttpOnly cookie", async () => {
    const { app } = await boot();
    expect((await signIn(app, "wrong")).status).toBe(401);
    expect((await signIn(app, "")).status).toBe(401);
    const ok = await signIn(app, "correct horse battery");
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^pith_session=\d+\.[0-9a-f]{64};/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Secure/);
    const session = cookie.split(";")[0];
    expect((await app.request("/api/clients", { headers: { cookie: session } })).status).toBe(200);
    expect(await (await app.request("/api/session", { headers: { cookie: session } })).json()).toEqual({ protected: true, signed_in: true });
  });

  it("rejects a forged, changed or expired session", async () => {
    let t = NOW;
    const { app, access } = await boot(() => t);
    const token = await access.issue();
    const [exp, sig] = token.split(".");
    const get = (v: string) => app.request("/api/clients", { headers: { cookie: `pith_session=${v}` } });
    expect((await get(token)).status).toBe(200);
    expect((await get(`${Number(exp) + 1}.${sig}`)).status).toBe(401);
    expect((await get(`${exp}.${"0".repeat(64)}`)).status).toBe(401);
    expect((await get("garbage")).status).toBe(401);
    t = NOW + 13 * 3_600_000;
    expect((await get(token)).status).toBe(401);
  });

  it("locks a caller out after 8 wrong codes, for 10 minutes", async () => {
    let t = NOW;
    const { app } = await boot(() => t);
    for (let i = 0; i < 8; i++) expect((await signIn(app, `bad-${i}`, "9.9.9.9")).status).toBe(401);
    expect((await signIn(app, "correct horse battery", "9.9.9.9")).status).toBe(429);
    expect((await signIn(app, "correct horse battery", "8.8.8.8")).status).toBe(200);
    t += 11 * 60_000;
    expect((await signIn(app, "correct horse battery", "9.9.9.9")).status).toBe(200);
  });

  it("clears the session on sign-out", async () => {
    const { app } = await boot();
    const r = await app.request("/api/session", { method: "DELETE" });
    expect(r.headers.get("set-cookie")).toMatch(/pith_session=;/);
  });

  it("removes the live keys from the environment while the app is open", async () => {
    const { runtimeEnv } = await boot();
    const env = { ANTHROPIC_API_KEY: "k", META_APP_SECRET: "s", RUNWAYML_API_SECRET: "r", HF_API_KEY_ID: "i", HF_API_KEY_SECRET: "h", META_APP_ID: "1", PORT: "1" };
    expect(runtimeEnv(env)).toEqual({ META_APP_ID: "1", PORT: "1" });
    expect(runtimeEnv({ ...env, PITH_ACCESS_CODE: "x" })).toEqual({ ...env, PITH_ACCESS_CODE: "x" });
  });
});
