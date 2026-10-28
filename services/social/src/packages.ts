import { readFileSync } from "node:fs";
import { dir } from "./paths.js";

export type PackageName = "starter" | "growth" | "scale";

/** [min, max]; a null max means no upper limit. */
export type Range = [number, number | null];

export interface Package {
  platforms: Range;
  feed_posts_per_week_per_platform: Range;
  stories_per_week_b2c: Range;
  community_hours: "business" | "extended_07_22";
  markets: Range;
}

const data = JSON.parse(readFileSync(dir("config", "packages.json"), "utf8")) as {
  packages: Record<PackageName, Package>;
  kpi_targets: Record<string, Record<string, unknown>>;
};

export const kpiTargets = data.kpi_targets;

export function packageRules(name: PackageName): Package {
  const p = data.packages[name];
  if (!p) throw new Error(`Unknown social package: ${name}`);
  return p;
}

/**
 * Feed slots one account gets in a calendar of `weeks` weeks, as [min, max].
 * The planner picks a count in this range for the `cadence` that calendarProblems checks.
 */
export function feedSlotRange(name: PackageName, weeks = 4): [number, number] {
  const [min, max] = packageRules(name).feed_posts_per_week_per_platform;
  return [min * weeks, (max ?? min) * weeks];
}
