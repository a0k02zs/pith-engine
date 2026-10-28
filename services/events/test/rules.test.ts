import { describe, expect, it } from "vitest";
import {
  boothFollowUpScope, engagementScore, followUpDeadline, followUpSendTime, handOffDue, impliedConsentExpiry, isGoodSessionDay,
  marketRules, mayShareWithCoHost, medianFollowUpMinutes, onlyMergeFieldsChanged, pacingStatus, routeQuestion, scoreRecords,
  sessionStarts, smsReminderAllowed, unknownMergeFields, zonedTimeToUtc, type AttendeeRecord,
} from "../src/index.js";

const iso = (d: Date) => d.toISOString().slice(0, 16) + "Z";
const at = (s: string) => new Date(s);

// 2027-03-08 is a Monday. UK clocks go forward on 2027-03-28, US clocks on 2027-03-14.
describe("market rules", () => {
  it("resolves inheritance, EU countries and subdivisions", () => {
    expect(marketRules("KW").weekend).toEqual(["fri", "sat"]);
    expect(marketRules("KW").timezone).toBe("Asia/Kuwait");
    expect(marketRules("FR").timezone).toBe("Europe/Amsterdam");
    expect(marketRules("DE").date_format).toBe("DD.MM.YYYY");
    expect(marketRules("CA-QC").languages).toEqual(["fr-CA"]);
    expect(marketRules("CA").sms_reminder_basis).toEqual(["express_casl"]);
    expect(() => marketRules("ZZ")).toThrow(/No events rules/);
  });
});

describe("session planning", () => {
  it("uses each market's weekend and best days", () => {
    expect(isGoodSessionDay("2027-03-09", "GB")).toBe(true); // Tue
    expect(isGoodSessionDay("2027-03-08", "GB")).toBe(false); // Mon is not a best day
    expect(isGoodSessionDay("2027-03-08", "SA")).toBe(true); // Mon is a GCC best day
    expect(isGoodSessionDay("2027-03-12", "AE")).toBe(false); // Fri
    expect(isGoodSessionDay("2027-03-14", "SA")).toBe(false); // Sun: a work day in SA, but not a best day
  });

  it("turns local session slots into UTC, across daylight saving changes", () => {
    expect(sessionStarts("2027-03-09", "GB").map(iso)).toEqual(["2027-03-09T10:00Z", "2027-03-09T14:00Z"]);
    expect(sessionStarts("2027-03-30", "GB").map(iso)).toEqual(["2027-03-30T09:00Z", "2027-03-30T13:00Z"]);
    expect(sessionStarts("2027-03-09", "US").map(iso)[0]).toBe("2027-03-09T16:00Z");
    expect(sessionStarts("2027-03-16", "US").map(iso)[0]).toBe("2027-03-16T15:00Z");
    expect(sessionStarts("2027-03-09", "SG").map(iso)).toEqual(["2027-03-09T02:00Z", "2027-03-09T07:00Z"]);
  });

  it("uses the Ramadan slots in the GCC when asked", () => {
    expect(sessionStarts("2027-02-16", "AE", true).map(iso)).toEqual(["2027-02-16T06:30Z", "2027-02-16T17:00Z"]);
    expect(sessionStarts("2027-02-16", "GB", true).map(iso)).toEqual(["2027-02-16T10:00Z", "2027-02-16T14:00Z"]);
  });

  it("converts a wall-clock time in a time zone", () => {
    expect(iso(zonedTimeToUtc("2027-07-01", "09:00", "Asia/Riyadh"))).toBe("2027-07-01T06:00Z");
  });
});

describe("registration pacing", () => {
  it("is on track from 90%, at risk from 60%, off track below", () => {
    expect(pacingStatus(90, 100)).toBe("on_track");
    expect(pacingStatus(89, 100)).toBe("at_risk");
    expect(pacingStatus(60, 100)).toBe("at_risk");
    expect(pacingStatus(59, 100)).toBe("off_track");
    expect(pacingStatus(0, 0)).toBe("on_track");
  });
});

describe("engagement score and segments", () => {
  const base: AttendeeRecord = {
    contact_id: "c", attended_live: true, live_minutes: 45, replay_minutes: 0, session_minutes: 45,
    asked_question: true, answered_poll: true, clicked_resource: true, hand_raise: false, fit: "C",
  };

  it("adds the weights and caps watch time at the session length", () => {
    expect(engagementScore(base)).toBe(75);
    expect(engagementScore({ ...base, replay_minutes: 45 })).toBe(75);
    expect(engagementScore({ ...base, hand_raise: true })).toBe(100);
    expect(engagementScore({ ...base, attended_live: false, live_minutes: 0, replay_minutes: 30, asked_question: false, answered_poll: false, clicked_resource: false })).toBe(17);
  });

  it("puts each person in 1 segment, and makes an ABM account fit A", () => {
    const records: AttendeeRecord[] = [
      { ...base, contact_id: "engaged_c" },
      { ...base, contact_id: "hot_b", fit: "B" },
      { ...base, contact_id: "hot_abm", company_id: "acme" },
      { ...base, contact_id: "raised", attended_live: false, live_minutes: 0, hand_raise: true },
      { ...base, contact_id: "replay", attended_live: false, live_minutes: 0, replay_minutes: 20 },
      { ...base, contact_id: "absent", attended_live: false, live_minutes: 0, asked_question: false, answered_poll: false, clicked_resource: false },
    ];
    const out = Object.fromEntries(scoreRecords(records, ["acme"]).map((r) => [r.contact_id, [r.segment, r.fit]]));
    expect(out).toEqual({
      engaged_c: ["engaged", "C"], hot_b: ["hot", "B"], hot_abm: ["hot", "A"],
      raised: ["hot", "C"], replay: ["on_demand", "C"], absent: ["no_show", "C"],
    });
  });
});

describe("follow-up within 24 hours", () => {
  it("sends 30 minutes after the end when that is in local business hours", () => {
    expect(iso(followUpSendTime(at("2027-03-09T15:00Z"), "GB"))).toBe("2027-03-09T15:30Z");
  });

  it("waits for the next business morning when it is inside 24 hours", () => {
    // Thu 17:00 in Dubai; Fri is a work day in the UAE
    expect(iso(followUpSendTime(at("2027-03-11T13:00Z"), "AE"))).toBe("2027-03-12T05:00Z");
  });

  it("keeps the 24-hour promise over a weekend: sends at the deadline minus 1 hour", () => {
    // Thu 17:00 in Riyadh; Fri is the weekend in Saudi Arabia
    expect(iso(followUpSendTime(at("2027-03-11T14:00Z"), "SA"))).toBe("2027-03-12T13:00Z");
    // Fri 17:30 in London
    const end = at("2027-03-12T17:30Z");
    const send = followUpSendTime(end, "GB");
    expect(iso(send)).toBe("2027-03-13T16:30Z");
    expect(send < followUpDeadline(end)).toBe(true);
  });

  it("reports the median minutes to first follow-up", () => {
    const end = at("2027-03-09T15:00Z");
    expect(medianFollowUpMinutes(end, [at("2027-03-09T15:30Z"), at("2027-03-09T16:00Z"), at("2027-03-10T09:00Z")])).toBe(60);
    expect(medianFollowUpMinutes(end, [at("2027-03-09T15:30Z"), at("2027-03-09T16:30Z")])).toBe(60);
    expect(medianFollowUpMinutes(end, [])).toBeNull();
  });
});

describe("hand-off to sales in business hours", () => {
  it("is due 4 business hours after a webinar, skipping the night", () => {
    // Tue 15:00 London: 2.5 h on Tue, 1.5 h on Wed
    expect(iso(handOffDue(at("2027-03-09T15:00Z"), "GB"))).toBe("2027-03-10T10:30Z");
  });

  it("is due 8 business hours after a trade show, skipping the weekend", () => {
    // Fri 16:30 London: 1 h on Fri, 7 h on Mon
    expect(iso(handOffDue(at("2027-03-12T16:30Z"), "GB", "trade_show"))).toBe("2027-03-15T16:00Z");
  });
});

describe("the template skip rule", () => {
  const template = "Hi {{first_name}},\nThanks for joining {{session_title}} (live, 45 min?).\n{{questions_block}}\nReplay: {{replay_url}}";

  it("is true when only the merge fields are filled in", () => {
    const filled = "Hi Sam,\nThanks for joining Close faster (live, 45 min?).\n\nReplay: https://x.io/r";
    expect(onlyMergeFieldsChanged(template, filled)).toBe(true);
  });

  it("is false when text outside the merge fields changes", () => {
    expect(onlyMergeFieldsChanged(template, "Hi Sam,\nThank you for joining Close faster (live, 45 min?).\n\nReplay: x")).toBe(false);
    expect(onlyMergeFieldsChanged(template, "Hi Sam,\nThanks for joining Close faster (live, 45 min?).\n\nReplay: x\nP.S. 50% off today")).toBe(false);
  });

  it("finds merge fields that are not on the approved list", () => {
    expect(unknownMergeFields(template)).toEqual([]);
    expect(unknownMergeFields("Use {{discount_code}} by {{ first_name }}")).toEqual(["discount_code"]);
  });
});

describe("event consent rules", () => {
  it("never treats a badge scan as consent where the market asks at the booth", () => {
    expect(boothFollowUpScope("DE", null)).toBe("requested_only");
    expect(boothFollowUpScope("DE", true)).toBe("marketing");
    expect(boothFollowUpScope("SG", false)).toBe("requested_only");
    expect(boothFollowUpScope("AE", true)).toBe("marketing");
    expect(boothFollowUpScope("US", null)).toBe("marketing");
    expect(boothFollowUpScope("GB", null)).toBe("marketing");
  });

  it("shares registrants with a co-host only with the partner opt-in where the market needs it", () => {
    expect(mayShareWithCoHost("GB", false)).toBe(false);
    expect(mayShareWithCoHost("GB", true)).toBe(true);
    expect(mayShareWithCoHost("US", false)).toBe(true);
    expect(mayShareWithCoHost("CA", false)).toBe(false);
  });

  it("sends an SMS reminder only on a consent basis the market accepts, after a DNC check in Singapore", () => {
    expect(smsReminderAllowed("US", "consent", null)).toBe(false);
    expect(smsReminderAllowed("US", "prior_express_written", null)).toBe(true);
    expect(smsReminderAllowed("CA", "express_casl", null)).toBe(true);
    expect(smsReminderAllowed("SG", "consent", null)).toBe(false);
    expect(smsReminderAllowed("SG", "consent", true)).toBe(false);
    expect(smsReminderAllowed("SG", "consent", false)).toBe(true);
    expect(smsReminderAllowed("NL", "double_opt_in", null)).toBe(true);
  });

  it("ends CASL implied consent 183 days after a registration in Canada only", () => {
    expect(iso(impliedConsentExpiry("CA", at("2027-01-01T00:00Z"))!)).toBe("2027-07-03T00:00Z");
    expect(impliedConsentExpiry("CA-QC", at("2027-01-01T00:00Z"))).not.toBeNull();
    expect(impliedConsentExpiry("GB", at("2027-01-01T00:00Z"))).toBeNull();
  });
});

describe("live Q&A routing (engine G4)", () => {
  const t = { class: "product", escalate: false, draft_answer: "Yes, it exports to CSV.", needs_live_speaker: false };

  it("escalates complaint, press, legal and abuse questions even when the agent did not", () => {
    for (const c of ["complaint", "press", "legal_or_regulatory", "abuse"]) expect(routeQuestion({ ...t, class: c })).toBe("escalate");
    expect(routeQuestion({ ...t, escalate: true })).toBe("escalate");
  });

  it("sends a question to the speaker when there is no draft or it needs them, else to the moderator", () => {
    expect(routeQuestion({ ...t, draft_answer: " " })).toBe("speaker");
    expect(routeQuestion({ ...t, needs_live_speaker: true })).toBe("speaker");
    expect(routeQuestion(t)).toBe("moderator");
  });
});
