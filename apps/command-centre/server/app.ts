import { Hono } from "hono";
import type { Context } from "hono";
import { catalog, SERVICES, serviceInfo, workflowById } from "./catalog.js";
import { ApiError, Store } from "./store.js";
import type { Decision, ServiceCode } from "./types.js";

// HTTP API. Paths mirror engine/contracts/openapi.yaml under /api so the UI can move to the
// real engine by changing the base URL. Extra read models (overview, services) are UI-only.
export function createApp(store: Store) {
  const app = new Hono();

  const actor = (c: Context) => store.user(c.req.header("x-pith-user"));
  const isServiceToken = (c: Context) =>
    c.req.header("x-pith-actor") === "service" || /^service\s/i.test(c.req.header("authorization") ?? "");

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status as 400);
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  });

  const api = new Hono();

  api.get("/health", (c) => c.json({ ok: true, contract_version: catalog.contract_version, test_data: true }));

  api.get("/meta", (c) =>
    c.json({
      contract_version: catalog.contract_version,
      market_groups: catalog.market_groups,
      market_launch_order: catalog.market_launch_order,
      roles: catalog.roles,
      approval_kinds: catalog.approval_kinds,
      kpis: catalog.kpis,
      tool_risk_meaning: catalog.tool_risk_meaning,
      users: store.users,
      workflow_count: catalog.workflows.length,
    }),
  );

  api.get("/me", (c) => c.json(actor(c)));

  api.get("/overview", (c) => c.json(store.overview(c.req.query("client_id") || undefined)));

  api.get("/services", (c) => c.json(SERVICES));

  api.get("/services/:code", (c) => {
    const code = c.req.param("code") as ServiceCode;
    if (!SERVICES.some((s) => s.code === code)) throw new ApiError(404, "Service not found");
    return c.json({
      ...serviceInfo(code),
      workflows: catalog.workflows.filter((w) => w.service === code),
      clients: store.clients.filter((cl) => cl.services.includes(code)).map((cl) => cl.id),
    });
  });

  api.get("/workflows/:id", (c) => {
    const wf = workflowById(c.req.param("id"));
    if (!wf) throw new ApiError(404, "Workflow not found");
    return c.json(wf);
  });

  api.get("/clients", (c) => c.json(store.clients));
  api.get("/clients/:id", (c) => c.json(store.client(c.req.param("id"))));

  api.post("/clients/:id/pause", async (c) => {
    const body = await readJson(c);
    return c.json(store.pauseClient(c.req.param("id"), String(body.reason ?? ""), actor(c)));
  });
  api.post("/clients/:id/resume", async (c) => {
    const body = await readJson(c);
    return c.json(store.resumeClient(c.req.param("id"), String(body.reason ?? ""), actor(c)));
  });

  api.get("/runs", (c) => {
    const q = c.req.query();
    const rows = store.runs.filter((r) =>
      (!q.client_id || r.client_id === q.client_id) &&
      (!q.service || r.service === q.service) &&
      (!q.status || r.status === q.status) &&
      (!q.workflow_id || r.workflow_id === q.workflow_id));
    return c.json(rows.slice(0, Number(q.limit ?? 500)));
  });

  api.post("/runs", async (c) => {
    const body = await readJson(c);
    const run = store.startRun(
      { client_id: String(body.client_id ?? ""), workflow_id: String(body.workflow_id ?? ""), markets: Array.isArray(body.markets) ? body.markets.map(String) : undefined },
      actor(c),
    );
    return c.json(run, 202);
  });

  api.get("/runs/:id", (c) => {
    const run = store.run(c.req.param("id"));
    return c.json({
      ...run,
      workflow: workflowById(run.workflow_id),
      approvals: store.approvals.filter((a) => a.run_id === run.id),
      actions: store.audit.filter((a) => a.target === run.id),
    });
  });

  api.post("/runs/:id/cancel", (c) => c.json(store.cancelRun(c.req.param("id"), actor(c)), 202));
  api.post("/runs/:id/continue", (c) => c.json(store.continueRun(c.req.param("id"), actor(c))));

  api.get("/approvals", (c) => {
    const q = c.req.query();
    const me = actor(c);
    const rows = store.approvals
      .filter((a) =>
        (!q.client_id || a.client_id === q.client_id) &&
        (!q.status || a.status === q.status) &&
        (!q.kind || a.kind === q.kind) &&
        (!q.service || a.service === q.service) &&
        (!q.role || a.required_roles.includes(q.role)) &&
        (q.assignee !== "me" || a.required_roles.some((r) => me.roles.includes(r))) &&
        (q.overdue !== "true" || store.isOverdue(a)))
      .map((a) => ({ ...a, overdue: store.isOverdue(a) }));
    const prio = { urgent: 0, high: 1, normal: 2, low: 3 };
    rows.sort((a, b) => Number(b.overdue) - Number(a.overdue) || prio[a.priority] - prio[b.priority] || a.sla_due_at.localeCompare(b.sla_due_at));
    return c.json(rows);
  });

  api.get("/approvals/:id", (c) => {
    const a = store.approval(c.req.param("id"));
    return c.json({ ...a, overdue: store.isOverdue(a) });
  });

  api.post("/approvals/:id/decisions", async (c) => {
    const body = await readJson(c);
    const item = store.decide(
      c.req.param("id"),
      { decision: body.decision as Decision, comment: body.comment ? String(body.comment) : undefined },
      actor(c),
      { serviceToken: isServiceToken(c) },
    );
    return c.json(item);
  });

  api.post("/approvals/bulk", async (c) => {
    const body = await readJson(c);
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (!ids.length) throw new ApiError(400, "No ids");
    return c.json(store.bulkApprove(ids, actor(c), { serviceToken: isServiceToken(c) }));
  });

  api.get("/metrics", (c) => {
    const q = c.req.query();
    const kpi = c.req.queries("kpi") ?? [];
    return c.json(store.queryMetrics({ client_id: q.client_id, service: q.service, market: q.market, kpi, from: q.from, to: q.to, group_by: q.group_by }));
  });

  api.get("/audit", (c) => c.json(store.audit.slice(0, 200)));

  api.all("*", (c) => c.json({ error: "Not found" }, 404));

  app.route("/api", api);
  return app;
}

async function readJson(c: Context): Promise<Record<string, unknown>> {
  try {
    const b = await c.req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
