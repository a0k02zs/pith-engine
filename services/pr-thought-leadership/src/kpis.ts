/** KPI maths from docs/05-approvals-and-kpis.md §3. Ratios return null when the denominator is 0. */

const ratio = (num: number, den: number) => (den > 0 ? num / den : null);

export interface CoverageRow {
  tier: number;
  subject: "client" | "competitor";
  sentiment: "positive" | "neutral" | "negative";
  messages_pulled_through: string[];
  backlink: "follow" | "nofollow" | "none";
}

export interface PitchStats {
  sent: number;
  replied: number;
  placed_within_30d: number;
}

export function prKpis(coverage: CoverageRow[], pitches: PitchStats) {
  const client = coverage.filter((c) => c.subject === "client");
  const pos = client.filter((c) => c.sentiment === "positive").length;
  const neg = client.filter((c) => c.sentiment === "negative").length;
  return {
    media_mentions_tier1: client.filter((c) => c.tier === 1).length,
    "pr.media_mentions": client.length,
    share_of_voice: ratio(client.length, coverage.length),
    "pr.sentiment_net": ratio(pos - neg, client.length),
    "pr.message_pull_through": ratio(client.filter((c) => c.messages_pulled_through.length > 0).length, client.length),
    "pr.backlinks_earned": client.filter((c) => c.backlink !== "none").length,
    reply_rate: ratio(pitches.replied, pitches.sent),
    "pr.placement_rate": ratio(pitches.placed_within_30d, pitches.sent),
  };
}

/** Median of a list of minutes (request reply time, escalation time). */
export function medianMinutes(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Executive LinkedIn engagement rate: (reactions + comments + reposts) ÷ impressions. */
export const engagementRate = (p: { reactions: number; comments: number; reposts: number; impressions: number }) =>
  ratio(p.reactions + p.comments + p.reposts, p.impressions);

/** Share of executive posts approved with no changes. */
export const firstPassApproval = (decisions: ("approved" | "changes_requested" | "rejected")[]) =>
  ratio(decisions.filter((d) => d === "approved").length, decisions.length);
