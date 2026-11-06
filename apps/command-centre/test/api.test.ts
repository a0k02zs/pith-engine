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
    expect((await r.json()).contract_version).toBe("0.1.0");
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
