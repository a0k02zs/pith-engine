/** One run of one tracked prompt on one AI engine, as the GEO analyst (A9) records it. */
export interface GeoObservation {
  prompt_id: string;
  engine: string;
  run: number;
  date: string;
  client_mentioned: boolean;
  client_cited: boolean;
  position: number | null;
  competitors_mentioned: string[];
  cited_domains: string[];
}

export interface GeoMetrics {
  runs: number;
  ai_citation_share: number;
  ai_mention_share: number;
  ai_avg_position: number | null;
  share_of_voice: number;
}

/** Engine KPI values for a set of runs. Share of voice = client mentions / (client + tracked competitor mentions). */
export function geoMetrics(obs: GeoObservation[], trackedCompetitors: string[]): GeoMetrics {
  const runs = obs.length;
  if (runs === 0) return { runs: 0, ai_citation_share: 0, ai_mention_share: 0, ai_avg_position: null, share_of_voice: 0 };
  const cited = obs.filter((o) => o.client_cited).length;
  const mentioned = obs.filter((o) => o.client_mentioned).length;
  const positions = obs.map((o) => o.position).filter((p): p is number => p !== null);
  const tracked = new Set(trackedCompetitors.map((c) => c.toLowerCase()));
  const competitorMentions = obs.reduce(
    (n, o) => n + new Set(o.competitors_mentioned.map((c) => c.toLowerCase()).filter((c) => tracked.has(c))).size,
    0,
  );
  return {
    runs,
    ai_citation_share: cited / runs,
    ai_mention_share: mentioned / runs,
    ai_avg_position: positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null,
    share_of_voice: mentioned + competitorMentions === 0 ? 0 : mentioned / (mentioned + competitorMentions),
  };
}

/** True when any of the client's domains (or a subdomain of one) is in the cited domains. */
export function citesClient(citedDomains: string[], clientDomains: string[]): boolean {
  const own = clientDomains.map((d) => d.toLowerCase().replace(/^www\./, ""));
  return citedDomains.some((c) => {
    const host = c.toLowerCase().replace(/^www\./, "");
    return own.some((d) => host === d || host.endsWith(`.${d}`));
  });
}

/** GEO numbers are reported as a 4-week rolling average with the range, because AI answers change between runs. */
export function rollingWeekly(weekly: number[], weeks = 4): { average: number; min: number; max: number } | null {
  const window = weekly.slice(-weeks);
  if (window.length < weeks) return null;
  return { average: window.reduce((a, b) => a + b, 0) / weeks, min: Math.min(...window), max: Math.max(...window) };
}

/** Alert rule (W4 step 5): citation share on a priority cluster fell more than 10 points on the previous 4-week average. */
export const geoDropAlert = (previousAverage: number, currentAverage: number) => previousAverage - currentAverage > 0.1 + 1e-9;

/**
 * Source gaps (W4 step 4): domains that AI engines cite for prompts where the client is not mentioned,
 * ranked by how often they appear. These go to PR (14), community (18) and affiliate (15) as targets.
 */
export function sourceGaps(obs: GeoObservation[], clientDomains: string[], limit = 20): { domain: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const o of obs.filter((o) => !o.client_mentioned)) {
    for (const d of new Set(o.cited_domains.map((d) => d.toLowerCase().replace(/^www\./, "")))) {
      if (citesClient([d], clientDomains)) continue;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, limit);
}

/** AI referrers for the GA4 custom channel group behind the ai_referral_sessions KPI. */
export const AI_REFERRERS = ["chatgpt.com", "chat.openai.com", "perplexity.ai", "gemini.google.com", "copilot.microsoft.com", "claude.ai"];

export const isAiReferral = (referrerHost: string) =>
  AI_REFERRERS.some((r) => referrerHost === r || referrerHost.endsWith(`.${r}`));
