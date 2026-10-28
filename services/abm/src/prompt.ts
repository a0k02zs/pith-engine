import { loadPreamble, loadPrompt } from "./registry.js";
import type { MarketRule } from "./markets.js";

export interface BrainLike {
  client_id: string;
  organization?: { name?: string };
  [key: string]: unknown;
}

/** System prompt for 1 agent step: shared preamble with the brain and market rules, then the agent task. */
export function buildSystemPrompt(ref: string, brain: BrainLike, rules: MarketRule): { model: string; system: string } {
  const prompt = loadPrompt(ref);
  const system = loadPreamble()
    .replace("{brain.client_name}", brain.organization?.name ?? brain.client_id)
    .replace("{brain}", JSON.stringify(brain))
    .replace("{market_rules}", JSON.stringify(rules));
  return { model: prompt.model, system: `${system}\n\n${prompt.task}` };
}
