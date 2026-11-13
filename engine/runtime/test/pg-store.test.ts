// Runs only with DATABASE_URL: a Postgres 16 database in which this test can replace the schema 'engine'.
// CI gives it a pgvector image. For a local database with no pgvector, set PITH_DB_NO_VECTOR=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mockHandlers } from "../src/mock.ts";
import { applySchema, PgStore } from "../src/pg-store.ts";
import { Engine } from "../src/runner.ts";
import type { Actor, Step } from "../src/types.ts";
import { wf } from "./helpers.ts";

const url = process.env.DATABASE_URL;
const CLIENT = randomUUID();
const OTHER = randomUUID();
const users = [randomUUID(), randomUUID()];
const person = (i: number, ...roles: string[]): Actor => ({ kind: "user", id: users[i], roles });

describe.skipIf(!url)("PgStore", () => {
  let store: PgStore;
  let now = Date.parse("2026-11-12T09:00:00Z");
  const engine = () => new Engine({ store, handlers: mockHandlers({ outputs: { draft: { subject: "Hello" } } }), clock: () => new Date(now), policy: { backoff_ms: 1000 } });
  const steps: Step[] = [
    { id: "draft", type: "agent", agent: { prompt_ref: "t/draft@1" } },
    { id: "ok", type: "gate", needs: ["draft"], gate: { approval_kind: "copy", required_roles: ["account_lead", "client_approver"], required_count: 2, sla_hours: 24 } },
    { id: "reply", type: "wait", needs: ["ok"], wait: { event: "svc.t/reply", match: "event.data.n == 1", timeout: "2h" } },
    { id: "end", type: "emit", needs: ["reply"], emit: { event: "svc.t/done" } },
  ];

  beforeAll(async () => {
    const admin = PgStore.pool(url!);
    await admin.query("drop schema if exists engine cascade");
    await applySchema(admin, { withoutVector: process.env.PITH_DB_NO_VECTOR === "1" });
    await applySchema(admin); // The second time changes nothing.
    for (const id of [CLIENT, OTHER]) await admin.query("insert into clients (id, name, segment, home_market) values ($1, $2, 'b2b', 'GB')", [id, `Test ${id.slice(0, 4)}`]);
    for (const [i, id] of users.entries()) await admin.query("insert into users (id, email, name, org) values ($1, $2, $3, 'pith')", [id, `u${i}@example.test`, `User ${i}`]);
    await admin.end();
    store = await PgStore.connect(url!);
  });
  afterAll(async () => {
    await store?.close();
  });

  it("refuses a second engine process on the same database", async () => {
    await expect(PgStore.connect(url!)).rejects.toThrow(/another engine process/);
  });

  it("keeps definitions by version", async () => {
    const e = engine();
    await e.registerWorkflow(wf("t.flow", steps));
    await e.registerWorkflow(wf("t.flow", steps, { version: 2, description: "second" }));
    expect((await store.getWorkflow("t.flow"))?.version).toBe(2);
    expect((await store.getWorkflow("t.flow", 1))?.description).toBeUndefined();
    expect((await store.listWorkflows()).filter((w) => w.id === "t.flow")).toHaveLength(1);
  });

  it("runs a workflow on Postgres, and a new engine process continues the run", async () => {
    let e = engine();
    const started = await e.start({ client_id: CLIENT, workflow_id: "t.flow", input: { topic: "x" }, markets: ["GB"], started_by: `user:${users[0]}` });
    await e.settle();
    expect((await store.getRun(started.id))?.status).toBe("waiting_approval");
    const [a] = await store.listApprovals({ run_id: started.id, status: "open", role: "client_approver" });
    expect(a).toMatchObject({ kind: "copy", required_count: 2, decisions: [] });
    expect(await store.listApprovals({ client_id: OTHER })).toEqual([]);

    await e.decide(a.id, person(0, "account_lead"), { decision: "approved", comment: "good" });
    await expect(e.decide(a.id, person(0, "account_lead"), { decision: "approved" })).rejects.toMatchObject({ status: 409 });
    // A new process: nothing is kept in memory.
    now += 60_000;
    e = engine();
    await e.decide(a.id, person(1, "client_approver"), { decision: "approved" });
    await e.settle();
    expect(await store.getApproval(a.id)).toMatchObject({ status: "approved", decisions: [{ decided_by: users[0], comment: "good" }, { decided_by: users[1] }] });
    let run = (await store.getRun(started.id))!;
    expect(run).toMatchObject({ status: "waiting_event", waiting_events: ["svc.t/reply"] });
    expect(await store.runsWaitingFor("svc.t/reply")).toEqual([run.id]);

    // An event for a different client, and an event that does not match, do not end the wait.
    await e.publish({ name: "svc.t/reply", client_id: OTHER, data: { n: 1 } });
    await e.publish({ name: "svc.t/reply", client_id: CLIENT, data: { n: 2 } });
    await e.settle();
    expect((await store.getRun(run.id))?.status).toBe("waiting_event");
    expect(await store.runsDue(new Date(now))).toEqual([]);
    now += 2 * 3_600_000;
    expect(await store.runsDue(new Date(now))).toEqual([run.id]);
    e = engine();
    await e.tick();
    run = (await store.getRun(run.id))!;
    expect(run).toMatchObject({ status: "succeeded", next_wake_at: null, waiting_events: [], input: { topic: "x" }, markets: ["GB"] });
    expect(run.steps.reply.timed_out).toBe(true);
    expect(run.history.map((h) => h.step_id)).toEqual(["draft", "ok", "reply", "end"]);

    const rows = await store.pool.query("select step_id from step_runs where run_id = $1", [run.id]);
    expect(rows.rows.map((r) => r.step_id).sort()).toEqual(["draft", "end", "ok", "reply"]);
    expect((await store.listActions(run.id)).map((x) => x.action)).toEqual(["agent.run", "approval.approved", "approval.approved"]);
    const names = (await store.listEvents({ run_id: run.id })).map((x) => x.name);
    expect(names[0]).toBe("engine/run.started");
    expect(names.at(-1)).toBe("engine/run.finished");
    expect(names).toContain("svc.t/done");
    expect(await store.listRuns({ client_id: CLIENT, status: "succeeded", workflow_id: "t.flow" })).toHaveLength(1);
    expect(e.internalErrors).toEqual([]);
  });

  it("keeps a child run with its parent", async () => {
    const e = engine();
    await e.registerWorkflow(wf("t.child", [{ id: "make", type: "agent", agent: { prompt_ref: "t/make@1" } }]));
    await e.registerWorkflow(wf("t.parent", [{ id: "kids", type: "subflow", subflow: { workflow_id: "t.child", per: "market" } }]));
    const p = await e.start({ client_id: CLIENT, workflow_id: "t.parent", markets: ["GB", "SG"] });
    await e.settle();
    const kids = await store.listRuns({ workflow_id: "t.child" });
    expect(kids.map((k) => k.parent)).toEqual([{ run_id: p.id, step_id: "kids" }, { run_id: p.id, step_id: "kids" }]);
    expect((await store.getRun(p.id))?.status).toBe("succeeded");
  });
});
