import type { Channel, ResolvedRules } from "./market-rules.js";
import type { Purpose } from "./window.js";

export interface SentMessage {
  channel: Channel;
  purpose: Purpose;
  sent_at: Date;
  /** Topic of a marketing message, for the US state "same topic" limits. */
  topic?: string;
}

export interface CapRule {
  max: number;
  days: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Pith marketing caps per contact and channel (playbook section 5). Utility messages do not count. */
export const MARKETING_CAPS: Record<Channel, CapRule[]> = {
  sms: [{ max: 1, days: 1 }, { max: 4, days: 30 }],
  whatsapp: [{ max: 1, days: 1 }, { max: 4, days: 30 }],
  push: [{ max: 1, days: 1 }, { max: 5, days: 7 }],
};

export type CapResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Check the frequency caps for 1 more message to a contact. Windows are rolling and end at `at`.
 * Utility messages are never capped, but they must stay utility (no offer).
 */
export function checkCaps(
  history: SentMessage[],
  next: { channel: Channel; purpose: Purpose; topic?: string },
  at: Date,
  rules?: ResolvedRules,
): CapResult {
  if (next.purpose === "utility") return { allowed: true };
  const marketing = history.filter((m) => m.purpose === "marketing" && m.sent_at.getTime() <= at.getTime());
  const since = (days: number) => at.getTime() - days * DAY_MS;

  for (const cap of MARKETING_CAPS[next.channel]) {
    const n = marketing.filter((m) => m.channel === next.channel && m.sent_at.getTime() > since(cap.days)).length;
    if (n >= cap.max) return { allowed: false, reason: `${next.channel} cap ${cap.max} per ${cap.days} day(s) reached` };
  }

  const stateMax = rules?.max_per_24h_same_topic;
  if (stateMax !== undefined && next.topic) {
    const n = marketing.filter((m) => m.topic === next.topic && m.sent_at.getTime() > since(1)).length;
    if (n >= stateMax) return { allowed: false, reason: `${rules!.subdivision} limit ${stateMax} per 24 h on 1 topic reached` };
  }
  return { allowed: true };
}
