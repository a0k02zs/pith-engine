// The workflow runner. It is a state machine: start, publish (events), decide (approvals),
// completeTask, cancel and tick (time) move runs forward. All work on 1 run happens in order.
// Storage, agents, tools, checks and the clock are ports, so the same code runs in tests,
// in the simulator and on Postgres.
import { durationMs, ExprError, evaluate, render, templateExprs, test, type Vars } from "./expr.ts";
import { ancestors, branchTargets, buildGraph, checkDefinition, descendants, SKIPPABLE_KINDS, type Graph, type Problem } from "./graph.ts";
import { checkTool } from "./guardrails.ts";
import {
  EngineError,
  type ActionRecord,
  type Actor,
  type Approval,
  type Decision,
  type EngineEvent,
  type Handlers,
  type RunState,
  type RunStatus,
  type Step,
  type StepContext,
  type StepState,
  type Store,
  type Workflow,
} from "./types.ts";

export interface Policy {
  /** Attempts for a step that fails (specs/workflow.md §2). */
  max_attempts: number;
  /** First retry delay. Each next delay is 2 times longer. */
  backoff_ms: number;
  /** How many times a loop can send a run back to the same step. */
  max_loops: number;
  default_sla_hours: number;
  /** A run can start child runs this many levels deep. */
  max_depth: number;
}

export const DEFAULT_POLICY: Policy = { max_attempts: 3, backoff_ms: 30_000, max_loops: 10, default_sla_hours: 48, max_depth: 6 };

/** Lets the simulator force the outcome of a decision point. Return undefined to use the normal rule. */
export interface Oracle {
  /** `targets` are the step ids the branch can choose; null means: choose nothing. Return 1 entry of `targets`. */
  branch?(run: RunState, step: Step, targets: (string | null)[]): string | null | undefined;
  skip?(run: RunState, step: Step): boolean | undefined;
  /** Return an output to end a subflow step with no child runs. */
  subflow?(run: RunState, step: Step): unknown | undefined;
}

export interface EngineOptions {
  store: Store;
  handlers: Handlers;
  policy?: Partial<Policy>;
  clock?: () => Date;
  newId?: () => string;
  oracle?: Oracle;
}

export interface StartRequest {
  client_id: string;
  workflow_id: string;
  version?: number;
  markets?: string[];
  input?: Record<string, unknown>;
  started_by?: string;
  parent?: { run_id: string; step_id: string };
  trigger_event?: EngineEvent;
}

interface Job {
  run: RunState;
  wf: Workflow;
  g: Graph;
  extra?: { client?: Record<string, unknown>; brain?: Record<string, unknown> };
}

const RISKY = ["send", "spend", "sign", "pay"];
const ENDED: RunStatus[] = ["succeeded", "failed", "cancelled"];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export class Engine {
  readonly store: Store;
  readonly policy: Policy;
  private handlers: Handlers;
  private clock: () => Date;
  private newId: () => string;
  private oracle?: Oracle;
  private graphs = new Map<string, Graph>();
  private chains = new Map<string, Promise<unknown>>();
  private active = new Set<Promise<unknown>>();
  private outbox: EngineEvent[] = [];
  /** Errors in the engine itself (not in a step). A test or the server reads them. */
  readonly internalErrors: { run_id: string; message: string }[] = [];

  constructor(opts: EngineOptions) {
    this.store = opts.store;
    this.handlers = opts.handlers;
    this.policy = { ...DEFAULT_POLICY, ...opts.policy };
    this.clock = opts.clock ?? (() => new Date());
    this.newId = opts.newId ?? (() => crypto.randomUUID());
    this.oracle = opts.oracle;
  }

  // ---------------------------------------------------------------- definitions

  /** Checks and stores a definition. Throws EngineError 422 when it breaks a rule. Returns the warnings. */
  async registerWorkflow(wf: Workflow): Promise<Problem[]> {
    const problems = checkDefinition(wf);
    const errors = problems.filter((p) => p.level === "error");
    if (errors.length) throw new EngineError(422, `workflow '${wf?.id}' breaks ${errors.length} rules`, errors.map((p) => `[${p.rule}] ${p.message}`));
    await this.store.putWorkflow(wf);
    this.graphs.delete(`${wf.id}@${wf.version}`);
    return problems;
  }

  private graph(wf: Workflow): Graph {
    const key = `${wf.id}@${wf.version}`;
    let g = this.graphs.get(key);
    if (!g) this.graphs.set(key, (g = buildGraph(wf)));
    return g;
  }

  // ---------------------------------------------------------------- public operations

  /** Starts a run. The run moves forward in the background; call settle() to wait for it. */
  async start(req: StartRequest): Promise<RunState> {
    const wf = await this.store.getWorkflow(req.workflow_id, req.version);
    if (!wf) throw new EngineError(404, `workflow '${req.workflow_id}' is not registered`);
    if (!req.client_id) throw new EngineError(422, "client_id is required");
    const input: Record<string, unknown> = { ...(req.input ?? {}) };
    for (const [key, prop] of Object.entries(wf.inputs?.properties ?? {})) if (input[key] === undefined && prop?.default !== undefined) input[key] = prop.default;
    const now = this.clock().toISOString();
    const run: RunState = {
      id: this.newId(),
      client_id: req.client_id,
      workflow_id: wf.id,
      workflow_version: wf.version,
      service: wf.service,
      markets: req.markets ?? (Array.isArray(input.markets) ? (input.markets as string[]) : []),
      parent: req.parent,
      status: "running",
      input,
      started_by: req.started_by ?? "system",
      started_at: now,
      trigger_event: req.trigger_event,
      steps: Object.fromEntries(wf.steps.map((s) => [s.id, { status: "pending", attempt: 0, runs: 0 } satisfies StepState])),
      history: [],
      waiting_events: [],
    };
    await this.save(run);
    this.emit(run, "engine/run.started", { workflow_id: wf.id, service: wf.service, markets: run.markets });
    this.kick(run.id);
    return run;
  }

  /** Sends an event into the engine: it starts the workflows it triggers and ends the waits it matches. */
  async publish(event: EngineEvent): Promise<void> {
    this.outbox.push({ ...event, data: event.data ?? {} });
    await this.track(this.flush());
  }

  /** Records a decision on an approval. Only a user with 1 of the required roles can decide. */
  async decide(approvalId: string, actor: Actor, body: { decision: Decision["decision"]; comment?: string; edits?: unknown }): Promise<Approval> {
    const first = await this.store.getApproval(approvalId);
    if (!first) throw new EngineError(404, "approval not found");
    return this.job(first.run_id, async (j) => {
      const a = (await this.store.getApproval(approvalId))!;
      if (actor.kind !== "user") throw new EngineError(403, "only a user can decide an approval");
      if (!["approved", "rejected", "changes_requested"].includes(body.decision)) throw new EngineError(422, "decision must be approved, rejected or changes_requested");
      if (a.status !== "open") throw new EngineError(409, `approval is ${a.status}`);
      const role = a.required_roles.find((r) => actor.roles.includes(r));
      if (!role) throw new EngineError(403, `this decision needs 1 of the roles: ${a.required_roles.join(", ")}`);
      if (a.decisions.some((d) => d.decided_by === actor.id)) throw new EngineError(409, "this user decided this approval before");
      const now = this.clock().toISOString();
      a.decisions.push({ decided_by: actor.id, role, decision: body.decision, comment: body.comment, edits: body.edits, at: now });
      const approvals = a.decisions.filter((d) => d.decision === "approved").length;
      if (body.decision !== "approved") a.status = body.decision;
      else if (approvals >= a.required_count) a.status = "approved";
      if (a.status !== "open") a.closed_at = now;
      await this.store.saveApproval(a);
      await this.store.logAction({
        client_id: a.client_id, run_id: a.run_id, step_id: a.step_id, actor: `user:${actor.id}`, action: `approval.${body.decision}`,
        target: a.id, allowed: true, detail: { kind: a.kind, role }, at: now,
      });
      if (a.status === "open" || !j) return a;
      this.emit(j.run, "engine/approval.decided", {
        approval_id: a.id, step_id: a.step_id, kind: a.kind, decision: a.status,
        decided_by: a.decisions.map((d) => d.decided_by), comment: body.comment, edits: body.edits,
      });
      const step = j.g.byId.get(a.step_id);
      const st = j.run.steps[a.step_id];
      if (!step || st?.status !== "waiting" || st.wait?.approval_id !== a.id) return a;
      const output = { decision: a.status, approval_id: a.id, decided_by: a.decisions.map((d) => d.decided_by) };
      if (a.status === "approved") this.succeed(j, step, output);
      else {
        const back = a.status === "changes_requested" || step.gate?.on_reject === "goto" ? step.gate?.on_changes : undefined;
        if (back && j.g.byId.has(back)) {
          this.record(j, step, "succeeded", output);
          this.loopTo(j, back, { gate: step.id, decision: a.status, comment: body.comment, edits: body.edits });
        } else this.fail(j, step, a.status === "rejected" ? `rejected at gate '${step.id}'` : `changes requested at gate '${step.id}', which has no on_changes step`);
      }
      return a;
    });
  }

  /** Marks a task step as done with its output. */
  async completeTask(runId: string, stepId: string, output: unknown, actor: Actor): Promise<void> {
    await this.job(runId, async (j) => {
      if (!j) throw new EngineError(409, "the run has ended");
      const step = j.g.byId.get(stepId);
      const st = j.run.steps[stepId];
      if (!step || step.type !== "task") throw new EngineError(404, "task step not found");
      if (st.status !== "waiting") throw new EngineError(409, `task is ${st.status}`);
      const roles = step.task?.assignee_roles ?? [];
      if (actor.kind !== "user") throw new EngineError(403, "only a user can complete a task");
      if (roles.length && !roles.some((r) => actor.roles.includes(r))) throw new EngineError(403, `this task needs 1 of the roles: ${roles.join(", ")}`);
      await this.log(j, step, { actor: `user:${actor.id}`, action: "task.completed", allowed: true });
      this.succeed(j, step, output ?? {});
    });
  }

  /** Ends a wait step by hand (an operator decision). The step gets `data` as its output. */
  async resolveWait(runId: string, stepId: string, data: unknown, actor: Actor): Promise<void> {
    await this.job(runId, async (j) => {
      if (!j) throw new EngineError(409, "the run has ended");
      const step = j.g.byId.get(stepId);
      const st = j.run.steps[stepId];
      if (!step || step.type !== "wait" || st.status !== "waiting") throw new EngineError(409, "the step is not a waiting wait step");
      await this.log(j, step, { actor: `${actor.kind}:${actor.id}`, action: "wait.resolved", allowed: true });
      st.timed_out = false;
      this.succeed(j, step, data ?? {});
    });
  }

  async cancel(runId: string, reason = "cancelled"): Promise<void> {
    const run = await this.store.getRun(runId);
    if (!run) throw new EngineError(404, "run not found");
    await this.job(runId, async (j) => {
      if (j) this.finish(j, "cancelled", reason);
    });
  }

  /** Moves time forward: wait timeouts, retries, approval SLAs and hard timeouts. Call it on a timer. */
  async tick(now: Date = this.clock()): Promise<void> {
    for (const id of await this.store.runsDue(now)) this.kick(id);
    for (const a of await this.store.listApprovals({ status: "open" })) {
      if (a.overdue_sent || Date.parse(a.sla_due_at) > now.getTime()) continue;
      a.overdue_sent = true;
      await this.store.saveApproval(a);
      this.outbox.push({ name: "engine/approval.overdue", client_id: a.client_id, data: { client_id: a.client_id, approval_id: a.id, run_id: a.run_id, kind: a.kind, sla_due_at: a.sla_due_at } });
    }
    await this.track(this.flush());
    await this.settle();
  }

  /** Waits until no run has work left to do now. */
  async settle(): Promise<void> {
    while (this.active.size) await Promise.allSettled([...this.active]);
  }

  // ---------------------------------------------------------------- job queue

  private track<T>(p: Promise<T>): Promise<T> {
    const guarded = p.catch(() => undefined);
    this.active.add(guarded);
    void guarded.finally(() => this.active.delete(guarded));
    return p;
  }

  /**
   * Runs `fn` for 1 run, after every earlier job of that run. Then moves the run forward and saves it.
   * `fn` gets no job when the run has ended.
   */
  private job<T>(runId: string, fn: (j: Job | undefined) => Promise<T>): Promise<T> {
    const prev = this.chains.get(runId) ?? Promise.resolve();
    const next = prev.then(async () => {
      const run = await this.store.getRun(runId);
      if (!run) throw new EngineError(404, "run not found");
      if (ENDED.includes(run.status)) return fn(undefined);
      const wf = await this.store.getWorkflow(run.workflow_id, run.workflow_version);
      if (!wf) throw new EngineError(404, `workflow '${run.workflow_id}' version ${run.workflow_version} is not registered`);
      const j: Job = { run, wf, g: this.graph(wf) };
      let result: T;
      try {
        result = await fn(j);
        if (!ENDED.includes(j.run.status)) await this.advance(j);
      } catch (e) {
        // A refused request (EngineError) changes nothing. Any other error is a defect in the engine: stop the run.
        if (e instanceof EngineError) {
          await this.save(j.run);
          await this.flush();
          throw e;
        }
        this.internalErrors.push({ run_id: runId, message: message(e) });
        if (!ENDED.includes(j.run.status)) this.finish(j, "failed", `engine error: ${message(e)}`);
        await this.save(j.run);
        await this.flush();
        throw e;
      }
      await this.save(j.run);
      await this.flush();
      return result;
    });
    const guarded = next.catch(() => undefined);
    this.chains.set(runId, guarded);
    void guarded.finally(() => {
      if (this.chains.get(runId) === guarded) this.chains.delete(runId);
    });
    return this.track(next);
  }

  /** Queues a job that only moves the run forward. */
  private kick(runId: string): void {
    void this.job(runId, async () => {}).catch(() => undefined);
  }

  private async save(run: RunState): Promise<void> {
    const waits = Object.values(run.steps).filter((s) => s.status === "waiting" || s.status === "retry");
    const times = waits.map((s) => s.wait?.deadline).filter((d): d is string => Boolean(d)).sort();
    run.next_wake_at = ENDED.includes(run.status) ? null : (times[0] ?? null);
    run.waiting_events = ENDED.includes(run.status) ? [] : [...new Set(waits.map((s) => (s.wait?.kind === "event" ? s.wait.event : undefined)).filter((e): e is string => Boolean(e)))];
    await this.store.saveRun(run);
  }

  private emit(run: RunState, name: string, data: Record<string, unknown>): void {
    this.outbox.push({ name, client_id: run.client_id, data: { client_id: run.client_id, run_id: run.id, ...data } });
  }

  /** Delivers the events in the outbox: log, start triggered workflows, wake waiting runs, tell parent runs. */
  private async flush(): Promise<void> {
    while (this.outbox.length) {
      const e = this.outbox.shift()!;
      e.id ??= this.newId();
      e.at ??= this.clock().toISOString();
      e.client_id ??= typeof e.data.client_id === "string" ? e.data.client_id : undefined;
      await this.store.logEvent(e);
      if (e.name === "engine/run.finished") {
        const child = await this.store.getRun(String(e.data.run_id));
        if (child?.parent) void this.job(child.parent.run_id, async (j) => j && this.childEnded(j, child.parent!.step_id)).catch(() => undefined);
      }
      if (!e.name.startsWith("engine/run.") && e.client_id) {
        for (const wf of await this.store.listWorkflows()) {
          if (wf.trigger?.event !== e.name) continue;
          await this.start({ client_id: e.client_id, workflow_id: wf.id, version: wf.version, input: e.data, started_by: `event:${e.name}`, trigger_event: e });
        }
      }
      for (const id of await this.store.runsWaitingFor(e.name)) void this.job(id, async (j) => j && this.deliver(j, e)).catch(() => undefined);
    }
  }

  // ---------------------------------------------------------------- moving a run forward

  private async vars(j: Job, event?: EngineEvent): Promise<Vars> {
    if (!j.extra) j.extra = this.handlers.context ? await this.handlers.context(j.run) : {};
    const now = this.clock();
    const steps = Object.fromEntries(Object.entries(j.run.steps).map(([id, s]) => [id, { output: s.output ?? null, status: s.status, timed_out: s.timed_out ?? false }]));
    return {
      input: j.run.input,
      steps,
      client: { id: j.run.client_id, markets: j.run.markets, ...(j.extra.client ?? {}) },
      brain: j.extra.brain ?? {},
      run: {
        id: j.run.id, workflow_id: j.run.workflow_id, markets: j.run.markets, parent_run_id: j.run.parent?.run_id ?? null,
        loops: Object.fromEntries(Object.entries(j.run.steps).map(([id, s]) => [id, Math.max(0, s.runs - 1)])),
      },
      now: {
        iso: now.toISOString(), date: now.toISOString().slice(0, 10), hour: now.getUTCHours(),
        weekday: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getUTCDay()],
      },
      event: event ?? j.run.trigger_event ?? { name: null, data: j.run.input },
    };
  }

  /** 'ready': start the step. 'dead': the step is not taken. 'wait': an edge is not decided. */
  private readiness(j: Job, step: Step): "ready" | "dead" | "wait" {
    const st = j.run.steps[step.id];
    if (st.forced) return "ready";
    const edges = j.g.into.get(step.id) ?? [];
    if (!edges.length) return st.runs === 0 ? "ready" : "dead";
    let live = false;
    for (const e of edges) {
      const from = j.run.steps[e.from];
      if (["pending", "running", "waiting", "retry"].includes(from.status)) return "wait";
      if (e.kind === "goto") live ||= from.status === "succeeded" && (from.chosen ?? []).includes(step.id);
      else live ||= from.status === "succeeded" || from.status === "skipped";
    }
    return live ? "ready" : "dead";
  }

  private async advance(j: Job): Promise<void> {
    const now = this.clock().getTime();
    for (let progressed = true; progressed && !ENDED.includes(j.run.status); ) {
      progressed = false;
      for (const step of j.wf.steps) {
        if (ENDED.includes(j.run.status)) break;
        const st = j.run.steps[step.id];
        const due = st.wait?.deadline ? Date.parse(st.wait.deadline) <= now : false;
        if (st.status === "pending") {
          const r = this.readiness(j, step);
          if (r === "wait") continue;
          if (r === "dead") st.status = "not_taken";
          else await this.runStep(j, step);
          progressed = true;
        } else if (st.status === "retry" && due) {
          await this.runStep(j, step);
          progressed = true;
        } else if (st.status === "waiting" && due) {
          await this.timeout(j, step);
          progressed = true;
        }
      }
    }
    if (ENDED.includes(j.run.status)) return;
    const states = Object.values(j.run.steps);
    const waiting = states.filter((s) => s.status === "waiting" || s.status === "retry");
    if (!waiting.length) {
      const stuck = Object.entries(j.run.steps).filter(([, s]) => s.status === "pending").map(([id]) => id);
      if (stuck.length) this.finish(j, "failed", `these steps can never start: ${stuck.join(", ")}`);
      else this.finish(j, "succeeded");
      return;
    }
    j.run.status = waiting.some((s) => s.wait?.kind === "approval" || s.wait?.kind === "task") ? "waiting_approval" : "waiting_event";
  }

  private context(j: Job, step: Step): StepContext {
    const st = j.run.steps[step.id];
    const inputs: Record<string, unknown> = {};
    for (const e of j.g.into.get(step.id) ?? []) inputs[e.from] = j.run.steps[e.from].output ?? null;
    return {
      run: j.run, workflow: j.wf, step, attempt: st.attempt, inputs, feedback: st.feedback,
      idempotency_key: `${j.run.id}:${step.id}:${st.runs}`, now: this.clock(),
    };
  }

  private async log(j: Job, step: Step, a: Partial<ActionRecord> & { actor: string; action: string; allowed: boolean }): Promise<void> {
    await this.store.logAction({ client_id: j.run.client_id, run_id: j.run.id, step_id: step.id, at: this.clock().toISOString(), ...a });
  }

  private record(j: Job, step: Step, status: "succeeded" | "failed" | "skipped", output?: unknown, error?: string): void {
    const st = j.run.steps[step.id];
    j.run.history.push({ step_id: step.id, type: step.type, attempt: st.attempt, status, output, error, started_at: st.started_at ?? this.clock().toISOString(), ended_at: this.clock().toISOString() });
    this.emit(j.run, "engine/run.step.completed", { step_id: step.id, status });
  }

  private succeed(j: Job, step: Step, output: unknown): void {
    const st = j.run.steps[step.id];
    Object.assign(st, { status: "succeeded", output, error: undefined, wait: undefined, forced: false, ended_at: this.clock().toISOString() });
    this.record(j, step, "succeeded", output);
  }

  private fail(j: Job, step: Step, error: string): void {
    const st = j.run.steps[step.id];
    if (st.wait) void this.track(this.dropWait(j, step.id));
    Object.assign(st, { status: "failed", error, wait: undefined, forced: false, ended_at: this.clock().toISOString() });
    this.record(j, step, "failed", undefined, error);
    this.finish(j, "failed", `step '${step.id}' failed: ${error}`);
  }

  private finish(j: Job, status: "succeeded" | "failed" | "cancelled", error?: string): void {
    const run = j.run;
    const now = this.clock().toISOString();
    for (const [id, st] of Object.entries(run.steps)) {
      if (!["pending", "running", "waiting", "retry"].includes(st.status)) continue;
      void this.track(this.dropWait(j, id));
      st.status = "cancelled";
      st.wait = undefined;
    }
    run.status = status;
    run.error = error;
    run.ended_at = now;
    if (status === "succeeded") {
      const leaves = j.wf.steps.filter((s) => !(j.g.out.get(s.id) ?? []).length && ["succeeded", "skipped"].includes(run.steps[s.id].status));
      run.output = Object.fromEntries(leaves.map((s) => [s.id, run.steps[s.id].output ?? null]));
    }
    this.emit(run, "engine/run.finished", { workflow_id: run.workflow_id, status, error, output: run.output });
  }

  /** Closes what a waiting step left open: its approval item or its child runs. */
  private async dropWait(j: Job, stepId: string): Promise<void> {
    const w = j.run.steps[stepId].wait;
    if (w?.approval_id) {
      const a = await this.store.getApproval(w.approval_id);
      if (a?.status === "open") await this.store.saveApproval({ ...a, status: "cancelled", closed_at: this.clock().toISOString() });
    }
    for (const child of w?.children ?? []) void this.cancel(child, `parent run ${j.run.id} ended`).catch(() => undefined);
  }

  /** Sends the run back to `target`: that step and every step after it run again. */
  private loopTo(j: Job, target: string, feedback?: StepState["feedback"]): void {
    const t = j.run.steps[target];
    if (t.runs > this.policy.max_loops) {
      this.finish(j, "failed", `the run went back to step '${target}' more than ${this.policy.max_loops} times`);
      return;
    }
    for (const id of [target, ...descendants(j.g, target)]) {
      const st = j.run.steps[id];
      if (st.status === "waiting") void this.track(this.dropWait(j, id));
      Object.assign(st, { status: "pending", attempt: 0, error: undefined, timed_out: undefined, chosen: undefined, wait: undefined, forced: false, feedback: undefined });
    }
    t.forced = true;
    t.feedback = feedback;
  }

  private async runStep(j: Job, step: Step): Promise<void> {
    const st = j.run.steps[step.id];
    const firstAttempt = st.status !== "retry";
    st.status = "running";
    st.wait = undefined;
    st.attempt = firstAttempt ? 1 : st.attempt + 1;
    if (firstAttempt) st.runs += 1;
    st.started_at = this.clock().toISOString();
    st.warnings = undefined;
    try {
      await this.execType(j, step, st);
    } catch (e) {
      const err = e as { safe_to_retry?: boolean; retryable?: boolean };
      const risky = step.type === "tool" && RISKY.includes(step.tool?.risk ?? "");
      // A send, spend, signature or payment is never tried again unless the provider did not accept the call.
      const retryable = !(e instanceof ExprError) && !(e instanceof EngineError) && (risky ? err?.safe_to_retry === true : err?.retryable !== false);
      const max = step.retry?.attempts ?? this.policy.max_attempts;
      if (retryable && st.attempt < max) {
        this.record(j, step, "failed", undefined, message(e));
        st.status = "retry";
        st.error = message(e);
        st.wait = { kind: "retry", deadline: new Date(this.clock().getTime() + this.policy.backoff_ms * 2 ** (st.attempt - 1)).toISOString() };
      } else this.fail(j, step, message(e));
    }
  }

  private async execType(j: Job, step: Step, st: StepState): Promise<void> {
    const warn = (text: string) => (st.warnings = [...(st.warnings ?? []), text]);
    const cond = async (expr: string, event?: EngineEvent): Promise<boolean> => {
      const r = test(expr, await this.vars(j, event));
      if (r.error) warn(`expression failed and counts as false: ${r.error} in: ${expr}`);
      return r.value;
    };
    switch (step.type) {
      case "agent": {
        const res = await this.handlers.agent(this.context(j, step));
        await this.log(j, step, {
          actor: `agent:${step.agent?.prompt_ref ?? step.id}`, action: "agent.run", model: res.model ?? step.agent?.model,
          input_tokens: res.input_tokens, output_tokens: res.output_tokens, cost_usd: res.cost_usd, allowed: true,
        });
        return this.succeed(j, step, res.output ?? {});
      }
      case "tool": {
        const tool = step.tool!;
        const action = `${tool.name}.${tool.action ?? "call"}`;
        const ctx = this.context(j, step);
        const block = await checkTool(j.run, j.g, step, ctx, this.store, this.handlers);
        if (block) {
          await this.log(j, step, { actor: `tool:${tool.name}`, action, allowed: false, guardrail: block.rule, detail: { reason: block.reason, risk: tool.risk } });
          this.emit(j.run, "engine/guardrail.blocked", { step_id: step.id, action, guardrail: block.rule, reason: block.reason });
          return this.fail(j, step, `guardrail ${block.rule}: ${block.reason}`);
        }
        const output = await this.handlers.tool(ctx);
        await this.log(j, step, { actor: `tool:${tool.name}`, action, allowed: true, detail: { risk: tool.risk, idempotency_key: ctx.idempotency_key } });
        return this.succeed(j, step, output ?? {});
      }
      case "check": {
        const res = await this.handlers.check(this.context(j, step));
        await this.log(j, step, { actor: "engine:check", action: `check.${(step.check?.kinds ?? []).join("+") || "run"}`, allowed: res.outcome !== "block", detail: { outcome: res.outcome, brand_score: res.brand_score } });
        st.output = res;
        if (res.outcome === "block") return this.fail(j, step, `check result is block${res.reasons?.length ? `: ${res.reasons.join("; ")}` : ""}`);
        const min = step.check?.min_brand_score;
        if (min != null && typeof res.brand_score === "number" && res.brand_score < min) return this.fail(j, step, `brand score ${res.brand_score} is below ${min}`);
        return this.succeed(j, step, res);
      }
      case "gate": {
        const gate = step.gate!;
        const forced = this.oracle?.skip?.(j.run, step);
        const skippable = SKIPPABLE_KINDS.includes(gate.approval_kind) && Boolean(gate.skip_if);
        if (skippable && (forced ?? (await cond(gate.skip_if!)))) {
          Object.assign(st, { status: "skipped", output: { decision: "skipped", rule: gate.skip_if }, forced: false, ended_at: this.clock().toISOString() });
          await this.log(j, step, { actor: "engine:gate", action: "approval.skipped", allowed: true, detail: { kind: gate.approval_kind, rule: gate.skip_if } });
          return this.record(j, step, "skipped", st.output);
        }
        const now = this.clock();
        const a: Approval = {
          id: this.newId(), client_id: j.run.client_id, run_id: j.run.id, step_id: step.id, service: j.run.service, kind: gate.approval_kind,
          title: step.name ?? `${j.wf.id}: ${step.id}`, payload: { workflow_id: j.wf.id, inputs: this.context(j, step).inputs, feedback: st.feedback },
          required_roles: gate.required_roles ?? [], required_count: gate.required_count ?? 1,
          priority: gate.approval_kind === "escalation" ? "urgent" : "normal",
          sla_due_at: new Date(now.getTime() + (gate.sla_hours ?? this.policy.default_sla_hours) * 3_600_000).toISOString(),
          status: "open", decisions: [], created_at: now.toISOString(),
        };
        await this.store.saveApproval(a);
        const hard = step.timeout ? durationMs(step.timeout) : null;
        st.status = "waiting";
        st.wait = { kind: "approval", approval_id: a.id, deadline: hard != null ? new Date(now.getTime() + hard).toISOString() : undefined };
        this.emit(j.run, "engine/approval.requested", { ...a, approval_id: a.id });
        return;
      }
      case "wait": {
        const w = step.wait ?? {};
        const vars = await this.vars(j);
        const event = w.event ? (templateExprs(w.event).length ? render(w.event, vars) : w.event) : undefined;
        if (w.event && !event) throw new ExprError(`the event name '${w.event}' is empty`);
        let deadline: string | undefined;
        if (w.timeout) {
          const raw = templateExprs(w.timeout).length ? evaluate(templateExprs(w.timeout)[0], vars) : w.timeout;
          const ms = durationMs(raw) ?? (typeof raw === "string" && !Number.isNaN(Date.parse(raw)) ? Math.max(0, Date.parse(raw) - this.clock().getTime()) : null);
          if (ms == null) throw new ExprError(`the timeout '${w.timeout}' gives '${String(raw)}', which is not a duration or a time`);
          deadline = new Date(this.clock().getTime() + ms).toISOString();
        }
        st.status = "waiting";
        st.wait = event ? { kind: "event", event, match: w.match, deadline } : { kind: "timer", deadline };
        return;
      }
      case "branch": {
        const cases = step.branch?.cases ?? [];
        const options: (string | null)[] = [...new Set([...cases.map((c) => c.goto), step.branch?.else ?? null])].map((t) => (t && j.g.byId.has(t) ? t : null));
        let target = this.oracle?.branch?.(j.run, step, [...new Set(options)]);
        if (target === undefined) {
          target = step.branch?.else ?? null;
          for (const c of cases) {
            if (await cond(c.if)) {
              target = c.goto;
              break;
            }
          }
        }
        const chosen = target && j.g.byId.has(target) ? target : null;
        st.chosen = chosen ? [chosen] : [];
        this.succeed(j, step, { chosen });
        if (chosen && j.g.loops.get(step.id)?.has(chosen)) this.loopTo(j, chosen);
        return;
      }
      case "emit": {
        const vars = await this.vars(j);
        const name = templateExprs(step.emit!.event).length ? render(step.emit!.event, vars) : step.emit!.event;
        const data: Record<string, unknown> = { ...j.run.input };
        for (const out of Object.values(this.context(j, step).inputs)) if (isObj(out)) Object.assign(data, out);
        this.emit(j.run, name, { ...data, workflow_id: j.wf.id, service: j.run.service, step_id: step.id });
        return this.succeed(j, step, { event: name });
      }
      case "task": {
        st.status = "waiting";
        st.wait = { kind: "task" };
        await this.log(j, step, { actor: "engine:task", action: "task.opened", allowed: true, detail: { title: step.task?.title ?? step.name, assignee_roles: step.task?.assignee_roles } });
        return;
      }
      case "subflow": {
        const stub = this.oracle?.subflow?.(j.run, step);
        if (stub !== undefined) return this.succeed(j, step, stub);
        const vars = await this.vars(j);
        const id = templateExprs(step.subflow!.workflow_id).length ? render(step.subflow!.workflow_id, vars) : step.subflow!.workflow_id;
        const child = await this.store.getWorkflow(id);
        if (!child) throw new EngineError(404, `subflow workflow '${id}' is not registered`);
        let depth = 1;
        for (let p = j.run.parent; p; depth++) p = (await this.store.getRun(p.run_id))?.parent;
        if (depth >= this.policy.max_depth) throw new EngineError(422, `child runs are more than ${this.policy.max_depth} levels deep`);
        const { key, items } = this.fanOut(j, step, vars, warn);
        if (!items.length) return this.succeed(j, step, { children: [] });
        // A child run reads this run from the store to find the approvals and checks before this step (guardrails).
        await this.save(j.run);
        const children: string[] = [];
        for (const item of items) {
          const input = { ...j.run.input, ...(isObj(item) ? item : {}), ...(key && item !== undefined ? { [key]: item } : {}) };
          const markets = (key === "market" || key === "locale") && typeof item === "string" ? [item] : j.run.markets;
          const run = await this.start({ client_id: j.run.client_id, workflow_id: id, markets, input, started_by: `run:${j.run.id}`, parent: { run_id: j.run.id, step_id: step.id } });
          children.push(run.id);
        }
        st.status = "waiting";
        st.wait = { kind: "children", children };
        return;
      }
    }
  }

  /** The items of a subflow `per`. A bare name N reads input.<N>s, then the outputs of the steps before it, then the run markets. */
  private fanOut(j: Job, step: Step, vars: Vars, warn: (t: string) => void): { key?: string; items: unknown[] } {
    const per = step.subflow?.per;
    if (!per) return { items: [undefined] };
    if (!/^[a-z_][a-z0-9_]*$/.test(per)) {
      const v = evaluate(per, vars);
      if (v == null) warn(`'per' is null: ${per}`);
      if (v != null && !Array.isArray(v)) throw new ExprError(`'per' must give a list: ${per}`);
      return { key: "item", items: (v as unknown[] | null) ?? [] };
    }
    const sources: unknown[] = [j.run.input, ...[...ancestors(j.g, step.id)].sort((a, b) => j.g.index.get(b)! - j.g.index.get(a)!).map((id) => j.run.steps[id].output)];
    for (const src of sources) {
      const list = isObj(src) ? src[`${per}s`] : undefined;
      if (Array.isArray(list)) return { key: per, items: list };
    }
    if ((per === "market" || per === "locale") && j.run.markets.length) return { key: per, items: j.run.markets };
    warn(`no list '${per}s' found for 'per: ${per}'; started 1 child run`);
    return { items: [undefined] };
  }

  /** A wait, retry or hard timeout came due. */
  private async timeout(j: Job, step: Step): Promise<void> {
    const st = j.run.steps[step.id];
    const kind = st.wait?.kind;
    if (kind === "event" || kind === "timer") {
      st.timed_out = true;
      return this.succeed(j, step, null);
    }
    if (kind === "approval") {
      const a = st.wait?.approval_id ? await this.store.getApproval(st.wait.approval_id) : undefined;
      if (a?.status === "open") await this.store.saveApproval({ ...a, status: "expired", closed_at: this.clock().toISOString() });
      st.wait = undefined;
      // specs/contracts/events.md: the run ends as cancelled only at the hard timeout.
      return this.finish(j, "cancelled", `no decision at gate '${step.id}' before the hard timeout`);
    }
    st.wait = { ...st.wait!, deadline: undefined };
  }

  private async deliver(j: Job, e: EngineEvent): Promise<void> {
    for (const step of j.wf.steps) {
      const st = j.run.steps[step.id];
      if (st.status !== "waiting" || st.wait?.kind !== "event" || st.wait.event !== e.name) continue;
      if (e.client_id !== j.run.client_id) continue;
      if (st.wait.match) {
        const r = test(st.wait.match, await this.vars(j, e));
        if (r.error) st.warnings = [...(st.warnings ?? []), `match failed and counts as false: ${r.error}`];
        if (!r.value) continue;
      }
      st.timed_out = false;
      this.succeed(j, step, e.data);
    }
  }

  private async childEnded(j: Job, stepId: string): Promise<void> {
    const step = j.g.byId.get(stepId);
    const st = j.run.steps[stepId];
    if (!step || st?.status !== "waiting" || st.wait?.kind !== "children") return;
    const runs = await Promise.all((st.wait.children ?? []).map((id) => this.store.getRun(id)));
    // 1 child run that did not succeed fails the step immediately. The run then cancels the other child runs.
    const bad = runs.find((r) => r && ENDED.includes(r.status) && r.status !== "succeeded");
    if (bad) return this.fail(j, step, `child run ${bad.id} (${bad.workflow_id}) ${bad.status}${bad.error ? `: ${bad.error}` : ""}`);
    if (runs.some((r) => !r || !ENDED.includes(r.status))) return;
    this.succeed(j, step, { children: runs.map((r) => ({ run_id: r!.id, workflow_id: r!.workflow_id, status: r!.status, output: r!.output ?? null })) });
  }
}

export { branchTargets };
