import { describe, expect, it } from "vitest";
import { feedSlotRange, kpiTargets, packageRules } from "../src/packages.js";

describe("packages", () => {
  it("gives each package its feed slot range for a 4-week calendar", () => {
    expect(feedSlotRange("starter")).toEqual([12, 12]);
    expect(feedSlotRange("growth")).toEqual([16, 20]);
    expect(feedSlotRange("scale")).toEqual([20, 28]);
    expect(feedSlotRange("growth", 5)).toEqual([20, 25]);
  });

  it("keeps extended community hours for Scale only", () => {
    expect(packageRules("starter").community_hours).toBe("business");
    expect(packageRules("scale").community_hours).toBe("extended_07_22");
  });

  it("throws for an unknown package", () => {
    expect(() => packageRules("enterprise" as never)).toThrow(/Unknown social package/);
  });

  it("holds the starting KPI targets the gates rely on", () => {
    expect(kpiTargets.brand_score).toEqual({ median_min: 85, floor_without_person: 80 });
    expect(kpiTargets.median_reply_minutes.max).toBe(120);
    expect(kpiTargets["social.first_pass_acceptance"].min).toBe(0.9);
  });
});
