import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { authFromEnv, createApi, listen, unconnectedHandlers, type ApiRequest } from "../src/server.ts";
import { MemoryStore } from "../src/memory-store.ts";
import { Engine } from "../src/runner.ts";
import type { Step } from "../src/types.ts";
import { CLIENT, setup, wf } from "./helpers.ts";

const OTHER = "22222222-2222-4222-8222-222222222222";
// The tokens are made for each test run, so that no token text is in the repository.
const token = () => randomBytes(18).toString("hex");
const [SERVICE, LEAD, APPROVER, STRANGER, OPS] = [token(), token(), token(), token(), token()];
const auth = {
  service_token: SERVICE,
  users: {
    [LEAD]: { id: "lead", roles: ["account_lead"], client_ids: [CLIENT] },
    [APPROVER]: { id: "approver", roles: ["client_approver"], client_ids: [CLIENT] },
    [STRANGER]: { id: "stranger", roles: ["account_lead", "client_approver"], client_ids: [OTHER] },
    [OPS]: { id: "ops", roles: ["ops_lead"], client_ids: ["*"] },
  },
};
const steps: Step[] = [
  { id: "draft", type: "agent", agent: { prompt_ref: "t/draft@1" } },
  { id: "ok", type: "gate", needs: ["draft"], gate: { approval_kind: "copy", required_roles: ["client_approver"], sla_hours: 24 } },
  { id: "call", type: "task", needs: ["ok"], task: { title: "Call the client", assignee_roles: ["account_lead"] } },
  { id: "reply", type: "wait", needs: ["call"], wait: { event: "svc.t/reply" } },
];

async function api() {
  const t = await setup([wf("t.flow", steps)]);
  const handle = createApi(t.engine, auth);
  const call = async (token: string | undefined, method: string, path: string, body?: unknown, query?: Record<string, string>) => {
    const r = await handle({ method, path, token, body, query } as ApiRequest);
    await t.engine.settle();
    return r as { status: number; body: any };
  };
  return { ...t, call };
}

describe("HTTP API", () => {
  it("needs a token for every path but /health", async () => {
    const { call } = await api();
    expect(await call(undefined, "GET", "/health")).toMatchObject({ status: 200, body: { ok: true, workflows: 1 } });
    expect((await call(undefined, "GET", "/runs")).status).toBe(401);
    expect((await call(token(), "GET", "/runs")).status).toBe(401);
    expect((await call(SERVICE, "GET", "/nothing")).status).toBe(404);
  });

  it("registers a definition, and refuses one that breaks a guardrail with HTTP 422", async () => {
    const { call } = await api();
    const bad = wf("t.bad", [{ id: "send", type: "tool", tool: { name: "esp", action: "message.send", risk: "send" } }]);
    const r = await call(SERVICE, "POST", "/workflows", bad);
    expect(r.status).toBe(422);
    expect(r.body.details[0]).toMatch(/G6/);
    expect((await call(LEAD, "POST", "/workflows", wf("t.new", steps))).status).toBe(403);
    expect(await call(OPS, "POST", "/workflows", wf("t.new", steps))).toMatchObject({ status: 201, body: { id: "t.new", version: 1 } });
    expect((await call(LEAD, "GET", "/workflows")).body.items.map((w: { id: string }) => w.id).sort()).toEqual(["t.flow", "t.new"]);
    expect((await call(LEAD, "GET", "/workflows/t.new")).body.steps).toHaveLength(4);
  });

  it("runs a workflow through the inbox: start, decide, complete a task, send an event", async () => {
    const { call } = await api();
    expect((await call(SERVICE, "POST", "/runs", { workflow_id: "t.flow" })).status).toBe(422);
    expect((await call(STRANGER, "POST", "/runs", { client_id: CLIENT, workflow_id: "t.flow" })).status).toBe(403);
    expect((await call(SERVICE, "POST", "/runs", { client_id: CLIENT, workflow_id: "t.none" })).status).toBe(404);
    const started = await call(LEAD, "POST", "/runs", { client_id: CLIENT, workflow_id: "t.flow", input: { topic: "x" }, parent_run_id: "id-1" });
    expect(started.status).toBe(202);
    const id = started.body.run_id;
    const run = await call(LEAD, "GET", `/runs/${id}`);
    expect(run.body).toMatchObject({ status: "waiting_approval", started_by: "user:lead", parent_run_id: null, input: { topic: "x" } });

    // A person of a different client cannot see the run or its approval.
    expect((await call(STRANGER, "GET", `/runs/${id}`)).status).toBe(404);
    expect((await call(STRANGER, "GET", "/runs")).body.items).toEqual([]);
    expect((await call(STRANGER, "GET", "/approvals", undefined, { client_id: CLIENT })).status).toBe(403);
    const inbox = await call(APPROVER, "GET", "/approvals", undefined, { status: "open", role: "client_approver" });
    expect(inbox.body.items).toHaveLength(1);
    const approvalId = inbox.body.items[0].id;
    expect((await call(STRANGER, "GET", `/approvals/${approvalId}`)).status).toBe(404);
    expect((await call(STRANGER, "POST", `/approvals/${approvalId}/decisions`, { decision: "approved" })).status).toBe(404);

    // Only a user with a required role decides. A service token never decides.
    expect((await call(SERVICE, "POST", `/approvals/${approvalId}/decisions`, { decision: "approved" })).status).toBe(403);
    expect((await call(LEAD, "POST", `/approvals/${approvalId}/decisions`, { decision: "approved" })).status).toBe(403);
    expect((await call(APPROVER, "POST", `/approvals/${approvalId}/decisions`, { decision: "maybe" })).status).toBe(422);
    expect(await call(APPROVER, "POST", `/approvals/${approvalId}/decisions`, { decision: "approved", comment: "fine" })).toMatchObject({ status: 200, body: { status: "approved" } });
    expect((await call(APPROVER, "POST", `/approvals/${approvalId}/decisions`, { decision: "approved" })).status).toBe(409);

    expect((await call(APPROVER, "POST", `/runs/${id}/steps/call/complete`, { output: { done: true } })).status).toBe(403);
    expect((await call(LEAD, "POST", `/runs/${id}/steps/call/complete`, { output: { done: true } })).status).toBe(200);

    // A service cannot send an event that only the engine sends.
    expect((await call(LEAD, "POST", "/internal/events", { name: "svc.t/reply", client_id: CLIENT })).status).toBe(403);
    expect((await call(SERVICE, "POST", "/internal/events", { name: "engine/approval.decided", client_id: CLIENT })).status).toBe(422);
    expect((await call(SERVICE, "POST", "/internal/events", { name: "svc.t/reply", client_id: CLIENT, data: { n: 1 } })).status).toBe(202);
    const done = await call(LEAD, "GET", `/runs/${id}`);
    expect(done.body.status).toBe("succeeded");
    expect(done.body.step_runs.map((s: { step_id: string }) => s.step_id)).toEqual(["draft", "ok", "call", "reply"]);
    expect(done.body.actions.map((a: { action: string }) => a.action)).toEqual(["agent.run", "approval.approved", "task.opened", "task.completed"]);
    expect((await call(LEAD, "GET", "/runs", undefined, { status: "succeeded" })).body.items).toHaveLength(1);
  });

  it("cancels a run and ends a wait by hand only for the right roles", async () => {
    const { call } = await api();
    const a = (await call(SERVICE, "POST", "/runs", { client_id: CLIENT, workflow_id: "t.flow" })).body.run_id;
    expect((await call(APPROVER, "POST", `/runs/${a}/cancel`)).status).toBe(403);
    expect((await call(LEAD, "POST", `/runs/${a}/cancel`, { reason: "client asked" })).status).toBe(202);
    expect((await call(LEAD, "GET", `/runs/${a}`)).body).toMatchObject({ status: "cancelled", error: "cancelled by user:lead: client asked" });
    expect((await call(LEAD, "GET", "/approvals", undefined, { run_id: a })).body.items[0].status).toBe("cancelled");
    expect((await call(LEAD, "POST", `/internal/runs/${a}/steps/reply/resolve`)).status).toBe(403);
    expect((await call(OPS, "POST", `/internal/runs/${a}/steps/reply/resolve`)).status).toBe(409);
    expect((await call(LEAD, "POST", "/internal/tick")).status).toBe(403);
    expect((await call(SERVICE, "POST", "/internal/tick")).status).toBe(200);
  });

  it("does not start with no token, a short token or a token map that is not JSON", () => {
    expect(() => authFromEnv({})).toThrow(/does not start with no token/);
    expect(() => authFromEnv({ PITH_ENGINE_SERVICE_TOKEN: "short" })).toThrow(/24 characters/);
    expect(() => authFromEnv({ PITH_ENGINE_USER_TOKENS: "{" })).toThrow(/not valid JSON/);
    expect(authFromEnv({ PITH_ENGINE_DEV: "1" })).toEqual({ service_token: undefined, users: undefined });
    expect(authFromEnv({ PITH_ENGINE_SERVICE_TOKEN: SERVICE }).service_token).toBe(SERVICE);
  });

  it("fails a step with a clear message when no adapter is connected", async () => {
    const engine = new Engine({ store: new MemoryStore(), handlers: unconnectedHandlers() });
    await engine.registerWorkflow(wf("t.flow", steps));
    const r = await engine.start({ client_id: CLIENT, workflow_id: "t.flow" });
    await engine.settle();
    expect((await engine.store.getRun(r.id))?.error).toMatch(/no agent adapter is connected/);
  });
});

describe("HTTP server", () => {
  const servers: { close(): void }[] = [];
  afterAll(() => servers.forEach((s) => s.close()));

  it("serves JSON over HTTP and refuses a body that is not JSON or is too large", async () => {
    const t = await setup([wf("t.flow", steps)]);
    const server = listen(createApi(t.engine, auth), 0, "127.0.0.1");
    servers.push(server);
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const post = (path: string, body: string, bearer = SERVICE) => fetch(base + path, { method: "POST", headers: { authorization: `Bearer ${bearer}` }, body });
    expect(await (await fetch(`${base}/health`)).json()).toEqual({ ok: true, workflows: 1 });
    expect((await fetch(`${base}/runs/`)).status).toBe(401);
    expect((await post("/runs", "{not json")).status).toBe(400);
    expect((await post("/runs", JSON.stringify({ pad: "x".repeat(1_100_000) }))).status).toBe(413);
    const started = await post("/runs", JSON.stringify({ client_id: CLIENT, workflow_id: "t.flow" }));
    expect(started.status).toBe(202);
    expect(started.headers.get("content-type")).toMatch(/application\/json/);
    const { run_id } = (await started.json()) as { run_id: string };
    await t.engine.settle();
    const got = await fetch(`${base}/runs/${run_id}`, { headers: { authorization: `Bearer ${LEAD}` } });
    expect(((await got.json()) as { status: string }).status).toBe("waiting_approval");
  });
});
