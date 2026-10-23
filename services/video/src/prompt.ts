import { loadPreamble, loadPrompt } from "./registry.js";
import { marketRules, type MarketRules } from "./market-rules.js";

export interface BrainLike {
  client_id: string;
  organization?: { name?: string };
  [key: string]: unknown;
}

/** System prompt for one agent step: shared preamble with the brain and the rules of every job market, then the agent task. */
export function buildSystemPrompt(ref: string, brain: BrainLike, markets: string[]): { model: string; system: string } {
  const prompt = loadPrompt(ref);
  const rules: Record<string, MarketRules> = Object.fromEntries(markets.map((m) => [m, marketRules(m)]));
  const system = loadPreamble()
    .replace("{brain.client_name}", brain.organization?.name ?? brain.client_id)
    .replace("{brain}", JSON.stringify(brain))
    .replace("{market_rules}", JSON.stringify(rules));
  return { model: prompt.model, system: `${system}\n\n${prompt.task}` };
}
