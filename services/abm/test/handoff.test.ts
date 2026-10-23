import { describe, expect, it } from "vitest";
import { handoffCheck, type AccountState } from "../src/handoff.js";

const now = new Date("2026-10-22T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

const hot: AccountState = {
  account_id: "acc_1",
  intentSignals: [
    { type: "topic_surge", points: 30, observedAt: now },
    { type: "buying_page_visit", points: 25, observedAt: now },
    { type: "hiring", points: 15, observedAt: now },
  ],
  engagementSignals: [
    { type: "meeting_accepted", contactId: "c1", at: daysAgo(2) },
    { type: "reply", contactId: "c2", at: daysAgo(3) },
  ],
  openOpportunity: false,
  handoffPending: false,
};

describe("sales hand-off check (gate G5 trigger)", () => {
  it("is ready when intent, engagement and 2 engaged people all pass", () => {
    const r = handoffCheck(hot, now);
    expect(r.engagement).toBe(40);
    expect(r.engagedContacts14d).toBe(2);
    expect(r.intent).toBeGreaterThanOrEqual(70);
    expect(r.ready).toBe(true);
  });

  it("is not ready with 1 engaged person, and says why", () => {
    const r = handoffCheck({ ...hot, engagementSignals: [{ type: "meeting_accepted", contactId: "c1", at: daysAgo(2) }, { type: "reply", contactId: "c1", at: daysAgo(1) }] }, now);
    expect(r.ready).toBe(false);
    expect(r.reasons).toContain("1 engaged contacts < 2");
  });

  it("never hands off an account with an open opportunity or a pending hand-off", () => {
    expect(handoffCheck({ ...hot, openOpportunity: true }, now).ready).toBe(false);
    expect(handoffCheck({ ...hot, handoffPending: true }, now).ready).toBe(false);
  });
});
