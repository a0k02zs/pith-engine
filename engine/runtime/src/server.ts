// The HTTP API of the engine runtime: the workflow and approval paths of engine/contracts/openapi.yaml,
// plus the paths that only the engine's own callers use (/internal/*). No web framework: node:http only.
//
// Who calls (Authorization: Bearer <token>):
//   - a service token (PITH_ENGINE_SERVICE_TOKEN): the services and the Command Centre server. Never decides an approval.
//   - a user token (PITH_ENGINE_USER_TOKENS, a JSON map): a person, with roles and the clients the person can see.
// The user token map is the temporary source of people. Build 2 (personal sign-in) replaces it.
import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { loadWorkflows } from "./load.ts";
import { MemoryStore } from "./memory-store.ts";
import { mockHandlers } from "./mock.ts";
import { PgStore } from "./pg-store.ts";
import { Engine } from "./runner.ts";
import { EngineError, type Actor, type Approval, type Handlers, type RunState, type Workflow } from "./types.ts";

/** A caller of the API: an actor, and the clients the actor can read. '*' means every client. */
export interface Caller extends Actor {
  client_ids: string[];
}

export interface AuthConfig {
  service_token?: string;
  /** token -> person. */
  users?: Record<string, { id: string; roles: string[]; client_ids?: string[] }>;
}

export interface ApiRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  token?: string;
  body?: unknown;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function callerOf(auth: AuthConfig, token: string | undefined): Caller | undefined {
  if (!token) return undefined;
  if (auth.service_token && same(token, auth.service_token)) return { kind: "service", id: "service", roles: [], client_ids: ["*"] };
  for (const [t, u] of Object.entries(auth.users ?? {})) if (same(token, t)) return { kind: "user", id: u.id, roles: u.roles ?? [], client_ids: u.client_ids ?? [] };
  return undefined;
}

const sees = (c: Caller, clientId: string) => c.client_ids.includes("*") || c.client_ids.includes(clientId);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const summary = (r: RunState) => ({
  id: r.id, client_id: r.client_id, workflow_id: r.workflow_id, workflow_version: r.workflow_version, service: r.service, markets: r.markets,
  parent_run_id: r.parent?.run_id ?? null, status: r.status, error: r.error ?? null, started_by: r.started_by, started_at: r.started_at, ended_at: r.ended_at ?? null,
});

/** The API as a function, so that a test calls it with no network. */
export function createApi(engine: Engine, auth: AuthConfig) {
  const store = engine.store;
  const admin = (c: Caller) => c.kind === "service" || c.roles.includes("ops_lead");

  async function route(req: ApiRequest, c: Caller): Promise<ApiResponse> {
    const seg = req.path.split("/").filter(Boolean);
    const q = req.query ?? {};
    const body = isObj(req.body) ? req.body : {};
    const is = (method: string, ...pattern: string[]) => req.method === method && seg.length === pattern.length && pattern.every((p, i) => p.startsWith(":") || p === seg[i]);
    const need = (ok: boolean, text: string) => {
      if (!ok) throw new EngineError(403, text);
    };
    const run = async (id: string): Promise<RunState> => {
      const r = await store.getRun(id);
      // A run of a client that the caller cannot see gives the same answer as a run that does not exist.
      if (!r || !sees(c, r.client_id)) throw new EngineError(404, "run not found");
      return r;
    };
    const approval = async (id: string): Promise<Approval> => {
      const a = await store.getApproval(id);
      if (!a || !sees(c, a.client_id)) throw new EngineError(404, "approval not found");
      return a;
    };

    if (is("POST", "workflows")) {
      need(admin(c), "only a service or an ops_lead can register a workflow");
      const wf = req.body as Workflow;
      const warnings = await engine.registerWorkflow(wf);
      return { status: 201, body: { id: wf.id, version: wf.version, warnings: warnings.map((w) => `[${w.rule}] ${w.message}`) } };
    }
    if (is("GET", "workflows")) {
      const list = await store.listWorkflows();
      return { status: 200, body: { items: list.map((w) => ({ id: w.id, version: w.version, service: w.service, description: w.description ?? null, trigger: w.trigger ?? null, steps: w.steps.length })) } };
    }
    if (is("GET", "workflows", ":id")) {
      const wf = await store.getWorkflow(seg[1], q.version ? Number(q.version) : undefined);
      if (!wf) throw new EngineError(404, "workflow not found");
      return { status: 200, body: wf };
    }

    if (is("POST", "runs")) {
      const clientId = String(body.client_id ?? "");
      if (!clientId || typeof body.workflow_id !== "string") throw new EngineError(422, "client_id and workflow_id are required");
      need(sees(c, clientId), "this caller cannot start a run for this client");
      // parent_run_id is set only by the engine (a subflow step). A caller cannot attach a run to a parent run,
      // because the guardrails read the approvals of the parent run.
      const r = await engine.start({
        client_id: clientId, workflow_id: body.workflow_id, version: typeof body.version === "number" ? body.version : undefined,
        markets: Array.isArray(body.markets) ? body.markets.map(String) : undefined, input: isObj(body.input) ? body.input : {},
        started_by: `${c.kind}:${c.id}`,
      });
      return { status: 202, body: { run_id: r.id, status: r.status } };
    }
    if (is("GET", "runs")) {
      if (q.client_id) need(sees(c, q.client_id), "this caller cannot read this client");
      const list = await store.listRuns({ client_id: q.client_id, service: q.service, status: q.status, workflow_id: q.workflow_id, limit: q.limit ? Number(q.limit) : undefined });
      return { status: 200, body: { items: list.filter((r) => sees(c, r.client_id)).map(summary) } };
    }
    if (is("GET", "runs", ":id")) {
      const r = await run(seg[1]);
      return {
        status: 200,
        body: { ...summary(r), input: r.input, output: r.output ?? null, steps: r.steps, step_runs: r.history, approvals: await store.listApprovals({ run_id: r.id }), actions: await store.listActions(r.id) },
      };
    }
    if (is("POST", "runs", ":id", "cancel")) {
      const r = await run(seg[1]);
      need(admin(c) || c.roles.includes("account_lead"), "only a service, an ops_lead or an account_lead can cancel a run");
      await engine.cancel(r.id, `cancelled by ${c.kind}:${c.id}${typeof body.reason === "string" ? `: ${body.reason}` : ""}`);
      return { status: 202, body: { run_id: r.id, status: "cancelled" } };
    }
    if (is("POST", "runs", ":id", "steps", ":step", "complete")) {
      const r = await run(seg[1]);
      await engine.completeTask(r.id, seg[3], body.output, c);
      return { status: 200, body: { run_id: r.id, step_id: seg[3], status: "succeeded" } };
    }

    if (is("GET", "approvals")) {
      if (q.client_id) need(sees(c, q.client_id), "this caller cannot read this client");
      let list = await store.listApprovals({ client_id: q.client_id, status: q.status, kind: q.kind, service: q.service, role: q.role, run_id: q.run_id });
      list = list.filter((a) => sees(c, a.client_id));
      if (q.overdue === "true") list = list.filter((a) => a.status === "open" && Date.parse(a.sla_due_at) < Date.now());
      return { status: 200, body: { items: list } };
    }
    if (is("GET", "approvals", ":id")) return { status: 200, body: await approval(seg[1]) };
    if (is("POST", "approvals", ":id", "decisions")) {
      const a = await approval(seg[1]);
      const decided = await engine.decide(a.id, c, { decision: body.decision as never, comment: typeof body.comment === "string" ? body.comment : undefined, edits: body.edits });
      return { status: 200, body: decided };
    }

    // ---- paths for the engine's own callers
    if (is("POST", "internal", "events")) {
      need(c.kind === "service", "only a service can send an event");
      if (typeof body.name !== "string" || !body.name) throw new EngineError(422, "name is required");
      // These events come only from the engine. A service cannot say that a person decided an approval or that a run finished.
      if (/^engine\/(run|approval|guardrail)\./.test(body.name)) throw new EngineError(422, `a service cannot send '${body.name}'`);
      await engine.publish({ name: body.name, client_id: typeof body.client_id === "string" ? body.client_id : undefined, data: isObj(body.data) ? body.data : {} });
      return { status: 202, body: { accepted: true } };
    }
    if (is("POST", "internal", "tick")) {
      need(c.kind === "service", "only a service can move the clock");
      await engine.tick();
      return { status: 200, body: { ok: true } };
    }
    if (is("POST", "internal", "runs", ":id", "steps", ":step", "resolve")) {
      need(admin(c), "only a service or an ops_lead can end a wait by hand");
      const r = await run(seg[2]);
      await engine.resolveWait(r.id, seg[4], body.data, c);
      return { status: 200, body: { run_id: r.id, step_id: seg[4], status: "succeeded" } };
    }
    throw new EngineError(404, "no such path");
  }

  return async function handle(req: ApiRequest): Promise<ApiResponse> {
    if (req.method === "GET" && req.path === "/health") return { status: 200, body: { ok: true, workflows: (await store.listWorkflows()).length } };
    const caller = callerOf(auth, req.token);
    if (!caller) return { status: 401, body: { error: "a valid bearer token is required" } };
    try {
      return await route(req, caller);
    } catch (e) {
      if (e instanceof EngineError) return { status: e.status, body: { error: e.message, details: e.details } };
      // Do not send internal error text to the caller.
      console.error(`[engine] ${req.method} ${req.path}:`, e);
      return { status: 500, body: { error: "internal error" } };
    }
  };
}

const MAX_BODY = 1_000_000;

export function listen(handle: (r: ApiRequest) => Promise<ApiResponse>, port: number, host = "0.0.0.0"): Server {
  const send = (res: ServerResponse, out: ApiResponse) => {
    res.writeHead(out.status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    res.end(JSON.stringify(out.body));
  };
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? "/", "http://engine");
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += (chunk as Buffer).length;
        // Read a body that is too large to its end with no copy, so that the caller gets the answer. Cut the connection at 8 MB.
        if (size > 8 * MAX_BODY) return void req.destroy();
        if (size <= MAX_BODY) chunks.push(chunk as Buffer);
      }
      if (size > MAX_BODY) return send(res, { status: 413, body: { error: "the body is larger than 1 MB" } });
      let body: unknown;
      if (size) {
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          return send(res, { status: 400, body: { error: "the body is not valid JSON" } });
        }
      }
      const header = req.headers.authorization ?? "";
      const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
      send(res, await handle({ method: req.method ?? "GET", path: url.pathname.replace(/\/+$/, "") || "/", query: Object.fromEntries(url.searchParams), token, body }));
    } catch (e) {
      console.error("[engine] request failed:", e);
      if (!res.headersSent) send(res, { status: 500, body: { error: "internal error" } });
    }
  });
  server.listen(port, host);
  return server;
}

/** Handlers for a deployment that has no agent, tool or check adapter yet. Each step that needs one fails with a clear message. */
export function unconnectedHandlers(): Handlers {
  const no = (what: string) => async () => {
    throw new EngineError(501, `no ${what} adapter is connected to the engine`);
  };
  return { agent: no("agent"), tool: no("tool"), check: no("compliance check") };
}

export function authFromEnv(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  let users: AuthConfig["users"];
  if (env.PITH_ENGINE_USER_TOKENS) {
    try {
      users = JSON.parse(env.PITH_ENGINE_USER_TOKENS);
    } catch {
      throw new Error("PITH_ENGINE_USER_TOKENS is not valid JSON");
    }
  }
  const auth: AuthConfig = { service_token: env.PITH_ENGINE_SERVICE_TOKEN || undefined, users };
  const tokens = [auth.service_token, ...Object.keys(users ?? {})].filter((t): t is string => Boolean(t));
  if (tokens.some((t) => t.length < 24)) throw new Error("each engine token must have 24 characters or more");
  if (!tokens.length && env.PITH_ENGINE_DEV !== "1") throw new Error("set PITH_ENGINE_SERVICE_TOKEN or PITH_ENGINE_USER_TOKENS; the engine does not start with no token");
  return auth;
}

async function main() {
  const env = process.env;
  const dev = env.PITH_ENGINE_DEV === "1";
  const auth = authFromEnv(env);
  if (!env.DATABASE_URL && !dev) throw new Error("set DATABASE_URL; the memory store is only for PITH_ENGINE_DEV=1");
  const store = env.DATABASE_URL ? await PgStore.connect(env.DATABASE_URL) : new MemoryStore();
  // Mock handlers do no real work. They are allowed only in development.
  const handlers = dev && env.PITH_ENGINE_HANDLERS === "mock" ? mockHandlers() : unconnectedHandlers();
  const engine = new Engine({ store, handlers });
  const { workflows, errors } = loadWorkflows();
  let ok = 0;
  for (const e of errors) console.error(`[engine] ${e.file}: ${e.message}`);
  for (const { file, workflow } of workflows) {
    try {
      await engine.registerWorkflow(workflow);
      ok++;
    } catch (e) {
      console.error(`[engine] ${file}: ${e instanceof EngineError ? `${e.message}: ${(e.details ?? []).join("; ")}` : e}`);
    }
  }
  const port = Number(env.PORT ?? 8787);
  listen(createApi(engine, auth), port);
  const every = Math.max(5, Number(env.PITH_ENGINE_TICK_SECONDS ?? 30));
  setInterval(() => void engine.tick().catch((e) => console.error("[engine] tick failed:", e)), every * 1000).unref?.();
  console.log(`[engine] ${ok} of ${workflows.length} workflows registered; listening on port ${port}; store: ${env.DATABASE_URL ? "postgres" : "memory"}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(`[engine] ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
}
