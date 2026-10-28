import type { ResolvedRules } from "./market-rules.js";

export type InboundIntent = "opt_out" | "help" | "opt_in" | "other";

/**
 * Text of the "Stop promotions" quick-reply button on WhatsApp marketing templates, per template language.
 * A tap returns the button text as the payload, so every language must be listed here.
 */
export const STOP_BUTTON_TEXTS: Record<string, string> = {
  en: "Stop promotions",
  ar: "إيقاف العروض",
};

const normalise = (text: string) =>
  text
    .normalize("NFC")
    .trim()
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "")
    .replace(/\s+/g, " ")
    .toLocaleUpperCase();

const inList = (text: string, words: string[]) => words.some((w) => normalise(w) === text);

/**
 * Keyword step of the two-way chat workflow. Matches the whole message only, with no LLM.
 * Other wordings ("please stop texting me") go to the chat agent, which calls the opt-out tool.
 * Opt-out wins over every other match.
 */
export function classifyInbound(text: string, rules: ResolvedRules, buttonPayload?: string): InboundIntent {
  if (buttonPayload && Object.values(STOP_BUTTON_TEXTS).includes(buttonPayload.trim())) return "opt_out";
  const t = normalise(text);
  if (!t) return "other";
  if (inList(t, rules.optout_keywords)) return "opt_out";
  if (inList(t, rules.help_keywords)) return "help";
  if (inList(t, rules.optin_keywords)) return "opt_in";
  return "other";
}

export const isOptOut = (text: string, rules: ResolvedRules, buttonPayload?: string) =>
  classifyInbound(text, rules, buttonPayload) === "opt_out";
