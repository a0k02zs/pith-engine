import { loadPreamble, loadPrompt } from "./registry.js";
import type { ResolvedRules } from "./market-rules.js";

export interface BrainLike {
  client_id: string;
  organization?: { name?: string };
  [key: string]: unknown;
}

/**
 * System prompt for one agent step: shared preamble with the brain and market rules, then the agent task.
 * vars fills other {name} slots in the task, for example {channel} in the chat agent.
 */
export function buildSystemPrompt(
  ref: string,
  brain: BrainLike,
  rules: ResolvedRules | ResolvedRules[],
  vars: Record<string, string> = {},
): { model: string; system: string } {
  const prompt = loadPrompt(ref);
  const name = brain.organization?.name ?? brain.client_id;
  const preamble = loadPreamble()
    .replaceAll("{brain.client_name}", name)
    .replace("{brain}", () => JSON.stringify(brain))
    .replace("{market_rules}", () => JSON.stringify(rules));
  let task = prompt.task.replaceAll("{brain.client_name}", name);
  for (const [k, v] of Object.entries(vars)) task = task.replaceAll(`{${k}}`, v);
  return { model: prompt.model, system: `${preamble}\n\n${task}` };
}
