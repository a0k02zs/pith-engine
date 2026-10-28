/**
 * Incrementality test sizing (docs/templates/incrementality-test.md). Audience holdouts compare
 * conversion rates; the agent uses these numbers and does not compute them itself.
 */

/** 90% confidence (two-sided) and 80% power, as the playbook sets. */
export const Z_ALPHA = 1.6448536269514722;
export const Z_POWER = 0.8416212335729143;
export const MIN_TEST_DAYS = 21;

/**
 * Smallest relative lift an audience holdout can detect.
 * baseRate: control conversion rate (0..1); nTest, nControl: people in each group.
 */
export function minimumDetectableLift(baseRate: number, nTest: number, nControl: number): number {
  if (baseRate <= 0 || baseRate >= 1) throw new RangeError("baseRate must be between 0 and 1");
  if (nTest <= 0 || nControl <= 0) throw new RangeError("group sizes must be positive");
  const se = Math.sqrt(baseRate * (1 - baseRate) * (1 / nTest + 1 / nControl));
  return ((Z_ALPHA + Z_POWER) * se) / baseRate;
}

/** People needed in each group (equal split) to detect a relative lift. */
export function sampleSizePerGroup(baseRate: number, relativeLift: number): number {
  if (relativeLift <= 0) throw new RangeError("relativeLift must be positive");
  const delta = baseRate * relativeLift;
  return Math.ceil((2 * (Z_ALPHA + Z_POWER) ** 2 * baseRate * (1 - baseRate)) / delta ** 2);
}

/** The playbook rule: a test is underpowered when its MDE is over 2 times the expected lift. */
export function isUnderpowered(mde: number, expectedLift: number): boolean {
  return mde > 2 * expectedLift;
}

/** Relative lift: (test − control) ÷ control (KPI incremental_lift). */
export function incrementalLift(testRate: number, controlRate: number): number {
  if (controlRate <= 0) throw new RangeError("controlRate must be positive");
  return (testRate - controlRate) / controlRate;
}
