import { describe, expect, it } from "vitest";
import { checkDefinition } from "../src/graph.ts";
import { simulateWorkflow } from "../src/simulate.ts";
import type { Step } from "../src/types.ts";
import { wf } from "./helpers.ts";

const agent = (id: string, needs?: string[]): Step => ({ id, type: "agent", needs, agent: { prompt_ref: `t/${id}@1` } });
const gate = (id: string, needs: string[], g: Record<string, unknown>): Step => ({ id, type: "gate", needs, gate: { approval_kind: "plan", required_roles: ["account_lead"], sla_hours: 24, ...g } });
const check = (id: string, needs?: string[]): Step => ({ id, type: "check", needs, check: { kinds: ["compliance"] } });
const tool = (id: string, needs: string[], risk: "pay" | "send"): Step => ({ id, type: "tool", needs, tool: { name: "esp", action: "x", risk } });
const branch = (id: string, needs: string[], cases: { if: string; goto: string }[], other: string): Step => ({ id, type: "branch", needs, branch: { cases, else: other } });

describe("simulator", () => {
  it("tries each side of a branch, a skipped gate, a changes request and a wait that times out", async () => {
    const w = wf("a.sim", [
      agent("draft"),
      check("c", ["draft"]),
      gate("ok", ["c"], { approval_kind: "copy", required_roles: ["client_approver"], skip_if: "input.auto == true", on_changes: "draft" }),
      branch("route", ["ok"], [{ if: "input.fast == true", goto: "fast" }], "slow"),
      agent("fast", ["route"]),
      { id: "slow", type: "wait", needs: ["route"], wait: { event: "x/y", timeout: "1h" } },
    ]);
    const r = await simulateWorkflow(w);
    expect(r).toMatchObject({ capped: false, failures: [], never_ran: [] });
    // The gate has 4 outcomes: skipped; approved; changes, then skipped; changes, then approved.
    // The branch has 3: fast; slow with the event; slow with a timeout.
    expect(r.paths).toBe(12);
  });

  it("reports a guardrail block, the path that leads to it, and the steps that never run", async () => {
    const w = wf("a.bad", [
      check("c"),
      branch("paid", ["c"], [{ if: "input.paid == true", goto: "approve" }], "pay"),
      gate("approve", ["paid"], { approval_kind: "payout", required_roles: ["client_finance"] }),
      tool("pay", ["paid", "approve"], "pay"),
      agent("after", ["pay"]),
    ]);
    const r = await simulateWorkflow(w);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0]).toMatchObject({ path: ["branch paid=pay"], status: "failed", error: expect.stringMatching(/guardrail G2/) });
    expect((await simulateWorkflow(w, { impossible: [{ when: ["branch paid=pay"], reason: "test" }] })).failures).toHaveLength(0);
    const never = wf("a.never", [agent("a"), branch("b", ["a"], [], "end"), agent("lost", ["b"])]);
    expect(checkDefinition(never).filter((p) => p.level === "error").map((p) => p.rule)).toEqual(["needs-branch"]);
  });

  it("uses random paths after the limit, and gives the same result each time", async () => {
    const steps: Step[] = [agent("s")];
    for (let i = 0; i < 6; i++) steps.push(branch(`b${i}`, [i ? `j${i - 1}` : "s"], [{ if: "input.x == true", goto: `x${i}` }], `j${i}`), agent(`x${i}`, [`b${i}`]), agent(`j${i}`, [`b${i}`, `x${i}`]));
    const a = await simulateWorkflow(wf("a.wide", steps), { max_paths: 10 });
    expect(a).toMatchObject({ capped: true, paths: 20, never_ran: [], failures: [] });
    expect(await simulateWorkflow(wf("a.wide", steps), { max_paths: 10 })).toEqual(a);
    expect((await simulateWorkflow(wf("a.wide", steps))).paths).toBe(64);
  });
});
