/** Brand drift (docs/06-kpis.md §1 and the drift fix play in docs/01-playbook.md §5). */

export const DRIFT = { alertBelow: 70, months: 2 } as const;

/** Count of the latest months, in a row, with an average brand score under the alert level. Oldest month first. */
export function driftMonths(monthlyAverages: number[]): number {
  let n = 0;
  for (let i = monthlyAverages.length - 1; i >= 0; i--) {
    if (monthlyAverages[i] < DRIFT.alertBelow) n++;
    else break;
  }
  return n;
}

/** True when the brand.monitor workflow must start the drift fix play (svc.brand/drift.detected). */
export const isDrifting = (monthlyAverages: number[]) => driftMonths(monthlyAverages) >= DRIFT.months;
