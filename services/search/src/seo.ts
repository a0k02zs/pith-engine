/** Crawlers that answer engines use. Search crawlers must stay allowed; training crawlers are the client's decision at gate G4. */
export const AI_CRAWLERS = {
  search: ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot"],
  training: ["GPTBot", "Google-Extended", "ClaudeBot", "Applebot-Extended"],
} as const;

interface Group {
  agents: string[];
  rules: { allow: boolean; path: string }[];
}

function parseRobots(robotsTxt: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      if (value !== "") current.rules.push({ allow: key === "allow", path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

/**
 * Whether robots.txt lets a crawler fetch a path (RFC 9309): use the group that names the agent, else `*`;
 * the longest matching rule wins and Allow wins a tie. Supports `*` and `$` in paths.
 */
export function robotsAllows(robotsTxt: string, userAgent: string, path = "/"): boolean {
  const groups = parseRobots(robotsTxt);
  const ua = userAgent.toLowerCase();
  const named = groups.filter((g) => g.agents.includes(ua));
  const chosen = named.length ? named : groups.filter((g) => g.agents.includes("*"));
  let best: { allow: boolean; len: number } | null = null;
  for (const rule of chosen.flatMap((g) => g.rules)) {
    const pattern = new RegExp(
      "^" + rule.path.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\?\$$/, "$"),
    );
    if (!pattern.test(path)) continue;
    const len = rule.path.length;
    if (!best || len > best.len || (len === best.len && rule.allow)) best = { allow: rule.allow, len };
  }
  return best ? best.allow : true;
}

/** AI crawler access for the technical audit (T1). A blocked search crawler is a critical issue. */
export function aiCrawlerAccess(robotsTxt: string): { agent: string; kind: "search" | "training"; allowed: boolean; issue: "critical" | "client_decision" | null }[] {
  return [
    ...AI_CRAWLERS.search.map((agent) => {
      const allowed = robotsAllows(robotsTxt, agent);
      return { agent, kind: "search" as const, allowed, issue: allowed ? null : ("critical" as const) };
    }),
    ...AI_CRAWLERS.training.map((agent) => ({ agent, kind: "training" as const, allowed: robotsAllows(robotsTxt, agent), issue: "client_decision" as const })),
  ];
}

export interface PageVersion {
  url: string;
  locale: string;
  canonical: string;
  hreflang: Record<string, string>;
}

/** hreflang check for one page set: every version is self-canonical, names every version and x-default, and is named back. */
export function hreflangFailures(versions: PageVersion[]): string[] {
  const out: string[] = [];
  for (const v of versions) {
    if (v.canonical !== v.url) out.push(`${v.url}: canonical is not self-referencing`);
    if (!v.hreflang["x-default"]) out.push(`${v.url}: no x-default`);
    for (const other of versions) {
      if (v.hreflang[other.locale] !== other.url) out.push(`${v.url}: missing or wrong hreflang for ${other.locale}`);
    }
  }
  return out;
}

export interface RoadmapItem {
  id: string;
  value: number;
  confidence: number;
  effort: number;
  critical?: boolean;
}

/** Roadmap order (A4): critical technical issues first, then priority = value x confidence / effort. */
export function rankRoadmap<T extends RoadmapItem>(items: T[]): (T & { priority: number })[] {
  return items
    .map((i) => ({ ...i, priority: Math.round(((i.value * i.confidence) / i.effort) * 100) / 100 }))
    .sort((a, b) => Number(!!b.critical) - Number(!!a.critical) || b.priority - a.priority || a.id.localeCompare(b.id));
}

/** Fill months 1-3 in priority order up to the package capacity per month. Critical items always go in month 1. */
export function scheduleRoadmap<T extends RoadmapItem>(items: T[], perMonth: number): (T & { priority: number; month: number | null })[] {
  const used = [0, 0, 0];
  return rankRoadmap(items).map((item) => {
    if (item.critical) {
      used[0]++;
      return { ...item, month: 1 };
    }
    const m = used.findIndex((n) => n < perMonth);
    if (m === -1) return { ...item, month: null };
    used[m]++;
    return { ...item, month: m + 1 };
  });
}

export interface PageTrend {
  clicksPrevious3m: number;
  clicksCurrent3m: number;
  citationShareBefore: number;
  citationShareNow: number;
  oldestFactDate: Date;
}

export type DecayReason = "traffic_drop" | "lost_ai_citations" | "stale_fact";

/** W8 refresh rules: organic clicks down 20% or more on the prior 3 months, citation share down 10 points, a fact older than 12 months. */
export function decayReasons(p: PageTrend, now: Date): DecayReason[] {
  const out: DecayReason[] = [];
  if (p.clicksPrevious3m > 0 && p.clicksCurrent3m <= p.clicksPrevious3m * 0.8) out.push("traffic_drop");
  if (p.citationShareBefore - p.citationShareNow >= 0.1 - 1e-9) out.push("lost_ai_citations");
  const yearAgo = new Date(now);
  yearAgo.setUTCFullYear(now.getUTCFullYear() - 1);
  if (p.oldestFactDate < yearAgo) out.push("stale_fact");
  return out;
}
