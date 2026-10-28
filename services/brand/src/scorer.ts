/**
 * Brand-score rubric (docs/03-agent-prompts.md §17). The engine owns POST /artifacts/{id}/brand-score;
 * this service owns the weights and the per-client calibration. Dimensions match the engine response.
 */

export type Dimension = "voice" | "terminology" | "claims" | "banned_terms" | "locale" | "visual";

export const WEIGHTS: Record<Dimension, number> = {
  voice: 30,
  terminology: 15,
  claims: 25,
  banned_terms: 10,
  locale: 10,
  visual: 10,
};

/** Each dimension is scored 0 to 100 by the scorer agent. */
export type DimensionScores = Partial<Record<Dimension, number>>;

export interface ScoreResult {
  score: number;
  weights: Record<Dimension, number>;
  flags: string[];
}

export interface ScoreContext {
  unapprovedClaims?: number;
  bannedTermHits?: number;
}

/**
 * Combine dimension scores into 1 score from 0 to 100.
 * - With no visual score (text only), the visual weight moves to voice and terminology, 2 to 1.
 * - 1 unapproved claim sets claims to 0 and flags "claim"; 1 banned term sets banned_terms to 0.
 */
export function combineScore(dims: DimensionScores, ctx: ScoreContext = {}): ScoreResult {
  const weights = { ...WEIGHTS };
  if (dims.visual === undefined) {
    const extra = weights.visual;
    weights.visual = 0;
    weights.voice += (extra * 2) / 3;
    weights.terminology += extra / 3;
  }
  const flags: string[] = [];
  const values: Record<Dimension, number> = {
    voice: clamp(dims.voice ?? 0),
    terminology: clamp(dims.terminology ?? 0),
    claims: clamp(dims.claims ?? 0),
    banned_terms: clamp(dims.banned_terms ?? 0),
    locale: clamp(dims.locale ?? 0),
    visual: clamp(dims.visual ?? 0),
  };
  if ((ctx.unapprovedClaims ?? 0) > 0) {
    values.claims = 0;
    flags.push("claim");
  }
  if ((ctx.bannedTermHits ?? 0) > 0) {
    values.banned_terms = 0;
    flags.push("banned_term");
  }
  let total = 0;
  for (const d of Object.keys(weights) as Dimension[]) total += (weights[d] * values[d]) / 100;
  return { score: Math.round(total * 100) / 100, weights, flags };
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export interface BrainTerms {
  banned_terms?: { term: string; markets?: string[] }[];
}

/** Banned terms from the brain found in a text, for 1 market (ISO alpha-2). Matches whole words, any case. */
export function findBannedTerms(text: string, brain: BrainTerms, market: string): string[] {
  const hits: string[] = [];
  for (const b of brain.banned_terms ?? []) {
    if (b.markets && b.markets.length > 0 && !b.markets.includes(market)) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(b.term)}($|[^\\p{L}\\p{N}])`, "iu");
    if (re.test(text)) hits.push(b.term);
  }
  return hits;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Calibration rule: at least 18 of 20 on-brand samples score 80 or more, and 18 of 20 off-brand under 60. */
export const CALIBRATION = { onBrandMin: 80, offBrandMax: 60, required: 18, sampleSize: 20 } as const;

export interface CalibrationResult {
  passed: boolean;
  onBrandPass: number;
  offBrandPass: number;
  problems: string[];
}

export function checkCalibration(onBrandScores: number[], offBrandScores: number[]): CalibrationResult {
  const problems: string[] = [];
  if (onBrandScores.length !== CALIBRATION.sampleSize) problems.push(`Need ${CALIBRATION.sampleSize} on-brand samples, got ${onBrandScores.length}`);
  if (offBrandScores.length !== CALIBRATION.sampleSize) problems.push(`Need ${CALIBRATION.sampleSize} off-brand samples, got ${offBrandScores.length}`);
  const onBrandPass = onBrandScores.filter((s) => s >= CALIBRATION.onBrandMin).length;
  const offBrandPass = offBrandScores.filter((s) => s < CALIBRATION.offBrandMax).length;
  if (onBrandPass < CALIBRATION.required) problems.push(`Only ${onBrandPass} on-brand samples scored ${CALIBRATION.onBrandMin} or more`);
  if (offBrandPass < CALIBRATION.required) problems.push(`Only ${offBrandPass} off-brand samples scored under ${CALIBRATION.offBrandMax}`);
  return { passed: problems.length === 0, onBrandPass, offBrandPass, problems };
}
