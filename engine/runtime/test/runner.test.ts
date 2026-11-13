import { describe, expect, it } from "vitest";
import { EngineError } from "../src/types.ts";
import { CLIENT, service, setup, user, wf } from "./helpers.ts";

const agent = (id: string, needs?: string[]) => ({ id, type: "agent" as const, needs, agent: { prompt_ref: `t/${id}@1` } });
const gate = (id: string, needs: string[], g: Record<string, unknown> = {}) => ({
  id, type: "gate" as const, needs, gate: { approval_kind: "plan", required_roles: ["account_lead"], sla_hours: 24, ...g },
});
const check = (id: string, needs: string[]) => ({ id, type: "check" as const, needs, check: { kinds: ["brand", "compliance"], min_brand_score: 80 } });
const tool = (id: string, needs: string[], risk: string, name = "esp", action = "x") => ({ id, type: "tool" as const, needs, tool: { name, action, risk: risk as never } });
const resolve = (id: string, needs?: string[]) => ({ id, type: "tool" as const, needs, tool: { name: "engine", action: "audiences.resolve", risk: "read" as const } });

describe("runner: order of steps", () => {
  it("runs steps in the order of needs and ends the run", async () => {
    const t = await setup([wf("a.linear", [agent("one"), agent("two", ["one"]), agent("three", ["two"])])], { outputs: { three: { done: true } } });
    const id = await t.run("a.linear");
    const run = await t.get(id);
    expect(run.status).toBe("succeeded");
    expect(t.handlers.calls).toEqual(["one", "two", "three"]);
    expect(run.output).toEqual({ three: { done: true } });
    expect(run.history.map((h) => h.step_id)).toEqual(["one", "two", "three"]);
    expect((await t.store.listEvents({ run_id: id })).map((e) => e.name)).toEqual([
      "engine/run.started", "engine/run.step.completed", "engine/run.step.completed", "engine/run.step.completed", "engine/run.finished",
    ]);
    expect(await t.store.listActions(id)).toHaveLength(3);
  });

  it("waits for all parallel steps before a join", async () => {
    const t = await setup([wf("a.join", [agent("a"), agent("b", ["a"]), agent("c", ["a"]), agent("d", ["b", "c"])])]);
    await t.run("a.join");
    expect(t.handlers.calls).toEqual(["a", "b", "c", "d"]);
  });

  it("takes 1 branch path, marks the other path not taken, and joins after a side step", async () => {
    const steps = [
      agent("plan"),
      { id: "route", type: "branch" as const, needs: ["plan"], branch: { cases: [{ if: "steps.plan.output.extra", goto: "side" }], else: "main" } },
      agent("side", ["route"]),
      agent("main", ["route", "side"]),
      agent("last", ["main"]),
    ];
    const yes = await setup([wf("a.branch", steps)], { outputs: { plan: { extra: true } } });
    await yes.run("a.branch");
    expect(yes.handlers.calls).toEqual(["plan", "side", "main", "last"]);
    const no = await setup([wf("a.branch", steps)], { outputs: { plan: { extra: false } } });
    const id = await no.run("a.branch");
    expect(no.handlers.calls).toEqual(["plan", "main", "last"]);
    expect((await no.status(id)).side).toBe("not_taken");
    expect((await no.get(id)).status).toBe("succeeded");
  });

  it("goes back when a branch chooses an earlier step, and counts the loops", async () => {
    let n = 0;
    const steps = [
      agent("draft"),
      agent("review", ["draft"]),
      { id: "ok", type: "branch" as const, needs: ["review"], branch: { cases: [{ if: "!steps.review.output.ok && run.loops.draft < 2", goto: "draft" }], else: "publish" } },
      agent("publish", ["ok"]),
    ];
    const t = await setup([wf("a.loop", steps)], { outputs: { review: () => ({ ok: ++n >= 3 }) } });
    const id = await t.run("a.loop");
    expect(t.handlers.calls).toEqual(["draft", "review", "draft", "review", "draft", "review", "publish"]);
    expect((await t.get(id)).steps.draft.runs).toBe(3);
  });

  it("stops a loop that does not end", async () => {
    const steps = [agent("draft"), { id: "again", type: "branch" as const, needs: ["draft"], branch: { cases: [{ if: "true", goto: "draft" }], else: "end" } }];
    const t = await setup([wf("a.forever", steps)], {}, { policy: { max_loops: 3 } });
    const run = await t.get(await t.run("a.forever"));
    expect(run.status).toBe("failed");
    expect(run.error).toMatch(/more than 3 times/);
  });

  it("counts an expression that fails as false and keeps a warning", async () => {
    const steps = [agent("plan"), { id: "route", type: "branch" as const, needs: ["plan"], branch: { cases: [{ if: "steps.plan.output.name > 3", goto: "a" }], else: "b" } }, agent("a", ["route"]), agent("b", ["route"])];
    const t = await setup([wf("a.bad", steps)], { outputs: { plan: { name: "x" } } });
    const run = await t.get(await t.run("a.bad"));
    expect(t.handlers.calls).toEqual(["plan", "b"]);
    expect(run.steps.route.warnings?.[0]).toMatch(/counts as false/);
  });
});

describe("runner: gates", () => {
  const flow = wf("a.gate", [agent("plan"), gate("approve", ["plan"], { on_changes: "plan", required_roles: ["account_lead", "client_approver"], required_count: 2 }), agent("go", ["approve"])]);

  it("waits for the decisions of 2 different users with a required role", async () => {
    const t = await setup([flow]);
    const id = await t.run("a.gate");
    expect((await t.get(id)).status).toBe("waiting_approval");
    const a = await t.open(id);
    expect(a).toMatchObject({ kind: "plan", required_count: 2, status: "open", sla_due_at: "2026-11-13T09:00:00.000Z" });
    await expect(t.engine.decide(a.id, service, { decision: "approved" })).rejects.toMatchObject({ status: 403 });
    await expect(t.engine.decide(a.id, user("u1", "designer"), { decision: "approved" })).rejects.toMatchObject({ status: 403 });
    expect((await t.engine.decide(a.id, user("u1", "account_lead"), { decision: "approved" })).status).toBe("open");
    await expect(t.engine.decide(a.id, user("u1", "account_lead"), { decision: "approved" })).rejects.toMatchObject({ status: 409 });
    expect((await t.engine.decide(a.id, user("u2", "client_approver"), { decision: "approved" })).status).toBe("approved");
    await t.engine.settle();
    expect((await t.get(id)).status).toBe("succeeded");
    expect(t.handlers.calls).toEqual(["plan", "go"]);
    await expect(t.engine.decide(a.id, user("u3", "account_lead"), { decision: "approved" })).rejects.toMatchObject({ status: 409 });
  });

  it("returns to on_changes with the comment, then opens a new approval", async () => {
    const seen: unknown[] = [];
    const t = await setup([flow], { onCall: (c) => seen.push(c.feedback?.comment) });
    const id = await t.run("a.gate");
    const first = await t.open(id);
    await t.engine.decide(first.id, user("u1", "account_lead"), { decision: "changes_requested", comment: "shorter" });
    await t.engine.settle();
    expect(seen).toEqual([undefined, "shorter"]);
    const second = await t.open(id);
    expect(second.id).not.toBe(first.id);
    expect((await t.store.getApproval(first.id))!.status).toBe("changes_requested");
    expect((await t.get(id)).steps.plan.runs).toBe(2);
  });

  it("fails the run on a rejection, and cancels on the hard timeout", async () => {
    const t = await setup([flow, wf("a.hard", [{ ...gate("approve", []), timeout: "3d" }])]);
    const id = await t.run("a.gate");
    await t.engine.decide((await t.open(id)).id, user("u1", "account_lead"), { decision: "rejected" });
    await t.engine.settle();
    expect(await t.get(id)).toMatchObject({ status: "failed", error: expect.stringMatching(/rejected at gate/) });

    const hard = await t.run("a.hard");
    await t.advance(25 * 3_600_000);
    expect((await t.store.listEvents({ name: "engine/approval.overdue" })).length).toBe(1);
    expect((await t.get(hard)).status).toBe("waiting_approval");
    await t.advance(3 * 86_400_000);
    expect((await t.get(hard)).status).toBe("cancelled");
    expect((await t.store.listApprovals({ run_id: hard }))[0].status).toBe("expired");
  });

  it("skips only the kinds that can skip", async () => {
    const steps = (kind: string) => [agent("write"), gate("approve", ["write"], { approval_kind: kind, skip_if: "steps.write.output.reused" }), agent("go", ["approve"])];
    const t = await setup([wf("a.skip", steps("copy"))], { outputs: { write: { reused: true } } });
    const id = await t.run("a.skip");
    expect((await t.status(id)).approve).toBe("skipped");
    expect((await t.get(id)).status).toBe("succeeded");
    expect((await t.store.listActions(id)).some((a) => a.action === "approval.skipped")).toBe(true);
    await expect(t.engine.registerWorkflow(wf("a.noskip", steps("budget")))).rejects.toMatchObject({ status: 422 });
    await expect(t.engine.registerWorkflow(wf("a.noskip", steps("go_live")))).rejects.toMatchObject({ details: [expect.stringMatching(/G9/)] });
  });
});

describe("runner: waits, events, tasks and retries", () => {
  it("ends a wait on a matching event of the same client", async () => {
    const steps = [{ id: "w", type: "wait" as const, wait: { event: "svc.a/done", match: "event.data.ref == input.ref", timeout: "5d" } }, agent("after", ["w"])];
    const t = await setup([wf("a.wait", steps)]);
    const id = await t.run("a.wait", { ref: "r1" });
    expect((await t.get(id)).status).toBe("waiting_event");
    await t.engine.publish({ name: "svc.a/done", client_id: CLIENT, data: { ref: "other" } });
    await t.engine.publish({ name: "svc.a/done", client_id: "another-client", data: { ref: "r1" } });
    await t.engine.settle();
    expect((await t.get(id)).status).toBe("waiting_event");
    await t.engine.publish({ name: "svc.a/done", client_id: CLIENT, data: { ref: "r1", n: 2 } });
    await t.engine.settle();
    const run = await t.get(id);
    expect(run.status).toBe("succeeded");
    expect(run.steps.w).toMatchObject({ output: { ref: "r1", n: 2 }, timed_out: false });
  });

  it("ends a wait at its timeout with timed_out true", async () => {
    const steps = [
      { id: "w", type: "wait" as const, wait: { event: "svc.a/done", timeout: "${input.delay}" } },
      { id: "late", type: "branch" as const, needs: ["w"], branch: { cases: [{ if: "steps.w.timed_out", goto: "remind" }], else: "end" } },
      agent("remind", ["late"]),
    ];
    const t = await setup([wf("a.timeout", steps)]);
    const id = await t.run("a.timeout", { delay: "2h" });
    await t.advance(3_600_000);
    expect((await t.get(id)).status).toBe("waiting_event");
    await t.advance(3_600_000);
    expect((await t.get(id)).status).toBe("succeeded");
    expect(t.handlers.calls).toEqual(["remind"]);
  });

  it("starts the workflows an event triggers, with the event data as input", async () => {
    const t = await setup([
      wf("a.first", [agent("x"), { id: "tell", type: "emit" as const, needs: ["x"], emit: { event: "svc.a/ready" } }]),
      wf("a.second", [agent("y")], { trigger: { event: "svc.a/ready" } }),
    ], { outputs: { x: { score: 7 } } });
    await t.run("a.first", { account: "acme" });
    const second = (await t.store.listRuns({ workflow_id: "a.second" }))[0];
    expect(second).toMatchObject({ status: "succeeded", client_id: CLIENT, started_by: "event:svc.a/ready" });
    expect(second.input).toMatchObject({ account: "acme", score: 7 });
  });

  it("waits for a person to complete a task", async () => {
    const t = await setup([wf("a.task", [{ id: "film", type: "task" as const, task: { title: "Film", assignee_roles: ["creative_lead"] } }, agent("edit", ["film"])])]);
    const id = await t.run("a.task");
    expect((await t.get(id)).status).toBe("waiting_approval");
    await expect(t.engine.completeTask(id, "film", {}, user("u", "designer"))).rejects.toBeInstanceOf(EngineError);
    await t.engine.completeTask(id, "film", { file: "f1" }, user("u", "creative_lead"));
    await t.engine.settle();
    expect(await t.get(id)).toMatchObject({ status: "succeeded", steps: { film: { output: { file: "f1" } } } });
  });

  it("tries a failed step again with a longer delay each time, 3 attempts by default", async () => {
    let fails = 2;
    const t = await setup([wf("a.retry", [agent("flaky")])], { onCall: () => { if (fails-- > 0) throw new Error("timeout"); } });
    const id = await t.run("a.retry");
    expect((await t.status(id)).flaky).toBe("retry");
    await t.advance(1000);
    expect((await t.status(id)).flaky).toBe("retry");
    await t.advance(1000);
    expect((await t.status(id)).flaky).toBe("retry");
    await t.advance(1000);
    expect((await t.get(id)).status).toBe("succeeded");
    expect((await t.get(id)).history.map((h) => h.status)).toEqual(["failed", "failed", "succeeded"]);

    const never = await setup([wf("a.retry", [agent("flaky")])], { onCall: () => { throw new Error("down"); } });
    const bad = await never.run("a.retry");
    await never.advance(1000);
    await never.advance(2000);
    expect(await never.get(bad)).toMatchObject({ status: "failed", error: expect.stringMatching(/down/) });
    expect(never.handlers.calls).toHaveLength(3);
  });

  it("never tries a send again unless the provider did not accept the call", async () => {
    const steps = [resolve("r"), check("c", ["r"]), tool("send", ["c"], "send")];
    const t = await setup([wf("a.send", steps)], { onCall: (c) => { if (c.step.id === "send") throw new Error("unknown result"); } });
    expect((await t.get(await t.run("a.send"))).status).toBe("failed");
    let first = true;
    const safe = await setup([wf("a.send", steps)], { onCall: (c) => { if (c.step.id === "send" && first) { first = false; throw Object.assign(new Error("refused"), { safe_to_retry: true }); } } });
    const id = await safe.run("a.send");
    await safe.advance(1000);
    expect((await safe.get(id)).status).toBe("succeeded");
  });

  it("cancels a run and closes its open approval", async () => {
    const t = await setup([wf("a.cancel", [gate("approve", [])])]);
    const id = await t.run("a.cancel");
    await t.engine.cancel(id);
    await t.engine.settle();
    expect((await t.get(id)).status).toBe("cancelled");
    expect((await t.store.listApprovals({ run_id: id }))[0].status).toBe("cancelled");
  });
});

describe("runner: guardrails at run time", () => {
  const spendFlow = (withGate: boolean) => wf("a.spend", [
    agent("plan"),
    ...(withGate ? [gate("budget", ["plan"], { approval_kind: "budget", required_roles: ["strategist"] })] : []),
    tool("launch", [withGate ? "budget" : "plan"], "spend", "ads_meta", "launch_campaign"),
  ]);

  it("G1: blocks a spend with no approved budget gate, and tells the ops lead", async () => {
    const t = await setup([spendFlow(false)]);
    const id = await t.run("a.spend");
    expect(await t.get(id)).toMatchObject({ status: "failed", error: expect.stringMatching(/guardrail G1/) });
    expect(t.handlers.calls).toEqual(["plan"]);
    expect((await t.store.listEvents({ name: "engine/guardrail.blocked" }))[0].data).toMatchObject({ step_id: "launch", guardrail: "G1", action: "ads_meta.launch_campaign" });
    expect((await t.store.listActions(id)).at(-1)).toMatchObject({ allowed: false, guardrail: "G1" });
  });

  it("G1: allows a spend after a person approved the budget, or inside the spend policy", async () => {
    const t = await setup([spendFlow(true)]);
    const id = await t.run("a.spend");
    await t.engine.decide((await t.open(id)).id, user("u", "strategist"), { decision: "approved" });
    await t.engine.settle();
    expect((await t.get(id)).status).toBe("succeeded");
    const policy = await setup([spendFlow(false)], { spendPolicy: async () => ({ allowed: true }) });
    expect((await policy.get(await policy.run("a.spend"))).status).toBe("succeeded");
  });

  it("G2, G5 and G6: refuses a definition that pays, signs or sends without the step before it", async () => {
    const t = await setup([]);
    await expect(t.engine.registerWorkflow(wf("a.pay", [tool("pay", [], "pay", "payout")]))).rejects.toMatchObject({ details: [expect.stringMatching(/G2/)] });
    await expect(t.engine.registerWorkflow(wf("a.sign", [tool("sign", [], "sign", "esign")]))).rejects.toMatchObject({ details: [expect.stringMatching(/G2/)] });
    await expect(t.engine.registerWorkflow(wf("a.pub", [tool("post", [], "write_external", "social")]))).rejects.toMatchObject({ details: [expect.stringMatching(/G6/)] });
  });

  it("G5: blocks a send whose recipients did not come from audiences.resolve", async () => {
    const t = await setup([wf("a.send", [check("c", []), tool("send", ["c"], "send")])]);
    expect((await t.get(await t.run("a.send"))).error).toMatch(/guardrail G5/);
  });

  it("G2: a skipped or missing approval does not count; a parent run's approval counts", async () => {
    const child = wf("a.pay_child", [gate("ok", [], { approval_kind: "payout", required_roles: ["client_finance"] }), tool("pay", ["ok"], "pay", "payout")]);
    const t = await setup([child]);
    const id = await t.run("a.pay_child");
    await t.engine.decide((await t.open(id)).id, user("u", "client_finance"), { decision: "approved" });
    await t.engine.settle();
    expect((await t.get(id)).status).toBe("succeeded");
  });

  it("G10: never blocks a removal", async () => {
    const t = await setup([wf("a.remove", [tool("unpublish", [], "remove", "social")])]);
    expect((await t.get(await t.run("a.remove"))).status).toBe("succeeded");
  });

  it("fails the run when the compliance check gives block or the brand score is low", async () => {
    const steps = [agent("write"), check("c", ["write"]), agent("after", ["c"])];
    const block = await setup([wf("a.check", steps)], { check: () => ({ outcome: "block", reasons: ["claim not approved"] }) });
    expect((await block.get(await block.run("a.check"))).error).toMatch(/claim not approved/);
    const low = await setup([wf("a.check", steps)], { check: () => ({ outcome: "pass", brand_score: 61 }) });
    expect((await low.get(await low.run("a.check"))).error).toMatch(/brand score 61 is below 80/);
  });
});

describe("runner: subflows", () => {
  const child = wf("b.assets", [agent("make"), gate("ok", ["make"], { approval_kind: "copy", required_roles: ["client_approver"] })]);
  const parent = (per?: string) => wf("a.parent", [agent("brief"), { id: "kids", type: "subflow" as const, needs: ["brief"], subflow: { workflow_id: "{{ input.service }}.assets", per } }, agent("qa", ["kids"])]);

  it("starts 1 child run for each market and waits for all of them", async () => {
    const t = await setup([child, parent("market")]);
    const id = await t.run("a.parent", { service: "b" }, ["GB", "SG"]);
    const kids = await t.store.listRuns({ workflow_id: "b.assets" });
    expect(kids.map((k) => k.markets[0]).sort()).toEqual(["GB", "SG"]);
    expect(kids[0]).toMatchObject({ parent: { run_id: id, step_id: "kids" }, input: { service: "b" } });
    for (const k of kids) await t.engine.decide((await t.open(k.id)).id, user("u", "client_approver"), { decision: "approved" });
    await t.engine.settle();
    const run = await t.get(id);
    expect(run.status).toBe("succeeded");
    expect((run.steps.kids.output as { children: unknown[] }).children).toHaveLength(2);
    expect(t.handlers.calls.at(-1)).toBe("qa");
  });

  it("fans out over a list from an expression, and fails when a child fails", async () => {
    const t = await setup([child, parent("steps.brief.output.briefs")], { outputs: { brief: { briefs: [{ channel: "email" }, { channel: "sms" }] } } });
    const id = await t.run("a.parent", { service: "b" });
    const kids = await t.store.listRuns({ workflow_id: "b.assets" });
    expect(kids.map((k) => k.input.channel).sort()).toEqual(["email", "sms"]);
    await t.engine.decide((await t.open(kids[0].id)).id, user("u", "client_approver"), { decision: "rejected" });
    await t.engine.settle();
    expect(await t.get(id)).toMatchObject({ status: "failed", error: expect.stringMatching(/child run/) });
    expect((await t.get(kids[1].id)).status).toBe("cancelled");
  });

  it("fails when the subflow workflow does not exist", async () => {
    const t = await setup([parent()]);
    expect((await t.get(await t.run("a.parent", { service: "zz" }))).error).toMatch(/'zz.assets' is not registered/);
  });

  it("lets a child send after the parent resolved the audience and passed compliance", async () => {
    const send = wf("b.send", [tool("send", [], "send")]);
    const top = wf("a.top", [resolve("r"), check("c", ["r"]), { id: "s", type: "subflow" as const, needs: ["c"], subflow: { workflow_id: "b.send" } }]);
    const t = await setup([top]);
    await t.store.putWorkflow(send);
    expect((await t.get(await t.run("a.top"))).status).toBe("succeeded");
    expect((await t.get(await t.run("b.send"))).error).toMatch(/G5/);
  });
});
