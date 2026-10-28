import { createHash } from "node:crypto";

export interface AudienceSplit {
  holdout: string[];
  test_cells: Record<string, string[]>;
  rest: string[];
}

/** Pith broadcast defaults: 10% holdout with a floor of 1000 contacts, and a 20% A/B test cell. */
export const HOLDOUT_SHARE = 0.1;
export const HOLDOUT_MIN = 1000;
export const TEST_SHARE = 0.2;

const rank = (seed: string, id: string) => createHash("sha256").update(`${seed}:${id}`).digest("hex");

/**
 * Split a resolved audience into a holdout (control group), A/B test cells and the rest.
 * The split is stable: the same seed (use the broadcast id) and the same ids give the same groups.
 * The holdout takes 10% or 1000 contacts, whichever is more, but never more than half the audience.
 */
export function splitAudience(contactIds: string[], seed: string, variants: string[] = ["A", "B"]): AudienceSplit {
  const ids = [...new Set(contactIds)].sort((a, b) => (rank(seed, a) < rank(seed, b) ? -1 : 1));
  const holdoutSize = Math.min(Math.max(Math.round(ids.length * HOLDOUT_SHARE), HOLDOUT_MIN), Math.floor(ids.length / 2));
  const holdout = ids.slice(0, holdoutSize);
  const sendable = ids.slice(holdoutSize);
  const testSize = Math.round(sendable.length * TEST_SHARE);
  const test = sendable.slice(0, testSize);
  const test_cells: Record<string, string[]> = Object.fromEntries(variants.map((v) => [v, [] as string[]]));
  test.forEach((id, i) => test_cells[variants[i % variants.length]].push(id));
  return { holdout, test_cells, rest: sendable.slice(testSize) };
}
