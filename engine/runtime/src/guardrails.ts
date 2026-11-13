// Guardrails that the runner checks before a tool call (specs/workflow.md §5).
// G1 spend, G2 sign and pay, G5 recipients, G6 compliance. G10: a removal is never blocked.
// The proof can be in the run itself or in a parent run that started this run as a subflow.
import { ancestors, buildGraph, type Graph } from "./graph.ts";
import type { Handlers, RunState, Step, StepContext, Store } from "./types.ts";

export interface Block {
  rule: "G1" | "G2" | "G5" | "G6";
  reason: string;
}

interface Evidence {
  /** Kinds of the gates that a person approved before the step. A skipped gate does not count. */
  approved: Set<string>;
  compliance: boolean;
  resolved: boolean;
}

/** What the steps before `stepId` prove, in this run and in its parent runs. */
export async function evidence(run: RunState, g: Graph, stepId: string, store: Store, depth = 0): Promise<Evidence> {
  const ev: Evidence = { approved: new Set(), compliance: false, resolved: false };
  for (const id of ancestors(g, stepId)) {
    const step = g.byId.get(id)!;
    const st = run.steps[id];
    if (st?.status !== "succeeded") continue;
    if (step.type === "gate" && (st.output as { decision?: string } | undefined)?.decision === "approved") ev.approved.add(step.gate!.approval_kind);
    if (step.type === "check" && step.check?.kinds?.includes("compliance")) ev.compliance = true;
    if (step.type === "tool" && step.tool?.name === "engine" && step.tool.action === "audiences.resolve") ev.resolved = true;
  }
  if (run.parent && depth < 8) {
    const parent = await store.getRun(run.parent.run_id);
    const wf = parent && (await store.getWorkflow(parent.workflow_id, parent.workflow_version));
    if (parent && wf) {
      const up = await evidence(parent, buildGraph(wf), run.parent.step_id, store, depth + 1);
      for (const k of up.approved) ev.approved.add(k);
      ev.compliance ||= up.compliance;
      ev.resolved ||= up.resolved;
    }
  }
  return ev;
}

/** Returns the guardrail that stops this tool call, or null when the call is allowed. */
export async function checkTool(run: RunState, g: Graph, step: Step, ctx: StepContext, store: Store, handlers: Handlers): Promise<Block | null> {
  const risk = step.tool?.risk;
  if (!risk || risk === "read" || risk === "write_internal" || risk === "remove") return null;
  const ev = await evidence(run, g, step.id, store);
  if (risk === "spend") {
    if (ev.approved.has("budget") || ev.approved.has("budget_change")) return null;
    const policy = handlers.spendPolicy ? await handlers.spendPolicy(ctx) : { allowed: false, reason: "no spend policy check is connected" };
    if (policy.allowed) return null;
    return { rule: "G1", reason: `no person approved a budget or budget_change gate, and the spend is not inside the spend policy (${policy.reason ?? "refused"})` };
  }
  if (risk === "sign") return ev.approved.has("contract") ? null : { rule: "G2", reason: "no person approved a contract gate before this signature" };
  if (risk === "pay") return ev.approved.has("payout") ? null : { rule: "G2", reason: "no person approved a payout gate before this payment" };
  if (risk === "send" && !ev.resolved) return { rule: "G5", reason: "the recipients did not come from audiences.resolve" };
  if (!ev.compliance) return { rule: "G6", reason: `no compliance check passed before this ${risk === "send" ? "send" : "publish"} step` };
  return null;
}
