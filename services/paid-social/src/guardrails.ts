/** Code guardrails for daily optimisation (docs/03-approvals-and-guardrails.md). Agents propose; these rules decide what runs without a person. */

export const MAX_AUTO_CHANGE_PCT = 20;

export interface BudgetMove {
  campaign_id: string;
  current_daily: number;
  proposed_daily: number;
}

export interface MoveDecision {
  campaign_id: string;
  auto: boolean;
  reason: string;
}

/**
 * Splits proposed moves into those that may run inside spend_policies and those that need gate G4 (budget_change).
 * A move needs a person when it changes 1 campaign by more than 20% in a day, or when the moves together raise the total.
 * A cut is never blocked.
 */
export function classifyMoves(moves: BudgetMove[]): MoveDecision[] {
  const raisesTotal = moves.reduce((sum, m) => sum + m.proposed_daily - m.current_daily, 0) > 1e-9;
  return moves.map((m) => {
    const delta = m.proposed_daily - m.current_daily;
    if (delta <= 0) return { campaign_id: m.campaign_id, auto: true, reason: "cut or no change" };
    if (m.current_daily <= 0) return { campaign_id: m.campaign_id, auto: false, reason: "new spend on a campaign with no budget" };
    const pct = (delta / m.current_daily) * 100;
    if (pct > MAX_AUTO_CHANGE_PCT + 1e-9) return { campaign_id: m.campaign_id, auto: false, reason: `raise of ${pct.toFixed(1)}% is over ${MAX_AUTO_CHANGE_PCT}%` };
    if (raisesTotal) return { campaign_id: m.campaign_id, auto: false, reason: "the moves raise the total daily budget" };
    return { campaign_id: m.campaign_id, auto: true, reason: `shift of ${pct.toFixed(1)}% inside the total` };
  });
}

export interface DayResult {
  date: string;
  spend: number;
  conversions: number;
}

/** CPA auto-pause: CPA ≥ 1.5 × target on each of the last 3 days, with spend over those days ≥ 2 × target CPA. A day with spend and no conversions counts as over. */
export function shouldAutoPause(lastDays: DayResult[], targetCpa: number): boolean {
  const days = lastDays.slice(-3);
  if (days.length < 3) return false;
  const spend = days.reduce((s, d) => s + d.spend, 0);
  if (spend < 2 * targetCpa) return false;
  return days.every((d) => (d.conversions === 0 ? d.spend > 0 : d.spend / d.conversions >= 1.5 * targetCpa));
}

/** Kill rule for a test variant or an ad: no conversions after spend of 3 × target CPA. */
export const killRule = (spend: number, conversions: number, targetCpa: number) => conversions === 0 && spend >= 3 * targetCpa;

/** Spend spike: spend for the day ≥ 1.3 × planned daily spend. */
export const spendSpike = (spend: number, plannedDaily: number) => spend >= 1.3 * plannedDaily;

/** Silent tracking: 0 conversions in 24 hours when the 28-day daily average is 5 or more. Treat as a tracking fault, not as bad ads. */
export const silentTracking = (conversions24h: number, avgDaily28d: number) => conversions24h === 0 && avgDaily28d >= 5;

export interface FatigueInput {
  ctr_change_pct: number;
  cpa_change_pct: number;
  frequency: number;
  stage: "prospect" | "retarget";
}

/** Creative fatigue: 2 of 3 signals (CTR down ≥ 30%, CPA up ≥ 25%, frequency over 3.0 prospect or 6.0 retarget). */
export function fatigueSignals(f: FatigueInput): { fatigued: boolean; signals: string[] } {
  const signals: string[] = [];
  if (f.ctr_change_pct <= -30) signals.push("ctr_drop");
  if (f.cpa_change_pct >= 25) signals.push("cpa_rise");
  if (f.frequency > (f.stage === "prospect" ? 3.0 : 6.0)) signals.push("frequency");
  return { fatigued: signals.length >= 2, signals };
}
