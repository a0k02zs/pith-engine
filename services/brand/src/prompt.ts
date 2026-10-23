import { loadPreamble, loadPrompt } from "./registry.js";

export interface PromptContext {
  clientName: string;
  markets: string[];
  b2bOrB2c: "b2b" | "b2c" | "both";
  package: "A" | "B" | "C";
}

/** System prompt for one agent step: shared preamble with the client context, then the agent task. */
export function buildSystemPrompt(ref: string, ctx: PromptContext): { model: string; system: string } {
  const prompt = loadPrompt(ref);
  const system = loadPreamble()
    .replace("{{client.name}}", ctx.clientName)
    .replace("{{markets}}", ctx.markets.join(", "))
    .replace("{{b2b_or_b2c}}", ctx.b2bOrB2c)
    .replace("{{package}}", ctx.package);
  return { model: prompt.model, system: `${system}\n\n${prompt.task}` };
}
