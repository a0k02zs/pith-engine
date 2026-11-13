import { MemoryStore } from "../src/memory-store.ts";
import { mockHandlers, type MockOptions } from "../src/mock.ts";
import { Engine, type Oracle, type Policy } from "../src/runner.ts";
import type { Actor, Step, Workflow } from "../src/types.ts";

export const CLIENT = "11111111-1111-4111-8111-111111111111";

export function wf(id: string, steps: Step[], extra: Partial<Workflow> = {}): Workflow {
  return { id, version: 1, service: id.split(".")[0], trigger: { manual: true }, steps, ...extra };
}

export const user = (id: string, ...roles: string[]): Actor => ({ kind: "user", id, roles });
export const service: Actor = { kind: "service", id: "svc", roles: ["client_approver", "account_lead"] };

/** An engine on a memory store, with a clock the test moves. */
export async function setup(workflows: Workflow[], mock: MockOptions = {}, opts: { policy?: Partial<Policy>; oracle?: Oracle } = {}) {
  let now = Date.parse("2026-11-12T09:00:00Z");
  let n = 0;
  const store = new MemoryStore();
  const handlers = mockHandlers(mock);
  const engine = new Engine({
    store, handlers, clock: () => new Date(now), newId: () => `id-${++n}`, oracle: opts.oracle,
    policy: { backoff_ms: 1000, ...opts.policy },
  });
  for (const w of workflows) await engine.registerWorkflow(w);
  return {
    engine, store, handlers,
    /** Moves the clock and runs tick. */
    advance: async (ms: number) => {
      now += ms;
      await engine.tick();
    },
    run: async (workflow_id: string, input: Record<string, unknown> = {}, markets: string[] = []) => {
      const r = await engine.start({ client_id: CLIENT, workflow_id, input, markets });
      await engine.settle();
      return r.id;
    },
    get: async (id: string) => (await store.getRun(id))!,
    status: async (id: string) => {
      const r = (await store.getRun(id))!;
      return Object.fromEntries(Object.entries(r.steps).map(([k, s]) => [k, s.status]));
    },
    open: async (runId: string) => (await store.listApprovals({ run_id: runId, status: "open" }))[0],
  };
}
