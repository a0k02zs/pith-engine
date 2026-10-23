import { describe, expect, it } from "vitest";
import { mayFireBeforeConsent, MIN_CELL_SIZE, rulesFor, suppressSmallCells } from "../src/market-rules.js";

describe("market rules", () => {
  it("puts each dataset in the main market's region", () => {
    expect(rulesFor("GB").warehouse_region).toBe("europe-west2");
    expect(rulesFor("SG").warehouse_region).toBe("asia-southeast1");
    expect(rulesFor("US").warehouse_region).toBe("US");
    expect(rulesFor("CA").warehouse_region).toBe("northamerica-northeast1");
    expect(rulesFor("SA").warehouse_region).toBe("me-central2");
    expect(rulesFor("DE").warehouse_region).toBe("EU");
  });

  it("blocks analytics and marketing tags before consent in the UK, the EU and Quebec", () => {
    for (const m of ["GB", "FR", "CA-QC"]) {
      expect(mayFireBeforeConsent(m, "analytics")).toBe(false);
      expect(mayFireBeforeConsent(m, "marketing")).toBe(false);
      expect(mayFireBeforeConsent(m, "necessary")).toBe(true);
    }
    expect(mayFireBeforeConsent("US", "marketing")).toBe(true);
    expect(mayFireBeforeConsent("CA", "analytics")).toBe(true);
  });

  it("inherits GCC rules and keeps the local currency", () => {
    expect(rulesFor("AE")).toMatchObject({ group: "gcc", currency: "AED", week_starts: "mon", ramadan_controls: true });
    expect(rulesFor("QA")).toMatchObject({ currency: "QAR", week_starts: "sun" });
    expect(rulesFor("SA").data_transfer_check).toBe(true);
  });

  it("has no geo test units in Singapore", () => expect(rulesFor("SG").geo_test_units).toBeNull());

  it("throws for a market it does not know", () => expect(() => rulesFor("JP")).toThrow(/No analytics rules/));

  it("hides groups under 20 people", () => {
    expect(MIN_CELL_SIZE).toBe(20);
    expect(suppressSmallCells([{ people: 19 }, { people: 20 }])).toEqual([{ people: 20 }]);
  });
});
