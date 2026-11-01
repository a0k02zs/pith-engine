import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";
import { catalog, SERVICES } from "../server/catalog.js";
import type { Fetch } from "../server/connections.js";
import { clientLinks, serviceLinks } from "../server/links.js";
import { Store } from "../server/store.js";
import { Workspace } from "../server/workspace.js";

const NOW = Date.UTC(2026, 10, 1, 12);
const REPO = join(__dirname, "..", "..", "..");
const H = (user = "u-boss") => ({ "content-type": "application/json", "x-pith-user": user });

function setup(opts: ConstructorParameters<typeof Workspace>[1] = {}) {
  const store = new Store({ now: NOW, seed: 5 });
  const ws = new Workspace(store, { env: {}, ...opts });
  const app = createApp(store, ws);
  const call = async (method: string, path: string, body?: unknown, user = "u-boss") => {
    const r = await app.request(`/api${path}`, { method, headers: H(user), body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: await r.json(), text: "" };
  };
  const byName = (p: string) => store.clients.find((c) => c.name.startsWith(p))!;
  return { store, ws, app, call, byName };
}

describe("platform links", () => {
  it("gives every service at least 3 real https platform links and a build pack folder that exists", () => {
    for (const s of SERVICES) {
      const l = serviceLinks(s.code);
      expect(l.platforms.length, s.code).toBeGreaterThanOrEqual(3);
      for (const p of l.platforms) expect(p.url, `${s.code} ${p.name}`).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]+\//);
      const folder = l.build_pack[0].url.split("/tree/main/")[1];
      expect(existsSync(join(REPO, folder)), folder).toBe(true);
    }
  });

  it("makes deep links only when the account ID is saved", () => {
    const { ws, byName } = setup();
    const lumen = clientLinks(ws.conn(byName("Lumen").id));
    const ads = lumen.find((l) => l.platform === "meta_ads")!;
    expect(ads.deep).toBe(true);
    expect(ads.url).toContain("act=100000000000002");
    expect(lumen.find((l) => l.platform === "ga4")!.deep).toBe(false);
  });
});

describe("client connections", () => {
  it("saves Meta IDs, strips act_ and rejects bad IDs with a hint", async () => {
    const { call, byName } = setup();
    const id = byName("Northwind").id;
    const ok = await call("PUT", `/clients/${id}/connections/meta`, { ad_account_id: "act_123456789", business_id: "987654321" });
    expect(ok.status).toBe(200);
    expect(ok.body.meta.ad_account_id).toBe("123456789");
    expect(ok.body.meta.status).toBe("ids_saved");
    const bad = await call("PUT", `/clients/${id}/connections/meta`, { ad_account_id: "abc" });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/Ad account ID/);
    const g = await call("PUT", `/clients/${id}/connections/google_ads`, { customer_id: "123-456-7890" });
    expect(g.body.google_ads.customer_id).toBe("1234567890");
  });

  it("returns 503 for Meta sign-in when the server has no Meta app", async () => {
    const { call, byName } = setup();
    const r = await call("POST", "/oauth/meta/start", { client_id: byName("Northwind").id });
    expect(r.status).toBe(503);
  });

  it("runs the Meta sign-in, keeps the token encrypted and never returns it", async () => {
    const TOKEN = "EAAG-long-lived-secret-token";
    const seen: string[] = [];
    const fetcher: Fetch = async (url) => {
      seen.push(url);
      if (url.includes("/oauth/access_token") && url.includes("code=")) return Response.json({ access_token: "short-token" });
      if (url.includes("fb_exchange_token")) return Response.json({ access_token: TOKEN, expires_in: 5_184_000 });
      if (url.includes("/act_123456789?")) return Response.json({ name: "Northwind UK", currency: "GBP", account_status: 1 });
      return Response.json({ error: { message: "unexpected" } }, { status: 400 });
    };
    const env = { META_APP_ID: "111", META_APP_SECRET: "app-secret", META_REDIRECT_URI: "https://cc.example.com/api/oauth/meta/callback" };
    const { app, call, ws, byName } = setup({ env, fetch: fetcher });
    const id = byName("Northwind").id;
    await call("PUT", `/clients/${id}/connections/meta`, { ad_account_id: "123456789" });
    const start = await call("POST", "/oauth/meta/start", { client_id: id });
    expect(start.status).toBe(200);
    const url = new URL(start.body.url);
    expect(url.hostname).toBe("www.facebook.com");
    expect(url.searchParams.get("scope")).toContain("ads_read");
    const state = url.searchParams.get("state")!;

    const cb = await app.request(`/api/oauth/meta/callback?code=abc&state=${state}`);
    expect(cb.status).toBe(302);
    expect(cb.headers.get("location")).toBe(`/clients/${id}?tab=connections`);
    expect(ws.vault.rawSealed(`${id}:meta`)).not.toContain(TOKEN);
    expect(await ws.vault.get(`${id}:meta`)).toBe(TOKEN);
    expect(seen.some((u) => u.includes("appsecret_proof="))).toBe(true);

    const view = await call("GET", `/clients/${id}/connections`);
    expect(view.body.meta.status).toBe("connected");
    expect(view.body.meta.verified.name).toBe("Northwind UK");
    expect(view.body.meta.has_token).toBe(true);
    for (const path of [`/clients/${id}/connections`, `/clients/${id}`, "/audit", "/integrations"]) {
      expect(JSON.stringify((await call("GET", path)).body)).not.toContain(TOKEN);
    }
    const reuse = await app.request(`/api/oauth/meta/callback?code=abc&state=${state}`);
    expect(reuse.status).toBe(400);
  });
});

describe("client strategy", () => {
  it("uses real pipelines, the launch order and the market laws", async () => {
    const { call, byName } = setup();
    const nw = byName("Northwind");
    const s = (await call("GET", `/clients/${nw.id}/strategy`)).body;
    expect(s.plays.length).toBe(nw.services.length);
    for (const p of s.plays) for (const w of p.pipelines) expect(catalog.workflows.some((x) => x.id === w.id), w.id).toBe(true);
    expect(s.markets.map((m: { country: string }) => m.country)).toEqual(["GB", "NL", "DE"]);
    expect(s.markets[1].laws).toContain("GDPR");
    expect(s.plays.reduce((a: number, p: { budget: number }) => a + p.budget, 0)).toBeGreaterThan(s.budget.monthly - 20);
    const dune = (await call("GET", `/clients/${byName("Dune").id}/strategy`)).body;
    expect(dune.risks.join(" ")).toMatch(/Mawthooq/);
  });

  it("rebuilds the plan from a changed brain and sends it for 2-person approval", async () => {
    const { call, byName } = setup();
    const id = byName("Atlas").id;
    const b = await call("PUT", `/clients/${id}/brain`, { monthly_budget: 90000, goals: "Win 30 enterprise accounts\nGrow pipeline" });
    expect(b.status).toBe(200);
    const s = (await call("GET", `/clients/${id}/strategy`)).body;
    expect(s.budget.monthly).toBe(90000);
    expect(s.objectives[0].goal).toBe("Win 30 enterprise accounts");
    const sub = await call("POST", `/clients/${id}/strategy/submit`);
    expect(sub.body.status).toBe("in_review");
    const ap = (await call("GET", `/approvals/${sub.body.approval_id}`)).body;
    expect(ap.kind).toBe("plan");
    expect(ap.required_count).toBe(2);
    await call("POST", `/approvals/${ap.id}/decisions`, { decision: "approved" });
    expect((await call("GET", `/clients/${id}/strategy`)).body.status).toBe("in_review");
    await call("POST", `/approvals/${ap.id}/decisions`, { decision: "approved" }, "u-client");
    expect((await call("GET", `/clients/${id}/strategy`)).body.status).toBe("approved");
  });

  it("returns 503 for Claude without a key, and adds notes with one", async () => {
    const off = setup();
    expect((await off.call("POST", `/clients/${off.byName("Lumen").id}/strategy/improve`)).status).toBe(503);
    const on = setup({ improver: async ({ strategy }) => ({ summary: "Sharper.", quick_wins: ["Fix tracking"], risks: [], play_notes: { [strategy.plays[0].service]: "Do this" } }) });
    const r = await on.call("POST", `/clients/${on.byName("Lumen").id}/strategy/improve`);
    expect(r.status).toBe(200);
    expect(r.body.source).toBe("playbooks+claude");
    expect(r.body.claude_notes.summary).toBe("Sharper.");
  });
});

describe("video studio (beta)", () => {
  const brief = (client_id: string, extra: Record<string, unknown> = {}) => ({
    client_id, product: "Calm Barrier Serum", audience: "Women 22-40 with sensitive skin", objective: "conversions",
    platforms: ["meta_reels", "tiktok"], duration_s: 15, aspect: "9:16", markets: ["SG", "GB"], offer: "Starter kit", cta: "Shop now", ...extra,
  });

  it("refuses a client that does not buy video, and blocks a real likeness without consent", async () => {
    const { call, byName } = setup();
    expect((await call("POST", "/video/projects", brief(byName("Northwind").id))).status).toBe(422);
    const p = (await call("POST", "/video/projects", brief(byName("Lumen").id, { uses_real_likeness: true }))).body;
    expect(p.checks.outcome).toBe("block");
    await call("POST", `/video/projects/${p.id}/storyboard`);
    const g = await call("POST", `/video/projects/${p.id}/generate`);
    expect(g.status).toBe(422);
    expect(g.body.error).toMatch(/consent/);
  });

  it("runs brief to export with AI labels, 3 variants and the client gate", async () => {
    const { call, byName } = setup();
    const p = (await call("POST", "/video/projects", brief(byName("Lumen").id))).body;
    expect(p.checks.ai_labels.map((l: { label: string }) => l.label).join(" ")).toMatch(/AI info.*AI-generated/);
    const sb = (await call("POST", `/video/projects/${p.id}/storyboard`)).body;
    expect(sb.shots.length).toBe(4);
    expect(new Set(sb.shots.map((s: { engine: string }) => s.engine))).toEqual(new Set(["runway", "higgsfield"]));
    expect((await call("POST", `/video/projects/${p.id}/export`)).status).toBe(409);
    const gen = (await call("POST", `/video/projects/${p.id}/generate`)).body;
    expect(gen.variants.length).toBe(3);
    expect(gen.variants.every((v: { jobs: Array<{ mode: string }> }) => v.jobs.every((j) => j.mode === "simulated"))).toBe(true);
    await call("POST", `/video/projects/${p.id}/refresh`);
    const ready = (await call("POST", `/video/projects/${p.id}/refresh`)).body;
    expect(ready.status).toBe("review");
    await call("POST", `/video/projects/${p.id}/select`, { variant_id: ready.variants[0].id });
    const sub = (await call("POST", `/video/projects/${p.id}/submit`)).body;
    expect(sub.status).toBe("in_approval");
    const ap = (await call("GET", `/approvals/${sub.approval_id}`)).body;
    expect(ap.kind).toBe("creative");
    expect(ap.required_roles).toEqual(["creative_lead", "client_approver"]);
    expect((await call("POST", `/video/projects/${p.id}/storyboard`)).status).toBe(409);
    await call("POST", `/approvals/${ap.id}/decisions`, { decision: "approved" });
    await call("POST", `/approvals/${ap.id}/decisions`, { decision: "approved" }, "u-client");
    const done = (await call("POST", `/video/projects/${p.id}/export`)).body;
    expect(done.status).toBe("exported");
    expect(done.export.files[0].label).toMatch(/AI info/);
  });

  it("calls the Runway API with the server key when one is set and a key frame exists", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher: Fetch = async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith("/v1/image_to_video")) return Response.json({ id: "task-1" });
      if (url.includes("/v1/tasks/task-1")) return Response.json({ status: "SUCCEEDED", output: ["https://cdn.example.com/out.mp4"] });
      return Response.json({}, { status: 404 });
    };
    const { call, byName } = setup({ env: { RUNWAYML_API_SECRET: "rw-secret" }, fetch: fetcher });
    const p = (await call("POST", "/video/projects", brief(byName("Lumen").id, { key_frame_url: "https://cdn.example.com/serum.png" }))).body;
    await call("POST", `/video/projects/${p.id}/storyboard`);
    const gen = (await call("POST", `/video/projects/${p.id}/generate`)).body;
    const rw = gen.variants.find((v: { mix: string }) => v.mix === "runway");
    expect(rw.jobs.every((j: { mode: string }) => j.mode === "live")).toBe(true);
    const first = calls.find((c) => c.url.endsWith("/v1/image_to_video"))!;
    const headers = first.init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer rw-secret");
    expect(headers["X-Runway-Version"]).toBe("2024-11-06");
    expect(JSON.parse(String(first.init!.body))).toMatchObject({ model: "gen4.5", ratio: "720:1280", promptImage: "https://cdn.example.com/serum.png" });
    expect(JSON.stringify(gen)).not.toContain("rw-secret");
    await call("POST", `/video/projects/${p.id}/refresh`);
    const after = (await call("GET", `/video/projects/${p.id}`)).body;
    expect(after.variants.find((v: { mix: string }) => v.mix === "runway").jobs[0].output_url).toBe("https://cdn.example.com/out.mp4");
  });
});
