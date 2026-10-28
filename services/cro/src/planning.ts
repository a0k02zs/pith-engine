import { plan, type Plan, type PlanInput } from "./stats.js";
import { blackoutsFor, type Blackout } from "./market-rules.js";

export type Score = 1 | 2 | 3 | 4 | 5;

/** Priority = Impact x Confidence / Effort (docs/01-playbook.md 5.1). Effort is the divisor, so high effort lowers priority. */
export function priority(impact: Score, confidence: Score, effort: Score): number {
  for (const v of [impact, confidence, effort]) {
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new RangeError("scores must be integers from 1 to 5");
  }
  return Math.round(((impact * confidence) / effort) * 100) / 100;
}

/** Confidence is 4 or 5 only with 2 or more evidence types, or a past win on a similar page. */
export function maxConfidence(evidenceTypes: string[], pastSimilarWin: boolean): Score {
  return new Set(evidenceTypes).size >= 2 || pastSimilarWin ? 5 : new Set(evidenceTypes).size === 1 ? 3 : 1;
}

const DAY = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fmt = (t: number) => new Date(t).toISOString().slice(0, 10);

export interface ScheduleInput extends PlanInput {
  /** Market codes from enums.json, for example ["GB", "AE"]. */
  markets: string[];
  /** Earliest start, YYYY-MM-DD. */
  earliestStart: string;
}

export interface Schedule {
  plan: Plan;
  design: "ab" | "abn" | "not_testable";
  fallback: null | "bolder_change" | "higher_funnel_metric" | "fix_and_monitor";
  start: string | null;
  end: string | null;
  /** Blackouts that moved the start date. */
  avoided: Blackout[];
}

/**
 * Test plan with dates: the test must not cross a major sale or holiday in any target market,
 * and new starts pause 3 days before such an event (docs/01-playbook.md 5.3).
 */
export function schedule(input: ScheduleInput): Schedule {
  const p = plan(input);
  if (!p.testable || p.days === null) {
    return { plan: p, design: "not_testable", fallback: "bolder_change", start: null, end: null, avoided: [] };
  }
  const windows = input.markets.flatMap((m) => blackoutsFor(m));
  const avoided: Blackout[] = [];
  let start = parse(input.earliestStart);
  for (let guard = 0; guard < 400; guard++) {
    const end = start + (p.days - 1) * DAY;
    const hit = windows.find((w) => parse(w.from) - 3 * DAY <= end && parse(w.to) >= start);
    if (!hit) {
      return { plan: p, design: p.arms > 2 ? "abn" : "ab", fallback: null, start: fmt(start), end: fmt(end), avoided };
    }
    avoided.push(hit);
    start = parse(hit.to) + DAY;
  }
  throw new Error("No start date without a blackout in the next 400 tries");
}
