// The Postgres store. It uses the tables of engine/db/001_core.sql and engine/db/002_runtime.sql.
// Run 1 engine process for each database: the runner keeps the order of the work on a run in the process.
// PgStore.connect takes an advisory lock, so a second engine process on the same database does not start.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { REPO_ROOT } from "./load.ts";
import type { ActionRecord, Approval, ApprovalFilter, Decision, EngineEvent, RunFilter, RunState, Store, Workflow } from "./types.ts";

type Row = Record<string, unknown>;
const ACTIVE = ["running", "waiting_approval", "waiting_event"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (v: unknown): string | undefined => (v instanceof Date ? v.toISOString() : v == null ? undefined : String(v));
const json = (v: unknown) => (v === undefined ? null : JSON.stringify(v));
// Postgres bigint (hashtext of 'pith-engine-runner' is not stable between versions, so the key is a fixed number).
const RUNNER_LOCK = 7411250931;

/**
 * Applies 001_core.sql (only when the schema does not exist) and 002_runtime.sql.
 * `withoutVector` is for a development database that has no pgvector extension: the embedding column becomes text.
 */
export async function applySchema(pool: pg.Pool, opts: { withoutVector?: boolean } = {}): Promise<void> {
  const read = (name: string) => readFileSync(join(REPO_ROOT, "engine", "db", name), "utf8");
  const has = await pool.query("select 1 from information_schema.tables where table_schema = 'engine' and table_name = 'runs'");
  if (!has.rowCount) {
    let core = read("001_core.sql");
    if (opts.withoutVector) core = core.replace("create extension if not exists vector;", "").replace(/vector\(\d+\)/g, "text");
    await pool.query(core);
  }
  await pool.query(read("002_runtime.sql"));
}

export class PgStore implements Store {
  readonly pool: pg.Pool;
  private lock?: pg.PoolClient;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  /** Opens a pool for the engine. The engine is a trusted service: it reads the rows of every client. */
  static pool(url: string): pg.Pool {
    return new pg.Pool({ connectionString: url, options: "-c search_path=engine,public -c app.client_ids=*" });
  }

  /** Opens the store and takes the runner lock. Throws when another engine process holds it. */
  static async connect(url: string): Promise<PgStore> {
    const store = new PgStore(PgStore.pool(url));
    const client = await store.pool.connect();
    const got = await client.query("select pg_try_advisory_lock($1) as ok", [RUNNER_LOCK]);
    if (!got.rows[0].ok) {
      client.release();
      await store.pool.end();
      throw new Error("another engine process uses this database; run 1 engine process for each database");
    }
    store.lock = client;
    return store;
  }

  async close(): Promise<void> {
    this.lock?.release(true);
    await this.pool.end();
  }

  private q(text: string, values: unknown[] = []) {
    return this.pool.query(text, values);
  }

  // ---------------------------------------------------------------- definitions

  async putWorkflow(wf: Workflow): Promise<void> {
    await this.q(
      "insert into workflow_definitions (id, version, service, doc) values ($1, $2, $3, $4) on conflict (id, version) do update set service = excluded.service, doc = excluded.doc",
      [wf.id, wf.version, wf.service, json(wf)],
    );
  }

  async getWorkflow(id: string, version?: number): Promise<Workflow | undefined> {
    const r = version == null
      ? await this.q("select doc from workflow_definitions where id = $1 order by version desc limit 1", [id])
      : await this.q("select doc from workflow_definitions where id = $1 and version = $2", [id, version]);
    return r.rows[0]?.doc as Workflow | undefined;
  }

  async listWorkflows(): Promise<Workflow[]> {
    const r = await this.q("select distinct on (id) doc from workflow_definitions order by id, version desc");
    return r.rows.map((x: Row) => x.doc as Workflow);
  }

  // ---------------------------------------------------------------- runs

  async saveRun(run: RunState): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const state = { steps: run.steps, history: run.history, trigger_event: run.trigger_event };
      const r = await client.query(
        `insert into runs (id, client_id, workflow_id, workflow_version, service, markets, parent_run_id, parent_step_id, status, input, output,
                           started_by, started_at, ended_at, state, error, next_wake_at, waiting_events)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         on conflict (id) do update set status = excluded.status, output = excluded.output, ended_at = excluded.ended_at, state = excluded.state,
           error = excluded.error, next_wake_at = excluded.next_wake_at, waiting_events = excluded.waiting_events
         returning step_rows`,
        [
          run.id, run.client_id, run.workflow_id, run.workflow_version, run.service, run.markets, run.parent?.run_id ?? null, run.parent?.step_id ?? null,
          run.status, json(run.input), json(run.output), run.started_by, run.started_at, run.ended_at ?? null, json(state), run.error ?? null,
          run.next_wake_at ?? null, run.waiting_events,
        ],
      );
      const saved = Number(r.rows[0].step_rows);
      for (const h of run.history.slice(saved)) {
        await client.query(
          "insert into step_runs (run_id, step_id, type, attempt, status, output, error, started_at, ended_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [run.id, h.step_id, h.type, h.attempt, h.status, json(h.output), h.error ?? null, h.started_at, h.ended_at ?? null],
        );
      }
      if (run.history.length > saved) await client.query("update runs set step_rows = $2 where id = $1", [run.id, run.history.length]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  private toRun(x: Row): RunState {
    const state = (x.state ?? {}) as Partial<Pick<RunState, "steps" | "history" | "trigger_event">>;
    return {
      id: String(x.id), client_id: String(x.client_id), workflow_id: String(x.workflow_id), workflow_version: Number(x.workflow_version),
      service: String(x.service), markets: (x.markets as string[]) ?? [],
      parent: x.parent_run_id ? { run_id: String(x.parent_run_id), step_id: String(x.parent_step_id ?? "") } : undefined,
      status: x.status as RunState["status"], input: (x.input as Record<string, unknown>) ?? {}, output: x.output ?? undefined,
      error: (x.error as string | null) ?? undefined, started_by: String(x.started_by), started_at: iso(x.started_at)!, ended_at: iso(x.ended_at),
      trigger_event: state.trigger_event, steps: state.steps ?? {}, history: state.history ?? [],
      next_wake_at: iso(x.next_wake_at) ?? null, waiting_events: (x.waiting_events as string[]) ?? [],
    };
  }

  async getRun(id: string): Promise<RunState | undefined> {
    if (!UUID.test(id)) return undefined;
    const r = await this.q("select * from runs where id = $1", [id]);
    return r.rows[0] && this.toRun(r.rows[0]);
  }

  async listRuns(f: RunFilter = {}): Promise<RunState[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, v: unknown) => {
      values.push(v);
      where.push(sql.replace("?", `$${values.length}`));
    };
    if (f.client_id) add("client_id = ?", f.client_id);
    if (f.service) add("service = ?", f.service);
    if (f.status) add("status = ?", f.status);
    if (f.workflow_id) add("workflow_id = ?", f.workflow_id);
    values.push(Math.min(f.limit ?? 200, 1000));
    const r = await this.q(`select * from runs ${where.length ? `where ${where.join(" and ")}` : ""} order by started_at desc limit $${values.length}`, values);
    return r.rows.map((x: Row) => this.toRun(x));
  }

  async runsWaitingFor(event: string): Promise<string[]> {
    const r = await this.q("select id from runs where status = any($1) and waiting_events @> array[$2]::text[]", [ACTIVE, event]);
    return r.rows.map((x: Row) => String(x.id));
  }

  async runsDue(now: Date): Promise<string[]> {
    const r = await this.q("select id from runs where status = any($1) and next_wake_at <= $2 order by next_wake_at", [ACTIVE, now.toISOString()]);
    return r.rows.map((x: Row) => String(x.id));
  }

  // ---------------------------------------------------------------- approvals

  async saveApproval(a: Approval): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into approvals (id, client_id, run_id, step_id, service, kind, title, summary, payload, required_roles, required_count, priority,
                                sla_due_at, status, created_at, closed_at, overdue_sent)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         on conflict (id) do update set status = excluded.status, closed_at = excluded.closed_at, overdue_sent = excluded.overdue_sent`,
        [
          a.id, a.client_id, a.run_id, a.step_id, a.service, a.kind, a.title, a.summary ?? null, json(a.payload), a.required_roles, a.required_count,
          a.priority, a.sla_due_at, a.status, a.created_at, a.closed_at ?? null, a.overdue_sent ?? false,
        ],
      );
      const have = Number((await client.query("select count(*) as n from approval_decisions where approval_id = $1", [a.id])).rows[0].n);
      for (const d of a.decisions.slice(have)) {
        await client.query(
          "insert into approval_decisions (approval_id, decided_by, role, decision, comment, edits, at) values ($1,$2,$3,$4,$5,$6,$7)",
          [a.id, d.decided_by, d.role, d.decision, d.comment ?? null, json(d.edits), d.at],
        );
      }
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  private static APPROVAL = `select a.*, coalesce((select json_agg(json_build_object('decided_by', d.decided_by, 'role', d.role, 'decision', d.decision,
      'comment', d.comment, 'edits', d.edits, 'at', d.at) order by d.at, d.id) from approval_decisions d where d.approval_id = a.id), '[]') as decisions from approvals a`;

  private toApproval(x: Row): Approval {
    const decisions = (x.decisions as Row[]).map((d) => ({
      decided_by: String(d.decided_by), role: String(d.role), decision: d.decision as Decision["decision"],
      comment: (d.comment as string | null) ?? undefined, edits: d.edits ?? undefined, at: new Date(String(d.at)).toISOString(),
    }));
    return {
      id: String(x.id), client_id: String(x.client_id), run_id: String(x.run_id), step_id: String(x.step_id), service: String(x.service), kind: String(x.kind),
      title: String(x.title), summary: (x.summary as string | null) ?? undefined, payload: (x.payload as Record<string, unknown>) ?? {},
      required_roles: x.required_roles as string[], required_count: Number(x.required_count), priority: x.priority as Approval["priority"],
      sla_due_at: iso(x.sla_due_at)!, status: x.status as Approval["status"], decisions, overdue_sent: Boolean(x.overdue_sent),
      created_at: iso(x.created_at)!, closed_at: iso(x.closed_at),
    };
  }

  async getApproval(id: string): Promise<Approval | undefined> {
    if (!UUID.test(id)) return undefined;
    const r = await this.q(`${PgStore.APPROVAL} where a.id = $1`, [id]);
    return r.rows[0] && this.toApproval(r.rows[0]);
  }

  async listApprovals(f: ApprovalFilter = {}): Promise<Approval[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, v: unknown) => {
      values.push(v);
      where.push(sql.replace("?", `$${values.length}`));
    };
    if (f.client_id) add("a.client_id = ?", f.client_id);
    if (f.status) add("a.status = ?", f.status);
    if (f.kind) add("a.kind = ?", f.kind);
    if (f.service) add("a.service = ?", f.service);
    if (f.role) add("? = any(a.required_roles)", f.role);
    if (f.run_id) add("a.run_id = ?", f.run_id);
    const r = await this.q(`${PgStore.APPROVAL} ${where.length ? `where ${where.join(" and ")}` : ""} order by a.sla_due_at limit 1000`, values);
    return r.rows.map((x: Row) => this.toApproval(x));
  }

  // ---------------------------------------------------------------- audit log and events

  async logAction(a: ActionRecord): Promise<void> {
    await this.q(
      `insert into agent_actions (client_id, run_id, step_id, actor, action, target, model, input_tokens, output_tokens, cost_usd, allowed, guardrail, detail, at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        a.client_id, a.run_id, a.step_id, a.actor, a.action, a.target ?? null, a.model ?? null, a.input_tokens ?? null, a.output_tokens ?? null,
        a.cost_usd ?? null, a.allowed, a.guardrail ?? null, json(a.detail ?? {}), a.at,
      ],
    );
  }

  async listActions(run_id: string): Promise<ActionRecord[]> {
    if (!UUID.test(run_id)) return [];
    const r = await this.q("select * from agent_actions where run_id = $1 order by id", [run_id]);
    return r.rows.map((x: Row) => ({
      client_id: String(x.client_id), run_id: String(x.run_id), step_id: String(x.step_id), actor: String(x.actor), action: String(x.action),
      target: (x.target as string | null) ?? undefined, model: (x.model as string | null) ?? undefined,
      input_tokens: (x.input_tokens as number | null) ?? undefined, output_tokens: (x.output_tokens as number | null) ?? undefined,
      cost_usd: x.cost_usd == null ? undefined : Number(x.cost_usd), allowed: Boolean(x.allowed), guardrail: (x.guardrail as string | null) ?? undefined,
      detail: (x.detail as Record<string, unknown>) ?? {}, at: iso(x.at)!,
    }));
  }

  async logEvent(e: EngineEvent): Promise<void> {
    const runId = typeof e.data?.run_id === "string" && UUID.test(e.data.run_id) ? e.data.run_id : null;
    const clientId = e.client_id && UUID.test(e.client_id) ? e.client_id : null;
    await this.q(
      "insert into engine_events (id, client_id, run_id, name, data, at) values (coalesce($1, gen_random_uuid()), $2, $3, $4, $5, coalesce($6, now())) on conflict (id) do nothing",
      [e.id && UUID.test(e.id) ? e.id : null, clientId, runId, e.name, json(e.data ?? {}), e.at ?? null],
    );
  }

  async listEvents(f: { name?: string; run_id?: string; limit?: number } = {}): Promise<EngineEvent[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    if (f.name) where.push(`name = $${values.push(f.name)}`);
    if (f.run_id) where.push(`run_id = $${values.push(f.run_id)}`);
    values.push(Math.min(f.limit ?? 500, 5000));
    const r = await this.q(
      `select * from (select * from engine_events ${where.length ? `where ${where.join(" and ")}` : ""} order by seq desc limit $${values.length}) e order by seq`,
      values,
    );
    return r.rows.map((x: Row) => ({ id: String(x.id), name: String(x.name), data: (x.data as Record<string, unknown>) ?? {}, client_id: (x.client_id as string | null) ?? undefined, at: iso(x.at) }));
  }
}
