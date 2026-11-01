// "Improve with Claude" for client strategies. Server only: main.ts registers it when
// ANTHROPIC_API_KEY is set, so the browser preview never loads the SDK or sees a key.
import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "./store.js";
import type { StrategyImprover } from "./strategy.js";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "quick_wins", "risks", "play_notes"],
  properties: {
    summary: { type: "string", description: "2-3 sentences: the sharpest version of this client's strategy." },
    quick_wins: { type: "array", items: { type: "string" }, description: "3-5 actions for the first 14 days." },
    risks: { type: "array", items: { type: "string" }, description: "Up to 4 risks the plan does not name yet." },
    play_notes: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["service", "note"],
        properties: { service: { type: "string" }, note: { type: "string" } },
      },
      description: "One specific, practical note per service code in the plan.",
    },
  },
} as const;

const SYSTEM = `You are a senior strategist at Pith, a marketing agency that runs 18 services for clients in the UK, Singapore, North America, the GCC and the EU.
You improve a 90-day plan that Pith's playbooks produced. Keep the plan's services, markets and budget. Be specific to this client, its audience and its markets.
Respect the market rules you are given (consent, ad labels, AI labels, influencer licences). Never invent statistics, studies or customer names.
Write in plain, short sentences.`;

export function claudeImprover(apiKey: string, model = "claude-opus-5-5"): StrategyImprover {
  const client = new Anthropic({ apiKey });
  return async ({ client: c, brain, strategy }) => {
    const input = {
      client: { name: c.name, model: c.model, industry: c.industry, markets: c.markets, currency: c.currency },
      brain,
      plan: { summary: strategy.summary, objectives: strategy.objectives, plays: strategy.plays.map((p) => ({ service: p.service, why: p.why, budget: p.budget, pipelines: p.pipelines.map((x) => x.id) })), markets: strategy.markets, risks: strategy.risks },
    };
    // Typings can lag the beta fields (fallbacks, output_config.format), so the params are built untyped.
    const params: Record<string, unknown> = {
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: `Improve this plan. Data:\n${JSON.stringify(input)}` }],
    };
    let res: Anthropic.Beta.BetaMessage;
    try {
      res = (await client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming)) as Anthropic.Beta.BetaMessage;
    } catch (e) {
      if (e instanceof Anthropic.APIError) throw new ApiError(502, `Claude API error ${e.status ?? ""}`.trim());
      throw e;
    }
    if (res.stop_reason === "refusal") throw new ApiError(422, "Claude declined this request. The playbook plan is unchanged.");
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let out: { summary: string; quick_wins: string[]; risks: string[]; play_notes: Array<{ service: string; note: string }> };
    try {
      out = JSON.parse(text);
    } catch {
      throw new ApiError(502, "Claude returned an answer the app could not read. Try again.");
    }
    return {
      summary: out.summary,
      quick_wins: out.quick_wins.slice(0, 5),
      risks: out.risks.slice(0, 4),
      play_notes: Object.fromEntries(out.play_notes.map((n) => [n.service, n.note])),
    };
  };
}
