import { programmeRules, type ScoreItem } from "./config.js";

export type Scores = Record<ScoreItem, number | null>;

/**
 * Weighted partner score (template T3). A missing item (null, "no data") counts as 0, so a candidate
 * never scores well on data nobody has. Brand safety at or below the floor rejects, whatever the total.
 */
export function scorePartner(scores: Scores): { total: number; recommend: "approve" | "review" | "reject"; missing: ScoreItem[] } {
  const sc = programmeRules.scorecard;
  const items = Object.keys(sc.weights) as ScoreItem[];
  const missing = items.filter((k) => scores[k] === null || scores[k] === undefined);
  for (const k of items) {
    const v = scores[k];
    if (v !== null && v !== undefined && (v < 0 || v > 5)) throw new Error(`Score ${k} must be 0 to 5, got ${v}`);
  }
  const total = Math.round(items.reduce((sum, k) => sum + (scores[k] ?? 0) * sc.weights[k], 0) * 100) / 100;
  const safety = scores.brand_safety ?? 0;
  if (safety <= sc.reject_if_brand_safety_at_or_below) return { total, recommend: "reject", missing };
  const recommend = total >= sc.approve_at ? "approve" : total >= sc.review_at ? "review" : "reject";
  return { total, recommend, missing };
}
