// The run simulator. It runs 1 workflow on the real runner with a memory store and handlers that do no work,
// and it tries every outcome of every decision point:
//   - each target of a branch (a loop target 1 time for each path),
//   - a skipped and a not skipped gate (only when the gate has skip_if and a kind that can be skipped),
//   - an approved gate, and "changes requested" 1 time for each gate that has on_changes,
//   - a wait that gets its event, and a wait that times out.
// A path is 1 run with 1 list of choices. The simulator reports each path that fails, each step that
// never runs and each step that only a guardrail exception (the spend policy) lets through.
import { buildGraph, SKIPPABLE_KINDS } from "./graph.ts";
import { MemoryStore } from "./memory-store.ts";
import { mockHandlers } from "./mock.ts";
import { Engine } from "./runner.ts";
import type { Actor, RunState, Workflow } from "./types.ts";

export interface SimOptions {
  /**
   * The limit for the ordered search of 1 workflow. Default 250. When the search stops at the limit,
   * the simulator runs the same number of random paths, because the ordered search changes only the last choices.
   */
  max_paths?: number;
  input?: Record<string, unknown>;
  markets?: string[];
  /** Outputs of agent and tool steps, by step id. Use them when a later step needs a value (an event name, a duration). */
  outputs?: Record<string, unknown>;
  /** Paths that the data makes impossible. A failure on a path that has every label of `when` is not reported. */
  impossible?: { when: string[]; reason: string }[];
}

/** Fixtures for the simulator, by workflow id (engine/runtime/simulate.config.json). */
export type SimConfig = Record<string, Pick<SimOptions, "input" | "markets" | "outputs" | "impossible">>;

export interface SimFailure {
  /** The choices of the path, in order. For example "branch route=sms", "gate approve=changes_requested". */
  path: string[];
  status: string;
  error: string;
}

export interface SimResult {
  workflow_id: string;
  paths: number;
  /** True when the simulator stopped at max_paths. Then "never_ran" is not complete. */
  capped: boolean;
  /** Failures that were not reported because the path is in `impossible`. */
  excluded: number;
  failures: SimFailure[];
  /** Steps that did not succeed and were not skipped in any path. */
  never_ran: string[];
  /** Spend steps that no approved budget gate covers on some path. The client's spend policy must allow them. */
  spend_policy_steps: string[];
  /** Warnings the runner put on a step (for example an expression that failed). */
  warnings: string[];
}

interface Choice {
  label: string;
  options: number;
  taken: number;
}

const CLIENT = "00000000-0000-4000-8000-000000000001";
const ENDED = ["succeeded", "failed", "cancelled"];

/** Runs 1 path. `prefix` gives the choices to take first; after it, each choice is option 0. */
async function runPath(wf: Workflow, prefix: number[], opts: SimOptions, random?: () => number) {
  const g = buildGraph(wf);
  const trace: Choice[] = [];
  const used = new Set<string>();
  const choose = (label: string, names: string[]): number => {
    const i = trace.length;
    const taken = i < prefix.length ? Math.min(prefix[i], names.length - 1) : random ? Math.floor(random() * names.length) : 0;
    trace.push({ label: `${label}=${names[taken]}`, options: names.length, taken });
    return taken;
  };
  let now = Date.parse("2026-01-05T09:00:00Z");
  let n = 0;
  const spend = new Set<string>();
  const store = new MemoryStore();
  const handlers = mockHandlers({
    outputs: opts.outputs,
    spendPolicy: async (ctx) => {
      spend.add(ctx.step.id);
      return { allowed: true };
    },
  });
  const engine = new Engine({
    store,
    handlers,
    clock: () => new Date(now),
    newId: () => `sim-${++n}`,
    policy: { backoff_ms: 1000 },
    oracle: {
      branch: (_run, step, targets) => {
        const loops = g.loops.get(step.id) ?? new Set<string>();
        // A loop target is an option only 1 time for each path. This keeps each path finite.
        let options = targets.filter((t) => !(t && loops.has(t) && used.has(`${step.id}>${t}`)));
        if (!options.length) options = targets;
        if (options.length === 1) return options[0];
        const pick = options[choose(`branch ${step.id}`, options.map((t) => t ?? "(nothing)"))];
        if (pick && loops.has(pick)) used.add(`${step.id}>${pick}`);
        return pick;
      },
      skip: (_run, step) => {
        if (!step.gate?.skip_if || !SKIPPABLE_KINDS.includes(step.gate.approval_kind)) return undefined;
        return choose(`gate ${step.id}`, ["not_skipped", "skipped"]) === 1;
      },
      subflow: () => ({ children: [], simulated: true }),
    },
  });
  await store.putWorkflow(wf);
  const started = await engine.start({ client_id: CLIENT, workflow_id: wf.id, version: wf.version, input: opts.input ?? {}, markets: opts.markets ?? ["GB"] });
  await engine.settle();
  let run: RunState = (await store.getRun(started.id))!;
  let stuck: string | undefined;
  for (let turn = 0; !ENDED.includes(run.status); turn++) {
    if (turn > 400) {
      stuck = "the run did not end after 400 decisions";
      break;
    }
    const waiting = wf.steps.find((s) => ["waiting", "retry"].includes(run.steps[s.id].status));
    if (!waiting) {
      stuck = `the run is ${run.status} but no step waits`;
      break;
    }
    const st = run.steps[waiting.id];
    const kind = st.wait?.kind;
    if (kind === "approval") {
      const a = (await store.getApproval(st.wait!.approval_id!))!;
      const person: Actor = { kind: "user", id: `sim-user-${a.decisions.length + 1}`, roles: a.required_roles };
      const key = `changes>${waiting.id}`;
      const canAsk = Boolean(waiting.gate?.on_changes) && !used.has(key) && a.decisions.length === 0;
      const decision = canAsk && choose(`gate ${waiting.id}`, ["approved", "changes_requested"]) === 1 ? "changes_requested" : "approved";
      if (decision === "changes_requested") used.add(key);
      await engine.decide(a.id, person, { decision });
    } else if (kind === "task") {
      await engine.completeTask(run.id, waiting.id, {}, { kind: "user", id: "sim-user-1", roles: waiting.task?.assignee_roles ?? [] });
    } else if (kind === "event") {
      const names = st.wait?.deadline ? ["event", "timeout"] : ["event"];
      const pick = names.length > 1 ? names[choose(`wait ${waiting.id}`, names)] : "event";
      if (pick === "event") await engine.resolveWait(run.id, waiting.id, {}, { kind: "service", id: "simulator", roles: [] });
      else {
        now = Math.max(now, Date.parse(st.wait!.deadline!));
        await engine.tick();
      }
    } else if ((kind === "timer" || kind === "retry") && st.wait?.deadline) {
      now = Math.max(now, Date.parse(st.wait.deadline));
      await engine.tick();
    } else {
      stuck = `step '${waiting.id}' waits for '${kind}' and the simulator cannot end that wait`;
      break;
    }
    await engine.settle();
    run = (await store.getRun(started.id))!;
  }
  for (const e of engine.internalErrors) stuck = `engine error: ${e.message}`;
  return { run, trace, stuck, spend };
}

/** Tries every path of 1 workflow. The definition must pass checkDefinition first. */
export async function simulateWorkflow(wf: Workflow, opts: SimOptions = {}): Promise<SimResult> {
  const max = opts.max_paths ?? 250;
  const result: SimResult = { workflow_id: wf.id, paths: 0, capped: false, excluded: 0, failures: [], never_ran: [], spend_policy_steps: [], warnings: [] };
  const ran = new Set<string>();
  const spend = new Set<string>();
  const warnings = new Set<string>();
  const seenErrors = new Set<string>();
  // A random number source with a fixed start, so that 2 runs of the simulator try the same paths.
  let seed = [...wf.id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let prefix: number[] | undefined = [];
  while (prefix) {
    if (result.paths >= max * (result.capped ? 2 : 1)) {
      if (result.capped) break;
      result.capped = true;
    }
    const { run, trace, stuck, spend: s } = await runPath(wf, result.capped ? [] : prefix, opts, result.capped ? random : undefined);
    result.paths++;
    for (const id of s) spend.add(id);
    for (const [id, st] of Object.entries(run.steps)) {
      if (st.status === "succeeded" || st.status === "skipped" || st.runs > 0) ran.add(id);
      for (const w of st.warnings ?? []) warnings.add(`step '${id}': ${w}`);
    }
    if (stuck || run.status !== "succeeded") {
      const error = stuck ?? run.error ?? `the run ended as ${run.status}`;
      const labels = trace.map((c) => c.label);
      if ((opts.impossible ?? []).some((x) => x.when.every((l) => labels.includes(l)))) result.excluded++;
      // The same error on many paths is 1 defect. Keep the first path.
      else if (!seenErrors.has(error)) {
        seenErrors.add(error);
        result.failures.push({ path: labels, status: run.status, error });
      }
    }
    if (result.capped) continue;
    // The next path: change the last choice that has an option left.
    let i = trace.length - 1;
    while (i >= 0 && trace[i].taken + 1 >= trace[i].options) i--;
    prefix = i < 0 ? undefined : [...trace.slice(0, i).map((c) => c.taken), trace[i].taken + 1];
  }
  result.never_ran = wf.steps.map((s) => s.id).filter((id) => !ran.has(id));
  result.spend_policy_steps = [...spend];
  result.warnings = [...warnings];
  return result;
}
