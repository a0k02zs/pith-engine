/** Start targets from the client's unit economics (docs/04-kpis.md). */

/** Target CPA = AOV × gross margin ÷ 1.5, so a first order leaves margin after media. */
export function targetCpa(aov: number, margin: number): number {
  assertMargin(margin);
  return (aov * margin) / 1.5;
}

/** Break-even ROAS = 1 ÷ gross margin. */
export function breakEvenRoas(margin: number): number {
  assertMargin(margin);
  return 1 / margin;
}

/** Target ROAS = 1.3 × break-even ROAS. */
export const targetRoas = (margin: number) => 1.3 * breakEvenRoas(margin);

/** B2B: target cost per SQL = average deal value × SQL-to-won rate × 0.2. */
export function targetCostPerSql(dealValue: number, sqlToWonRate: number): number {
  if (sqlToWonRate < 0 || sqlToWonRate > 1) throw new RangeError("sqlToWonRate must be between 0 and 1");
  return dealValue * sqlToWonRate * 0.2;
}

/** Daily spend cap per account = monthly budget ÷ days in the month × 1.3. */
export const dailyCap = (monthlyBudget: number, daysInMonth: number) => (monthlyBudget / daysInMonth) * 1.3;

export type PacingStatus = "under" | "on" | "over";

/** Pacing = spend to date ÷ (monthly budget × day ÷ days in month). On pace is 95% to 105%. */
export function pacing(spendToDate: number, monthlyBudget: number, dayOfMonth: number, daysInMonth: number): { ratio: number; status: PacingStatus } {
  const ratio = spendToDate / ((monthlyBudget * dayOfMonth) / daysInMonth);
  return { ratio, status: ratio < 0.95 ? "under" : ratio > 1.05 ? "over" : "on" };
}

function assertMargin(margin: number) {
  if (!(margin > 0 && margin <= 1)) throw new RangeError("margin must be above 0 and at most 1");
}
