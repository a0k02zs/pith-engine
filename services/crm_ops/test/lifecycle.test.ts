import { describe, expect, it } from "vitest";
import { conversionFor, dataQualityScore, importGateSkips, quintiles, recycleAction, rfmSegment, stageMoveAllowed } from "../src/lifecycle.js";
import { dsrDueDate, followupLanguage, marketGroup, marketOverlay, needsDataTransferCheck } from "../src/markets.js";

const at = new Date("2027-01-15T10:00:00Z");

describe("recycle rules (W8)", () => {
  it("disqualifies a bad fit under 25 and keeps a better fit on the newsletter", () => {
    expect(recycleAction({ reason: "bad_fit", fit: 20, at })).toMatchObject({ stage: "disqualified", suppress_marketing: true, score_feedback: true });
    expect(recycleAction({ reason: "bad_fit", fit: 30, at })).toMatchObject({ stage: "nurture", track: "newsletter", nurture_eligible: true });
  });
  it("puts no budget and bad timing on N5 with a review in 90 days", () => {
    for (const reason of ["no_budget", "bad_timing"] as const) {
      expect(recycleAction({ reason, fit: 45, at })).toMatchObject({ stage: "nurture", track: "N5", review_date: "2027-04-15" });
    }
  });
  it("puts no response and 90 days without activity on N1", () => {
    expect(recycleAction({ reason: "no_response", fit: 45, at }).track).toBe("N1");
    expect(recycleAction({ reason: "inactive_90d", fit: 45, at }).track).toBe("N1");
  });
  it("handles customers, competitors, duplicates and closed-lost deals", () => {
    expect(recycleAction({ reason: "already_customer", fit: 45, at })).toMatchObject({ stage: "customer", flag: "routing_rule_failure", nurture_eligible: false });
    expect(recycleAction({ reason: "competitor", fit: 45, at })).toMatchObject({ stage: "disqualified", suppress_marketing: true });
    expect(recycleAction({ reason: "duplicate", fit: 45, at })).toMatchObject({ stage: "unchanged", merge_review: true });
    expect(recycleAction({ reason: "closed_lost", fit: 45, at })).toMatchObject({ stage: "nurture", track: "N5", owner_task_date: "2027-05-15" });
  });
});

describe("lifecycle stages", () => {
  it("moves forward only, and back only through recycle", () => {
    expect(stageMoveAllowed("lead", "mql")).toBe(true);
    expect(stageMoveAllowed("mql", "sal")).toBe(true);
    expect(stageMoveAllowed("sql", "mql")).toBe(false);
    expect(stageMoveAllowed("sal", "nurture")).toBe(false);
    expect(stageMoveAllowed("sal", "nurture", true)).toBe(true);
    expect(stageMoveAllowed("nurture", "mql")).toBe(true);
    expect(stageMoveAllowed("customer", "disqualified")).toBe(true);
  });
  it("posts the engine conversion kind for each sales stage", () => {
    expect(conversionFor("mql")).toBe("mql");
    expect(conversionFor("customer")).toBe("closed_won");
    expect(conversionFor("lead")).toBeUndefined();
  });
});

describe("B2C and data quality", () => {
  it("maps RFM scores to segments", () => {
    expect(rfmSegment(5, 5, 5)).toBe("champions");
    expect(rfmSegment(4, 3, 1)).toBe("loyal");
    expect(rfmSegment(5, 1, 2)).toBe("promising");
    expect(rfmSegment(2, 4, 3)).toBe("at_risk");
    expect(rfmSegment(1, 1, 5)).toBe("hibernating");
    expect(rfmSegment(2, 1, 1)).toBe("other");
    expect(() => rfmSegment(0, 1, 1)).toThrow();
  });
  it("scores quintiles 1 to 5", () => {
    expect(quintiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it("weights the data quality score 30/20/20/15/15", () => {
    expect(dataQualityScore({ consent: 1, uniqueness: 1, completeness: 1, validity: 1, freshness: 1 })).toBe(100);
    expect(dataQualityScore({ consent: 0.9, uniqueness: 0.99, completeness: 0.8, validity: 0.95, freshness: 0.6 })).toBeCloseTo(86.05, 0);
    expect(() => dataQualityScore({ consent: 2, uniqueness: 1, completeness: 1, validity: 1, freshness: 1 })).toThrow();
  });
  it("lets only a first-party import of 500 rows or fewer skip the import gate", () => {
    expect(importGateSkips(500, false)).toBe(true);
    expect(importGateSkips(501, false)).toBe(false);
    expect(importGateSkips(10, true)).toBe(false);
  });
});

describe("market overlay", () => {
  it("maps countries to engine market groups", () => {
    expect(marketGroup("GB")).toBe("UK");
    expect(marketGroup("CA-QC")).toBe("NA");
    expect(marketGroup("OM")).toBe("GCC");
    expect(marketGroup("PL")).toBe("EU");
    expect(marketGroup("JP")).toBeUndefined();
  });
  it("inherits GCC and EU defaults and adds up engine rules", () => {
    expect(marketOverlay("QA").working_days).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu"]);
    expect(marketOverlay("AE").working_days).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    expect(marketOverlay("FR").engine_rules).toEqual(["EU-ART14", "EU-COOKIE"]);
    expect(marketOverlay("DE").engine_rules).toEqual(["EU-ART14", "EU-COOKIE", "DE-DOI"]);
    expect(marketOverlay("DE").hold_until).toBe("double_opt_in_confirmed");
    expect(() => marketOverlay("JP")).toThrow(/outside/);
  });
  it("applies the Quebec subdivision", () => {
    expect(followupLanguage("CA-QC", "b2b")).toBe("fr-CA");
    expect(followupLanguage("CA", "b2b")).toBe("en-CA");
    expect(marketOverlay("CA-QC").route).toBe("french_speaking_rep_or_ca_queue");
  });
  it("picks the follow-up language by audience in the GCC and by contact in the EU", () => {
    expect(followupLanguage("AE", "b2c")).toBe("ar");
    expect(followupLanguage("SA", "b2b")).toBe("en");
    expect(followupLanguage("NL", "b2b", "nl-NL")).toBe("nl-NL");
  });
  it("gives the DSR deadline and the Saudi data transfer check", () => {
    expect(dsrDueDate("US", at).toISOString().slice(0, 10)).toBe("2027-03-01");
    expect(dsrDueDate("GB", at).toISOString().slice(0, 10)).toBe("2027-02-14");
    expect(needsDataTransferCheck("SA", "eu")).toBe(true);
    expect(needsDataTransferCheck("SA", "sa")).toBe(false);
    expect(needsDataTransferCheck("GB", "eu")).toBe(false);
    expect(needsDataTransferCheck("US", "us")).toBe(false);
  });
});
