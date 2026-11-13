// The step graph of a workflow, and the checks a definition must pass before the engine accepts it.
// This file imports only expr.ts, so the workflow linter can load it without an install step.
//
// How a run moves through the graph (specs/workflow.md §1a):
//   - An edge goes from each step in `needs` to the step, and from a branch to each step it can choose.
//   - A step starts when every edge into it is decided and at least 1 edge is live.
//     A `needs` edge is live when that step succeeded or was skipped. A branch edge is live when the branch chose the step.
//   - A step with no live edge is not taken. A step with no edges starts with the run.
//   - A branch that chooses an earlier step makes a loop. The run goes back, and the steps after that step run again.
import { analyze, durationMs, templateExprs } from "./expr.ts";
import type { Step, Workflow } from "./types.ts";

export interface Edge {
  from: string;
  kind: "needs" | "goto";
}

export interface Graph {
  wf: Workflow;
  byId: Map<string, Step>;
  index: Map<string, number>;
  /** Forward edges into each step. Loop edges are not included. */
  into: Map<string, Edge[]>;
  /** Forward edges out of each step. */
  out: Map<string, string[]>;
  /** For each branch: the targets that are loops (an earlier step that leads to the branch). */
  loops: Map<string, Set<string>>;
}

/** The step ids a branch can choose. 'end' with no step of that id means: choose nothing. */
export function branchTargets(step: Step, byId: Map<string, Step>): string[] {
  const all = [...(step.branch?.cases ?? []).map((c) => c.goto), step.branch?.else].filter((t): t is string => Boolean(t));
  return [...new Set(all)].filter((t) => byId.has(t));
}

export function buildGraph(wf: Workflow): Graph {
  const byId = new Map<string, Step>();
  const index = new Map<string, number>();
  wf.steps.forEach((s, i) => {
    if (!byId.has(s.id)) {
      byId.set(s.id, s);
      index.set(s.id, i);
    }
  });
  const all = new Map<string, string[]>();
  const link = (m: Map<string, string[]>, from: string, to: string) => m.set(from, [...(m.get(from) ?? []), to]);
  for (const s of byId.values()) {
    for (const n of s.needs ?? []) if (byId.has(n)) link(all, n, s.id);
    if (s.type === "branch") for (const t of branchTargets(s, byId)) link(all, s.id, t);
  }
  const reaches = (from: string, to: string): boolean => {
    const seen = new Set<string>([from]);
    const stack = [from];
    while (stack.length) {
      for (const n of all.get(stack.pop()!) ?? []) {
        if (n === to) return true;
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    return false;
  };
  const loops = new Map<string, Set<string>>();
  const into = new Map<string, Edge[]>();
  const out = new Map<string, string[]>();
  for (const s of byId.values()) {
    into.set(s.id, []);
    out.set(s.id, []);
  }
  for (const s of byId.values()) {
    if (s.type !== "branch") continue;
    for (const t of branchTargets(s, byId)) {
      if (t === s.id || (index.get(t)! < index.get(s.id)! && reaches(t, s.id))) {
        loops.set(s.id, (loops.get(s.id) ?? new Set()).add(t));
      } else {
        into.get(t)!.push({ from: s.id, kind: "goto" });
        link(out, s.id, t);
      }
    }
  }
  for (const s of byId.values()) {
    for (const n of new Set(s.needs ?? [])) {
      const from = byId.get(n);
      if (!from) continue;
      // A step that needs a branch and is one of its targets has 1 edge: the branch choice.
      if (from.type === "branch" && branchTargets(from, byId).includes(s.id)) continue;
      into.get(s.id)!.push({ from: n, kind: "needs" });
      link(out, n, s.id);
    }
  }
  return { wf, byId, index, into, out, loops };
}

function walk(start: string, next: (id: string) => string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    for (const n of next(stack.pop()!)) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen;
}

/** Every step that can run after `id` (forward edges only). */
export const descendants = (g: Graph, id: string): Set<string> => walk(id, (x) => g.out.get(x) ?? []);
/** Every step that can run before `id` (forward edges only). */
export const ancestors = (g: Graph, id: string): Set<string> => walk(id, (x) => (g.into.get(x) ?? []).map((e) => e.from));

export interface Problem {
  level: "error" | "warn";
  rule: string;
  step?: string;
  message: string;
}

/** Approval kinds that `skip_if` can skip (specs/approval-inbox.md §4). */
export const SKIPPABLE_KINDS = ["copy", "creative", "content", "template", "data_change"];

export interface ExprSite {
  step: string;
  field: string;
  expr: string;
}

/** Every expression in a workflow, with the step and the field that holds it. */
export function expressionSites(wf: Workflow): ExprSite[] {
  const sites: ExprSite[] = [];
  for (const s of wf.steps) {
    const add = (field: string, expr: string | undefined) => expr && sites.push({ step: s.id, field, expr });
    add("gate.skip_if", s.gate?.skip_if);
    add("wait.match", s.wait?.match);
    for (const c of s.branch?.cases ?? []) add("branch.if", c.if);
    for (const [field, text] of [
      ["wait.timeout", s.wait?.timeout],
      ["wait.event", s.wait?.event],
      ["subflow.workflow_id", s.subflow?.workflow_id],
      ["emit.event", s.emit?.event],
    ] as const)
      if (typeof text === "string") for (const e of templateExprs(text)) add(field, e);
    if (s.subflow?.per && !/^[a-z_][a-z0-9_]*$/.test(s.subflow.per)) add("subflow.per", s.subflow.per);
  }
  return sites;
}

/**
 * Checks a definition: structure, expressions and the guardrails that can be proved without a run (G2, G6, G9).
 * `POST /workflows` rejects a definition that has an error (HTTP 422).
 */
export function checkDefinition(wf: Workflow): Problem[] {
  const out: Problem[] = [];
  const err = (rule: string, step: string | undefined, message: string) => out.push({ level: "error", rule, step, message });
  const warn = (rule: string, step: string | undefined, message: string) => out.push({ level: "warn", rule, step, message });
  if (!wf || typeof wf.id !== "string" || !Array.isArray(wf.steps) || !wf.steps.length) {
    err("shape", undefined, "a workflow needs an id and at least 1 step");
    return out;
  }
  const ids = new Set<string>();
  for (const s of wf.steps) {
    if (ids.has(s.id)) err("step-id", s.id, `step id '${s.id}' is used 2 times`);
    ids.add(s.id);
  }
  const g = buildGraph(wf);
  for (const s of wf.steps) {
    const body = (s as unknown as Record<string, unknown>)[s.type];
    if (!body && s.type !== "wait") err("step-body", s.id, `step '${s.id}' has type '${s.type}' but no '${s.type}' block`);
    for (const n of s.needs ?? []) {
      if (!ids.has(n)) err("needs", s.id, `step '${s.id}' needs unknown step '${n}'`);
      const from = g.byId.get(n);
      if (from?.type === "branch" && !branchTargets(from, g.byId).includes(s.id))
        err("needs-branch", s.id, `step '${s.id}' needs branch '${n}' but the branch cannot choose it; a step after a branch must be 1 of its targets`);
    }
    if (s.type === "branch") {
      for (const t of [...(s.branch?.cases ?? []).map((c) => c.goto), s.branch?.else])
        if (t && t !== "end" && !ids.has(t)) err("branch", s.id, `step '${s.id}' goes to unknown step '${t}'`);
      for (const c of s.branch?.cases ?? []) if (!c.if || !c.goto) err("branch", s.id, `step '${s.id}' has a case with no 'if' or no 'goto'`);
    }
    if (s.type === "gate" && s.gate) {
      if (!s.gate.required_roles?.length) err("gate-roles", s.id, `step '${s.id}' has no required_roles`);
      if (s.gate.on_changes && !ids.has(s.gate.on_changes)) err("on-changes", s.id, `step '${s.id}' returns to unknown step '${s.gate.on_changes}'`);
      if (s.gate.on_changes && ids.has(s.gate.on_changes) && !ancestors(g, s.id).has(s.gate.on_changes))
        err("on-changes", s.id, `step '${s.id}' returns to '${s.gate.on_changes}', which does not run before it`);
      if (s.gate.on_reject === "goto" && !s.gate.on_changes) err("on-reject", s.id, `step '${s.id}' has on_reject 'goto' but no on_changes step`);
      if (s.gate.skip_if && !SKIPPABLE_KINDS.includes(s.gate.approval_kind))
        err(s.gate.approval_kind === "go_live" ? "G9" : "skip", s.id, `step '${s.id}' has skip_if, but a '${s.gate.approval_kind}' gate can never be skipped`);
    }
    if (s.type === "wait") {
      if (!s.wait?.event && !s.wait?.timeout) err("wait", s.id, `step '${s.id}' waits for no event and no time`);
      const t = s.wait?.timeout;
      if (t && !templateExprs(t).length && durationMs(t) === null) err("timeout", s.id, `step '${s.id}' has timeout '${t}'; use 90m, 48h, 5d, 2w or \${expression}`);
      if (s.wait?.match && !s.wait.event) err("wait", s.id, `step '${s.id}' has a match but no event`);
    }
    // A check, wait or branch decides something for a later step, so nothing after it is a defect.
    // A gate or task can be the correct end of a run (a person takes over). It is a warning only when
    // the step is on 1 side of a branch, where a run that stops can be a missed join.
    const last = !(g.out.get(s.id) ?? []).length && !g.loops.get(s.id)?.size;
    const side = [...ancestors(g, s.id)].some((id) => g.byId.get(id)!.type === "branch");
    if (last && (["check", "wait", "branch"].includes(s.type) || (["gate", "task"].includes(s.type) && side)))
      warn("dead-end", s.id, `nothing runs after ${s.type} step '${s.id}'`);
    if (s.type === "tool" && s.tool) {
      const up = [...ancestors(g, s.id)].map((id) => g.byId.get(id)!);
      const kinds = new Set(up.filter((u) => u.type === "gate").map((u) => u.gate?.approval_kind));
      const compliance = up.some((u) => u.type === "check" && u.check?.kinds?.includes("compliance"));
      if (!s.tool.risk) err("tool-risk", s.id, `step '${s.id}' has no risk level`);
      if (s.tool.risk === "sign" && !kinds.has("contract")) err("G2", s.id, `step '${s.id}' signs with no contract gate before it`);
      if (s.tool.risk === "pay" && !kinds.has("payout")) err("G2", s.id, `step '${s.id}' pays with no payout gate before it`);
      if ((s.tool.risk === "send" || s.tool.risk === "write_external") && !compliance)
        err("G6", s.id, `step '${s.id}' has risk '${s.tool.risk}' with no compliance check before it`);
    }
  }
  // A cycle in the forward edges makes steps that can never start.
  const state = new Map<string, number>();
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      err("cycle", id, `steps depend on each other: ${[...path.slice(path.indexOf(id)), id].join(" -> ")}`);
      return;
    }
    state.set(id, 1);
    for (const n of g.out.get(id) ?? []) visit(n, [...path, id]);
    state.set(id, 2);
  };
  for (const s of wf.steps) visit(s.id, []);

  for (const site of expressionSites(wf)) {
    const a = analyze(site.expr);
    const where = `step '${site.step}' ${site.field}`;
    for (const p of a.problems) err("expression", site.step, `${where}: ${p} in: ${site.expr}`);
    const before = ancestors(g, site.step);
    for (const ref of a.steps) {
      if (!ids.has(ref)) err("expression", site.step, `${where} reads steps.${ref}, but no step has that id`);
      else if (ref !== site.step && !before.has(ref) && !descendants(g, site.step).has(ref))
        warn("expression", site.step, `${where} reads steps.${ref}, which does not run before '${site.step}'`);
    }
  }
  return out;
}
