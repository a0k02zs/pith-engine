import { readFileSync } from "node:fs";
import { allCountries } from "./markets.js";
import { dir } from "./paths.js";

type Op = "in" | "eq" | "intersects" | "not_in";

interface FitRule {
  id: string;
  field: string;
  op: Op;
  value?: unknown;
  value_ref?: string;
  points: number;
}

interface EngagementRule {
  id: string;
  event: string;
  where?: Record<string, unknown>;
  points: number;
  cap_30d?: number | null;
  fast_track?: boolean;
}

export interface GradeRule {
  grade: "A" | "B" | "C" | "D";
  label: string;
  rule: string;
  stage: string;
  sla_minutes?: number;
  escalate_minutes?: number[];
  sla_business_hours?: number;
  escalate_business_hours?: number[];
  track?: string;
}

export interface ScoreModel {
  model_id: string;
  version: string;
  fit: {
    max: number;
    min: number;
    rules: FitRule[];
    exclusive_groups: string[][];
    disqualify_if: { field: string; op: Op; value?: unknown; value_ref?: string }[];
  };
  engagement: {
    max: number;
    decay: { percent: number; every_days: number; reset_on_new_action: boolean };
    rules: EngagementRule[];
    reset_if: { event: string; set: number; flag: string }[];
    handraise_window_days: number;
  };
  grades: GradeRule[];
  account_rollup: { method: "sum_top_n"; n: number; cap: number; field: string };
  tuning: {
    first_review_after_days: number;
    health: { mql_to_sql_target_range: [number, number]; raise_thresholds_below: number; lower_thresholds_above: number; hot_vs_warm_ratio_min: number };
  };
}

/** The Pith default model (config/lead-scoring.json). A client copy replaces the ICP values at gate G1. */
export const defaultModel = JSON.parse(readFileSync(dir("config", "lead-scoring.json"), "utf8")) as ScoreModel;

/** ICP values the fit rules read through `value_ref`. They come from the approved design doc. */
export interface ClientIcp {
  size_bands: string[];
  size_bands_adjacent: string[];
  industries: string[];
  industries_secondary: string[];
  buyer_functions: string[];
  technologies: string[];
  /** Countries (or subdivisions such as CA-QC) the client sells in. */
  sales_regions: string[];
  competitor_domains: string[];
}

export interface ContactProfile {
  company_size_band?: string;
  industry?: string;
  job_seniority?: string;
  job_function?: string;
  /** ISO 3166-1 country, or ISO 3166-2 subdivision such as CA-QC. */
  country_code?: string;
  tech_stack?: string[];
  email_domain?: string;
  email_domain_type?: "free" | "business";
  persona_flag?: string;
}

export interface EngagementEvent {
  event: string;
  at: string;
  props?: Record<string, unknown>;
}

function refValue(ref: string, icp: ClientIcp): unknown[] {
  if (ref === "pithm.markets.all_countries") return allCountries;
  const key = ref.replace(/^client\.(icp\.)?/, "") as keyof ClientIcp;
  const value = icp[key];
  if (!Array.isArray(value)) throw new Error(`Unknown value_ref ${ref}`);
  return value;
}

function test(op: Op, actual: unknown, expected: unknown): boolean {
  if (actual === undefined || actual === null) return op === "not_in";
  const list = Array.isArray(expected) ? expected : [expected];
  // A subdivision such as CA-QC also matches its country CA.
  const candidates = typeof actual === "string" && /^[A-Z]{2}-[A-Z0-9]+$/.test(actual) ? [actual, actual.slice(0, 2)] : [actual];
  switch (op) {
    case "eq":
      return actual === expected;
    case "in":
      return candidates.some((c) => list.includes(c));
    case "not_in":
      return !candidates.some((c) => list.includes(c));
    case "intersects":
      return Array.isArray(actual) && actual.some((a) => list.includes(a));
  }
}

export interface FitResult {
  fit: number;
  /** Points by rule id, after exclusive groups. */
  rules: Record<string, number>;
  disqualified: boolean;
  disqualify_reason?: string;
}

/** Fit score 0 to 50 (02-lifecycle-and-scoring.md §3.1). In an exclusive group only the first matching rule counts. */
export function fitScore(c: ContactProfile, icp: ClientIcp, model: ScoreModel = defaultModel): FitResult {
  for (const d of model.fit.disqualify_if) {
    const expected = d.value_ref ? refValue(d.value_ref, icp) : d.value;
    if (test(d.op, c[d.field as keyof ContactProfile], expected)) {
      return { fit: 0, rules: {}, disqualified: true, disqualify_reason: `${d.field} ${d.op} ${d.value_ref ?? JSON.stringify(d.value)}` };
    }
  }
  const rules: Record<string, number> = {};
  for (const r of model.fit.rules) {
    const group = model.fit.exclusive_groups.find((g) => g.includes(r.id));
    if (group && group.some((id) => id in rules)) continue;
    const expected = r.value_ref ? refValue(r.value_ref, icp) : r.value;
    if (test(r.op, c[r.field as keyof ContactProfile], expected)) rules[r.id] = r.points;
  }
  const raw = Object.values(rules).reduce((a, b) => a + b, 0);
  return { fit: Math.min(model.fit.max, Math.max(model.fit.min, raw)), rules, disqualified: false };
}

const DAY = 86_400_000;

function matches(rule: EngagementRule, e: EngagementEvent): boolean {
  if (rule.event !== e.event) return false;
  for (const [k, v] of Object.entries(rule.where ?? {})) {
    const actual = e.props?.[k];
    if (Array.isArray(v) ? !v.includes(actual) : actual !== v) return false;
  }
  return true;
}

export interface EngagementResult {
  engagement: number;
  rules: Record<string, number>;
  handraise: boolean;
  flags: string[];
  last_action_at?: string;
}

/**
 * Engagement score 0 to 50 (§3.2). Each rule has a cap per rolling 30 days. With no new positive action for 30 days
 * the score loses 25%, again for each further 30 days. A hard bounce sets it to 0 and flags the record.
 */
export function engagementScore(events: EngagementEvent[], now: Date, model: ScoreModel = defaultModel): EngagementResult {
  const m = model.engagement;
  const sorted = [...events].filter((e) => new Date(e.at) <= now).sort((a, b) => a.at.localeCompare(b.at));

  const awarded: { rule: string; at: number; points: number }[] = [];
  const rules: Record<string, number> = {};
  const flags: string[] = [];
  let score = 0;
  let lastAction: number | undefined;
  let applied = 0;
  let handraiseAt: number | undefined;
  // Applies the decay periods that have passed since the last positive action and are not applied yet.
  const decayTo = (at: number) => {
    if (lastAction === undefined) return;
    const periods = Math.floor((at - lastAction) / (m.decay.every_days * DAY));
    if (periods > applied) score *= (1 - m.decay.percent / 100) ** (periods - applied);
    applied = Math.max(applied, periods);
  };
  for (const e of sorted) {
    const at = new Date(e.at).getTime();
    const reset = m.reset_if.find((r) => r.event === e.event);
    if (reset) {
      decayTo(at);
      score = reset.set;
      if (!flags.includes(reset.flag)) flags.push(reset.flag);
      continue;
    }
    const rule = m.rules.find((r) => matches(r, e));
    if (!rule) continue;
    let points = rule.points;
    if (points > 0 && rule.cap_30d) {
      const used = awarded.filter((a) => a.rule === rule.id && at - a.at < 30 * DAY).reduce((s, a) => s + a.points, 0);
      points = Math.max(0, Math.min(points, rule.cap_30d - used));
    }
    decayTo(at);
    if (points > 0) {
      lastAction = at;
      applied = 0;
      awarded.push({ rule: rule.id, at, points });
    }
    if (rule.fast_track) handraiseAt = at;
    score = Math.min(m.max, Math.max(0, score + points));
    rules[rule.id] = (rules[rule.id] ?? 0) + points;
  }
  decayTo(now.getTime());
  return {
    engagement: Math.round(score * 10) / 10,
    rules,
    handraise: handraiseAt !== undefined && now.getTime() - handraiseAt <= m.handraise_window_days * DAY,
    flags,
    last_action_at: lastAction === undefined ? undefined : new Date(lastAction).toISOString(),
  };
}

export type Grade = "A" | "B" | "C" | "D";

/** Grade from the thresholds in §3.3, checked in the order A, B, D, then C. */
export function grade(fit: number, total: number, handraise: boolean): Grade {
  if ((handraise && fit >= 25) || (total >= 80 && fit >= 40)) return "A";
  if (total >= 65 && total < 80 && fit >= 40) return "B";
  if (total < 30) return "D";
  return "C";
}

export interface LeadScore {
  model_id: string;
  model_version: string;
  fit: number;
  engagement: number;
  total: number;
  grade: Grade | null;
  handraise: boolean;
  /** The stage the grade puts the lead in: mql (A, B), lead (C, D) or disqualified. */
  stage: "mql" | "lead" | "disqualified";
  track?: "nurture" | "newsletter";
  rule_points: Record<string, number>;
  flags: string[];
  disqualify_reason?: string;
}

/** The `crm_ops` tool action `score.calculate` in crm_ops.score_route. */
export function scoreLead(c: ContactProfile, events: EngagementEvent[], icp: ClientIcp, now: Date, model: ScoreModel = defaultModel): LeadScore {
  const base = { model_id: model.model_id, model_version: model.version };
  const f = fitScore(c, icp, model);
  if (f.disqualified) {
    return { ...base, fit: 0, engagement: 0, total: 0, grade: null, handraise: false, stage: "disqualified", rule_points: {}, flags: [], disqualify_reason: f.disqualify_reason };
  }
  const e = engagementScore(events, now, model);
  const total = Math.round((f.fit + e.engagement) * 10) / 10;
  const g = grade(f.fit, total, e.handraise);
  return {
    ...base,
    fit: f.fit,
    engagement: e.engagement,
    total,
    grade: g,
    handraise: e.handraise,
    stage: g === "A" || g === "B" ? "mql" : "lead",
    track: g === "C" ? "nurture" : g === "D" ? "newsletter" : undefined,
    rule_points: { ...f.rules, ...e.rules },
    flags: e.flags,
  };
}

/** Account engagement score for ABM (service 8): the sum of the top 3 contact engagement scores, capped at 100. */
export function accountEngagement(contactEngagement: number[], model: ScoreModel = defaultModel): number {
  const { n, cap } = model.account_rollup;
  const top = [...contactEngagement].sort((a, b) => b - a).slice(0, n);
  return Math.min(cap, top.reduce((a, b) => a + b, 0));
}

export interface TuningInput {
  mqls: number;
  sqls: number;
  sql_rate_a: number;
  sql_rate_b: number;
}

/** Health check for the monthly tuning (§6). The result is advice for the Scoring Analyst; a person approves at G3. */
export function tuningAdvice(t: TuningInput, model: ScoreModel = defaultModel) {
  const h = model.tuning.health;
  const rate = t.mqls === 0 ? 0 : t.sqls / t.mqls;
  const notes: string[] = [];
  if (t.mqls < 100) return { rate, action: "too_few" as const, notes: ["under 100 MQLs: no point changes"] };
  const ratio = t.sql_rate_b === 0 ? Infinity : t.sql_rate_a / t.sql_rate_b;
  if (ratio < h.hot_vs_warm_ratio_min - 1e-9) notes.push(`hot vs warm ratio ${ratio.toFixed(2)} is under ${h.hot_vs_warm_ratio_min}`);
  const [low, high] = h.mql_to_sql_target_range;
  if (rate < h.raise_thresholds_below) return { rate, action: "raise_thresholds" as const, notes };
  if (rate > h.lower_thresholds_above) return { rate, action: "lower_thresholds" as const, notes };
  if (rate < low || rate > high) notes.push(`MQL to SQL rate ${(rate * 100).toFixed(1)}% is outside ${low * 100}% to ${high * 100}%`);
  return { rate, action: "keep" as const, notes };
}
