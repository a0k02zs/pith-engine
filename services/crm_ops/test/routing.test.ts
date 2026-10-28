import { describe, expect, it } from "vitest";
import { addBusinessMinutes, inBusinessHours, routeLead, slaTimers, type Rep } from "../src/routing.js";

const london = { timeZone: "Europe/London", market: "GB" };
const riyadh = { timeZone: "Asia/Riyadh", market: "SA" };
const dubai = { timeZone: "Asia/Dubai", market: "AE" };

describe("business time", () => {
  it("knows the local working week: Sunday works in Riyadh, Friday works in Dubai", () => {
    expect(inBusinessHours(new Date("2027-01-17T07:00:00Z"), riyadh)).toBe(true); // Sun 10:00
    expect(inBusinessHours(new Date("2027-01-15T07:00:00Z"), riyadh)).toBe(false); // Fri 10:00
    expect(inBusinessHours(new Date("2027-01-15T06:00:00Z"), dubai)).toBe(true); // Fri 10:00
    expect(inBusinessHours(new Date("2027-01-17T06:00:00Z"), dubai)).toBe(false); // Sun 10:00
    expect(inBusinessHours(new Date("2027-01-15T17:00:00Z"), london)).toBe(false); // Fri 17:00 is closed
  });
  it("skips the weekend and holidays", () => {
    const fri = new Date("2027-01-15T16:58:00Z");
    expect(addBusinessMinutes(fri, 5, london).toISOString()).toBe("2027-01-18T09:03:00.000Z");
    expect(addBusinessMinutes(fri, 5, { ...london, holidays: ["2027-01-18"] }).toISOString()).toBe("2027-01-19T09:03:00.000Z");
  });
  it("starts the clock at the next business hour for a lead after hours", () => {
    expect(addBusinessMinutes(new Date("2027-01-13T22:00:00Z"), 5, london).toISOString()).toBe("2027-01-14T09:05:00.000Z");
    expect(addBusinessMinutes(new Date("2027-01-14T06:00:00Z"), 5, london).toISOString()).toBe("2027-01-14T09:05:00.000Z");
  });
  it("handles a summer time change", () => {
    // Fri 26 March 2027 16:58 GMT; clocks go forward on Sunday 28 March, so Monday 09:03 is 08:03 UTC.
    expect(addBusinessMinutes(new Date("2027-03-26T16:58:00Z"), 5, london).toISOString()).toBe("2027-03-29T08:03:00.000Z");
  });
});

describe("SLA timers", () => {
  it("gives a hot lead 5, 15 and 60 business minutes", () => {
    const t = slaTimers("A", new Date("2027-01-14T10:00:00Z"), london);
    expect(t).toEqual({
      sla_due_at: "2027-01-14T10:05:00.000Z", sla_escalate_1: "2027-01-14T10:15:00.000Z", sla_escalate_2: "2027-01-14T11:00:00.000Z", in_business_hours: true,
    });
  });
  it("gives a warm lead in Saudi Arabia 4, 8 and 16 business hours over the Friday-Saturday weekend", () => {
    // Thu 14 Jan 16:00 Riyadh: 1 hour on Thursday, then Sunday and Monday.
    const t = slaTimers("B", new Date("2027-01-14T13:00:00Z"), riyadh);
    expect(t.sla_due_at).toBe("2027-01-17T09:00:00.000Z"); // Sun 12:00
    expect(t.sla_escalate_1).toBe("2027-01-17T13:00:00.000Z"); // Sun 16:00
    expect(t.sla_escalate_2).toBe("2027-01-18T13:00:00.000Z"); // Mon 16:00 = 2 business days
  });
  it("counts Friday in the UAE", () => {
    expect(slaTimers("B", new Date("2027-01-14T12:00:00Z"), dubai).sla_due_at).toBe("2027-01-15T08:00:00.000Z"); // Fri 12:00
  });
  it("marks an after-hours hot lead for the auto-reply", () => {
    expect(slaTimers("A", new Date("2027-01-13T22:00:00Z"), london).in_business_hours).toBe(false);
  });
  it("has no SLA for grades C and D", () => {
    expect(() => slaTimers("C", new Date(), london)).toThrow();
  });
});

describe("routing", () => {
  const at = new Date("2027-01-14T10:00:00Z"); // Thursday
  const rep = (id: string, queues: string[], timeZone: string, extra: Partial<Rep> = {}): Rep => ({ id, queues, languages: ["en"], timeZone, ...extra });
  const reps: Rep[] = [
    rep("uk1", ["UK"], "Europe/London", { last_assigned_at: "2027-01-14T09:00:00Z" }),
    rep("uk2", ["UK"], "Europe/London", { last_assigned_at: "2027-01-14T08:00:00Z" }),
    rep("uk3", ["UK"], "Europe/London", { on_leave: true }),
    rep("ent1", ["enterprise"], "Europe/London"),
    rep("na1", ["NA"], "America/Toronto"),
    rep("qc1", ["NA"], "America/Toronto", { languages: ["en", "fr"] }),
    rep("gcc1", ["GCC"], "Asia/Dubai"),
    rep("gcc2", ["GCC"], "Asia/Riyadh", { languages: ["en", "ar"], last_assigned_at: "2027-01-14T09:30:00Z" }),
    rep("sg1", ["SG"], "Asia/Singapore"),
  ];
  it("keeps the account owner first, then the ABM tier 1 owner", () => {
    expect(routeLead({ market: "GB", account_owner_id: "own1", abm_tier: 1, abm_owner_id: "abm1" }, reps, at)).toEqual({ owner_id: "own1", rule: "account_owner" });
    expect(routeLead({ market: "GB", abm_tier: 1, abm_owner_id: "abm1" }, reps, at)).toEqual({ owner_id: "abm1", rule: "abm_tier1" });
    expect(routeLead({ market: "GB", abm_tier: 2, abm_owner_id: "abm1" }, reps, at).rule).toBe("regional");
  });
  it("sends Quebec to a French-speaking rep, else the Canada queue", () => {
    const qcAt = new Date("2027-01-14T15:00:00Z"); // 10:00 Toronto
    expect(routeLead({ market: "CA-QC" }, reps, qcAt)).toMatchObject({ owner_id: "qc1", rule: "quebec" });
    expect(routeLead({ market: "CA-QC" }, reps.filter((r) => r.id !== "qc1"), qcAt)).toMatchObject({ owner_id: "na1", rule: "quebec" });
  });
  it("sends Saudi leads to an Arabic-speaking GCC rep, other GCC leads to the queue", () => {
    expect(routeLead({ market: "SA" }, reps, at)).toMatchObject({ owner_id: "gcc2", rule: "gcc" });
    expect(routeLead({ market: "AE" }, reps, at)).toMatchObject({ owner_id: "gcc1", rule: "gcc" });
  });
  it("sends enterprise-size companies to the enterprise team", () => {
    expect(routeLead({ market: "GB", company_size_band: "5000+" }, reps, at, ["5000+"])).toMatchObject({ owner_id: "ent1", rule: "enterprise" });
  });
  it("round-robins the regional queue by oldest assignment and skips reps on leave", () => {
    expect(routeLead({ market: "GB" }, reps, at)).toMatchObject({ owner_id: "uk2", queue: "UK", rule: "regional" });
    expect(routeLead({ market: "GB" }, reps.filter((r) => r.id !== "uk2"), at)).toMatchObject({ owner_id: "uk1" });
  });
  it("prefers reps in working hours and falls back to the oldest-assigned rep", () => {
    const night = new Date("2027-01-14T23:00:00Z");
    expect(routeLead({ market: "GB" }, reps, night)).toMatchObject({ owner_id: "uk2", out_of_hours_fallback: true });
    const mixed = [rep("sgA", ["SG"], "Asia/Singapore", { last_assigned_at: "2027-01-01T00:00:00Z" }), rep("sgB", ["SG"], "Europe/London")];
    expect(routeLead({ market: "SG" }, mixed, new Date("2027-01-14T10:00:00Z"))).toMatchObject({ owner_id: "sgB" });
  });
  it("fails loudly with no rep or a market outside the 5", () => {
    expect(() => routeLead({ market: "NL" }, reps, at)).toThrow(/No active rep in queue EU/);
    expect(() => routeLead({ market: "JP" }, reps, at)).toThrow(/outside/);
  });
});
