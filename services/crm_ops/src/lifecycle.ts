export type RejectionReason = "bad_fit" | "no_budget" | "bad_timing" | "no_response" | "already_customer" | "competitor" | "duplicate" | "other";

export interface RecycleAction {
  stage: "nurture" | "disqualified" | "customer" | "unchanged";
  track?: "N1" | "N5" | "newsletter";
  /** Date of the recycle review or the owner task, YYYY-MM-DD. */
  review_date?: string;
  owner_task_date?: string;
  suppress_marketing?: boolean;
  /** Feedback event for the Scoring Analyst (svc.crm_ops/score.feedback). */
  score_feedback?: boolean;
  /** Start the W2 merge review (a data_change gate). */
  merge_review?: boolean;
  flag?: "routing_rule_failure";
  /** Emit svc.crm_ops/nurture.eligible after the stage change. */
  nurture_eligible: boolean;
}

const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000).toISOString().slice(0, 10);

/** The `crm` tool action `contact.apply_recycle_rule` in crm_ops.recycle (03-workflows.md W8). */
export function recycleAction(input: { reason: RejectionReason | "closed_lost" | "inactive_90d"; fit: number; at: Date }): RecycleAction {
  const { reason, fit, at } = input;
  switch (reason) {
    case "bad_fit":
      return fit < 25
        ? { stage: "disqualified", suppress_marketing: true, score_feedback: true, nurture_eligible: false }
        : { stage: "nurture", track: "newsletter", score_feedback: true, nurture_eligible: true };
    case "no_budget":
    case "bad_timing":
      return { stage: "nurture", track: "N5", review_date: addDays(at, 90), score_feedback: true, nurture_eligible: true };
    case "no_response":
    case "inactive_90d":
      return { stage: "nurture", track: "N1", nurture_eligible: true };
    case "already_customer":
      return { stage: "customer", flag: "routing_rule_failure", nurture_eligible: false };
    case "competitor":
      return { stage: "disqualified", suppress_marketing: true, score_feedback: true, nurture_eligible: false };
    case "duplicate":
      return { stage: "unchanged", merge_review: true, nurture_eligible: false };
    case "closed_lost":
      return { stage: "nurture", track: "N5", owner_task_date: addDays(at, 120), nurture_eligible: true };
    case "other":
      return { stage: "nurture", track: "N1", score_feedback: true, nurture_eligible: true };
  }
}

/** The conversion kind to post to the engine when a contact enters a stage, if any (engine-interface.md §2). */
export function conversionFor(stage: string): "mql" | "sal" | "sql" | "opportunity" | "closed_won" | undefined {
  const map: Record<string, "mql" | "sal" | "sql" | "opportunity" | "closed_won"> = { mql: "mql", sal: "sal", sql: "sql", opportunity: "opportunity", customer: "closed_won" };
  return map[stage];
}

const ORDER = ["subscriber", "lead", "mql", "sal", "sql", "opportunity", "customer", "evangelist"];

/** Stages move forward only. Moves back go through recycle (nurture); disqualified and churned can be set from any stage. */
export function stageMoveAllowed(from: string, to: string, viaRecycle = false): boolean {
  if (to === "disqualified" || to === "churned") return true;
  if (to === "nurture") return viaRecycle || from === "lead";
  if (from === "nurture") return ORDER.indexOf(to) >= ORDER.indexOf("mql");
  const a = ORDER.indexOf(from);
  const b = ORDER.indexOf(to);
  return a >= 0 && b > a;
}

export type RfmSegment = "champions" | "loyal" | "promising" | "at_risk" | "hibernating" | "other";

/** B2C RFM segment from quintile scores 1 to 5 (02-lifecycle-and-scoring.md §4.1). The first matching rule wins. */
export function rfmSegment(r: number, f: number, m: number): RfmSegment {
  for (const x of [r, f, m]) if (!Number.isInteger(x) || x < 1 || x > 5) throw new Error("RFM scores are integers 1 to 5");
  if (r === 5 && f >= 4 && m >= 4) return "champions";
  if (r >= 3 && f >= 3) return "loyal";
  if (r >= 4 && f <= 2) return "promising";
  if (r === 2 && f >= 3) return "at_risk";
  if (r === 1 && f <= 2) return "hibernating";
  return "other";
}

/** Quintile score 1 to 5 of each value inside its own list (higher value = higher score; for recency pass negative days). */
export function quintiles(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    const rank = sorted.indexOf(v) / Math.max(1, values.length);
    return Math.min(5, Math.floor(rank * 5) + 1);
  });
}

export interface QualityShares {
  consent: number;
  uniqueness: number;
  completeness: number;
  validity: number;
  freshness: number;
}

/** Data quality score 0 to 100 (07-approvals-and-kpis.md §3). Each share is 0 to 1. */
export function dataQualityScore(s: QualityShares): number {
  for (const v of Object.values(s)) if (v < 0 || v > 1) throw new Error("Each share is between 0 and 1");
  return Math.round((30 * s.consent + 20 * s.uniqueness + 20 * s.completeness + 15 * s.validity + 15 * s.freshness) * 10) / 10;
}

/** Import gate G-IMP may skip only for a first-party list of 500 rows or fewer (engine approval-inbox rule). */
export const importGateSkips = (rows: number, thirdParty: boolean) => rows <= 500 && !thirdParty;
