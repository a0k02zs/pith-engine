// Handlers that do no real work. For tests, the simulator and local development.
// A real deployment connects Claude (agent), the provider adapters (tool) and the compliance service (check).
import type { CheckResult, Handlers, StepContext } from "./types.ts";

export interface MockOptions {
  /** Output for an agent or tool step, by step id. A function gets the step context. */
  outputs?: Record<string, unknown | ((ctx: StepContext) => unknown)>;
  check?: (ctx: StepContext) => CheckResult;
  spendPolicy?: Handlers["spendPolicy"];
  /** Called for each agent and tool call. Throw here to test a failure. */
  onCall?: (ctx: StepContext) => void;
}

export function mockHandlers(opts: MockOptions = {}): Handlers & { calls: string[] } {
  const calls: string[] = [];
  const out = (ctx: StepContext) => {
    calls.push(ctx.step.id);
    opts.onCall?.(ctx);
    const o = opts.outputs?.[ctx.step.id];
    return typeof o === "function" ? (o as (c: StepContext) => unknown)(ctx) : (o ?? {});
  };
  return {
    calls,
    agent: async (ctx) => ({ output: out(ctx), model: "mock", input_tokens: 0, output_tokens: 0, cost_usd: 0 }),
    tool: async (ctx) => out(ctx),
    check: async (ctx) => {
      calls.push(ctx.step.id);
      return opts.check?.(ctx) ?? { outcome: "pass", brand_score: 90 };
    },
    spendPolicy: opts.spendPolicy,
  };
}
