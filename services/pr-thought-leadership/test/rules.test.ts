import { describe, expect, it } from "vitest";
import {
  canPitch, crisisLevel, execPostFailures, inPitchWindow, isOptOut, mayFollowUp, pausesAllServices,
  pitchFailures, postNeedsLegal, requestWorthDrafting, tierFor,
} from "../src/rules.js";
import { marketGroup, marketRules, weekendFor } from "../src/market-rules.js";

const now = new Date("2026-10-22T10:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

describe("who we may pitch", () => {
  it("skips opted-out journalists and anyone pitched in the last 14 days", () => {
    expect(canPitch({ party_id: "j1", do_not_contact: true }, now)).toBe(false);
    expect(canPitch({ party_id: "j1", do_not_contact: false, last_pitched_at: daysAgo(13) }, now)).toBe(false);
    expect(canPitch({ party_id: "j1", do_not_contact: false, last_pitched_at: daysAgo(14) }, now)).toBe(true);
    expect(canPitch({ party_id: "j1", do_not_contact: false }, now)).toBe(true);
  });

  it("reads opt-out replies", () => {
    expect(isOptOut("No more, thanks")).toBe(true);
    expect(isOptOut("Please remove me from your list")).toBe(true);
    expect(isOptOut("Sounds interesting, send the data")).toBe(false);
  });

  it("allows 1 follow-up only, and none after a reply", () => {
    expect(mayFollowUp(0, false)).toBe(true);
    expect(mayFollowUp(1, false)).toBe(false);
    expect(mayFollowUp(0, true)).toBe(false);
  });
});

describe("pitch drafts (T4)", () => {
  const url = "https://www.ft.com/content/abc";
  const ok = { subject: "UK finance teams still close by spreadsheet", body: "Hi Jane, your piece on month-end close. ".repeat(10), references_article_url: url, follow_up: false };

  it("passes a short, personal pitch", () => expect(pitchFailures(ok, [url])).toEqual([]));

  it("fails a long body, a long or 'press release' subject, and no article reference", () => {
    const bad = { ...ok, subject: "Press release: our big news about the brand new product line", body: "word ".repeat(150), references_article_url: "https://x.example/y" };
    const f = pitchFailures(bad, [url]);
    expect(f).toHaveLength(4);
  });

  it("holds follow-ups to under 50 words", () => {
    expect(pitchFailures({ ...ok, follow_up: true, body: "word ".repeat(49) }, [])).toEqual([]);
    expect(pitchFailures({ ...ok, follow_up: true, body: "word ".repeat(50) }, [])).toHaveLength(1);
  });
});

describe("pitch timing by market", () => {
  it("UK: Tuesday 09:00 yes, Monday or Friday no", () => {
    expect(inPitchWindow("GB", 2, "09:00")).toBe(true);
    expect(inPitchWindow("GB", 1, "09:00")).toBe(false);
    expect(inPitchWindow("GB", 2, "11:00")).toBe(false);
  });

  it("GCC weekends: Sunday is a working day in Saudi Arabia but the weekend in the UAE", () => {
    expect(weekendFor("SA")).toEqual(["Friday", "Saturday"]);
    expect(weekendFor("AE")).toEqual(["Saturday", "Sunday"]);
    expect(inPitchWindow("AE", 0, "10:00")).toBe(false);
    expect(inPitchWindow("SA", 4, "10:00")).toBe(true);
    expect(inPitchWindow("SA", 5, "10:00")).toBe(false);
  });

  it("maps codes to market groups", () => {
    expect(["GB", "NL", "AE", "CA-QC", "US", "SG"].map(marketGroup)).toEqual(["UK", "EU", "GCC", "CA", "US", "SG"]);
    expect(() => marketRules("JP")).toThrow(/No PR rules/);
  });
});

describe("executive posts (T7)", () => {
  const post = { text: "Open rates are dead.\nStop reporting them.\n\nHere is why...", hashtags: ["#email"], source_refs: ["memo-12:3"], new_claim_ids: [] };
  it("passes a post with a short hook and a source", () => expect(execPostFailures(post)).toEqual([]));
  it("fails a long hook, 4 hashtags or no source", () => {
    const bad = { ...post, text: "x".repeat(201), hashtags: ["#a", "#b", "#c", "#d"], source_refs: [] };
    expect(execPostFailures(bad)).toHaveLength(3);
  });
  it("sends posts to legal for listed clients or new claims", () => {
    expect(postNeedsLegal(false, post)).toBe(false);
    expect(postNeedsLegal(true, post)).toBe(true);
    expect(postNeedsLegal(false, { new_claim_ids: ["c-9"] })).toBe(true);
  });
});

describe("reactive requests", () => {
  it("drafts only good fits with at least 2 hours left", () => {
    expect(requestWorthDrafting(0.8, new Date(now.getTime() + 3 * 3600000), now)).toBe(true);
    expect(requestWorthDrafting(0.6, new Date(now.getTime() + 3 * 3600000), now)).toBe(false);
    expect(requestWorthDrafting(0.9, new Date(now.getTime() + 3600000), now)).toBe(false);
  });
});

describe("crisis severity (T9.1)", () => {
  const base = { sentiment: "negative" as const, tier: 3, topics: [], fast_growing: false, asks_for_comment: false, national: false };
  it("scores levels 0 to 3", () => {
    expect(crisisLevel({ ...base, sentiment: "neutral" })).toBe(0);
    expect(crisisLevel(base)).toBe(1);
    expect(crisisLevel({ ...base, tier: 2 })).toBe(2);
    expect(crisisLevel({ ...base, asks_for_comment: true })).toBe(2);
    expect(crisisLevel({ ...base, national: true })).toBe(3);
    expect(crisisLevel({ ...base, sentiment: "neutral", topics: ["data_breach"] })).toBe(3);
  });
  it("pauses every service only at level 3", () => {
    expect(pausesAllServices(2)).toBe(false);
    expect(pausesAllServices(3)).toBe(true);
  });
});

describe("media tiers", () => {
  it("uses the market's tier 1 list", () => {
    expect(tierFor("Financial Times", "GB", false)).toBe(1);
    expect(tierFor("Arab News", "SA", false)).toBe(1);
    expect(tierFor("Fintech Weekly", "GB", true)).toBe(2);
    expect(tierFor("Some blog", "GB", false)).toBe(3);
  });
});
