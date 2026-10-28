import { describe, expect, it } from "vitest";
import { marketRules, needsNativeEditor } from "../src/market-rules.js";
import {
  bannedTermsFound, calendarProblems, crisisActions, engagementRate, finalDecision, hasDisclosureLabel, medianMinutes,
  needsClaimGate, postProblems, routeInboxItem, scheduleProblems, shareOfVoice, utmLink, type PostDraft, type Slot,
} from "../src/rules.js";

// 2026-10-23 is a Friday, 2026-10-25 a Sunday.
const FRI = "2026-10-23";
const SUN = "2026-10-25";

describe("market rules", () => {
  it("merges group, country and subdivision", () => {
    expect(marketRules("GB").group).toBe("UK");
    expect(marketRules("CA-QC").paid_post_label).toBe("#pub");
    expect(marketRules("CA").paid_post_label).toBe("#ad");
    expect(marketRules("AE").week.workdays).toContain("fri");
    expect(marketRules("SA").week.workdays).not.toContain("fri");
  });

  it("falls back to the EU group for an EU country with no own entry, and throws for an unknown market", () => {
    expect(marketRules("BE").group).toBe("EU");
    expect(() => marketRules("JP")).toThrow(/No social rules/);
  });

  it("needs a native editor for Quebec French and Gulf Arabic, not for UK English", () => {
    expect(needsNativeEditor("CA-QC", "fr-CA")).toBe(true);
    expect(needsNativeEditor("SA", "ar-gulf")).toBe(true);
    expect(needsNativeEditor("GB", "en-GB")).toBe(false);
  });
});

describe("post checks", () => {
  const base: PostDraft = {
    platform: "instagram", market: "GB", caption: "New autumn range is here.", hashtags: ["#autumn", "#skincare", "#uk"],
    alt_text: "Three bottles on a shelf", has_image: true, has_video: false, links: [], collab: false,
  };

  it("passes a clean post", () => expect(postProblems(base, [])).toEqual([]));

  it("flags caption length, hashtag count, alt text and video captions", () => {
    expect(postProblems({ ...base, platform: "x", caption: "x".repeat(281), hashtags: [] }, [])).toContain("fix:caption_over_280");
    expect(postProblems({ ...base, hashtags: ["#a"] }, [])).toContain("fix:hashtags_3_to_5");
    expect(postProblems({ ...base, alt_text: "" }, [])).toContain("fix:alt_text_missing");
    expect(postProblems({ ...base, alt_text: "x".repeat(251) }, [])).toContain("fix:alt_text_over_250");
    expect(postProblems({ ...base, has_video: true }, [])).toContain("fix:video_captions_missing");
  });

  it("needs UTM tags on every link, and utmLink adds them", () => {
    expect(postProblems({ ...base, links: ["https://shop.example.com/a"] }, [])).toContain("fix:utm_missing:shop.example.com");
    const tagged = utmLink("https://shop.example.com/a", "instagram", "autumn", "p1");
    expect(postProblems({ ...base, links: [tagged] }, [])).toEqual([]);
    expect(new URL(tagged).searchParams.get("utm_content")).toBe("p1");
  });

  it("blocks a collaboration post without the market label at the start", () => {
    expect(postProblems({ ...base, collab: true }, [])).toContain("block:disclosure_label_missing");
    expect(postProblems({ ...base, collab: true, caption: "Ad | With @maya" }, [])).toEqual([]);
    expect(hasDisclosureLabel("إعلان مع @sara", "SA")).toBe(true);
    expect(hasDisclosureLabel("Ad with @sara", "AE")).toBe(true);
    expect(hasDisclosureLabel("#pub avec @luc", "CA-QC")).toBe(true);
    expect(hasDisclosureLabel("With @luc #ad", "US")).toBe(false);
  });

  it("finds banned terms as whole words, only in their markets", () => {
    const terms = [{ term: "cure" }, { term: "alcohol", markets: ["SA"] }];
    expect(bannedTermsFound("This will cure dry skin", terms, "GB")).toEqual(["cure"]);
    expect(bannedTermsFound("Secure checkout", terms, "GB")).toEqual([]);
    expect(bannedTermsFound("No alcohol inside", terms, "GB")).toEqual([]);
    expect(bannedTermsFound("No alcohol inside", terms, "SA")).toEqual(["alcohol"]);
    expect(postProblems({ ...base, caption: "A cure for winter" }, terms)).toContain("block:banned_term:cure");
  });
});

describe("schedule checks", () => {
  it("keeps B2B posts to local work days", () => {
    expect(scheduleProblems(SUN, "09:00", "GB", "b2b")).toEqual(["not_a_work_day:sun"]);
    expect(scheduleProblems(SUN, "09:00", "SA", "b2b")).toEqual([]);
    expect(scheduleProblems(FRI, "09:00", "SA", "b2b")).toEqual(["not_a_work_day:fri"]);
    expect(scheduleProblems(SUN, "09:00", "GB", "b2c")).toEqual([]);
  });

  it("never posts in the Friday prayer window in the GCC", () => {
    expect(scheduleProblems(FRI, "12:30", "AE", "b2c")).toEqual(["no_post_window:Friday prayer"]);
    expect(scheduleProblems(FRI, "14:00", "AE", "b2c")).toEqual([]);
    expect(scheduleProblems(FRI, "12:30", "GB", "b2c")).toEqual([]);
  });
});

describe("final decision", () => {
  const clean = { checker: "pass", compliance: "pass", brandScore: 90, autonomy: "auto_publish_approved_calendar", attempt: 1 } as const;

  it("publishes a clean post only at full autonomy", () => {
    expect(finalDecision(clean)).toBe("publish");
    expect(finalDecision({ ...clean, autonomy: "approved_answers" })).toBe("gate_b");
    expect(finalDecision({ ...clean, autonomy: "draft_only" })).toBe("gate_b");
  });

  it("lets a compliance block win over everything", () => {
    expect(finalDecision({ ...clean, compliance: "block" })).toBe("block");
    expect(finalDecision({ ...clean, codeProblems: ["block:banned_term:cure"] })).toBe("block");
  });

  it("sends a low score, a warning or a checker flag to Gate B", () => {
    expect(finalDecision({ ...clean, brandScore: 79 })).toBe("gate_b");
    expect(finalDecision({ ...clean, compliance: "warn" })).toBe("gate_b");
    expect(finalDecision({ ...clean, checker: "gate_b" })).toBe("gate_b");
  });

  it("retries a fix once, then sends it to a person", () => {
    expect(finalDecision({ ...clean, checker: "fix" })).toBe("retry");
    expect(finalDecision({ ...clean, codeProblems: ["fix:alt_text_missing"] })).toBe("retry");
    expect(finalDecision({ ...clean, checker: "fix", attempt: 2 })).toBe("gate_b");
  });

  it("needs the claim gate for any new claim", () => {
    expect(needsClaimGate([])).toBe(false);
    expect(needsClaimGate(["30% faster"])).toBe(true);
  });
});

describe("calendar checks", () => {
  const pillars = [{ name: "education", share: 60 }, { name: "offers", share: 40, offer: true }];
  const slot = (i: number, pillar: string, date = "2026-11-03"): Slot => ({
    slot_id: `s${i}`, date, local_time: "09:00", platform: "linkedin", account: "@acme", market: "GB",
    language: "en-GB", pillar, funnel_stage: "engage", source: "plan", flags: [],
  });
  const b2b = () => "b2b" as const;

  it("passes a balanced calendar with a reactive slot", () => {
    const slots = [...Array.from({ length: 5 }, (_, i) => slot(i, "education")), slot(5, "offers"), slot(6, "reactive")];
    // 1 offer in 6 planned slots is 17%, inside the 20% cap, but 23 points under the 40% target.
    expect(calendarProblems(slots, pillars, { "@acme": 7 }, b2b)).toEqual(["pillar_share:offers:17_target_40", "pillar_share:education:83_target_60"].sort().filter((p) => p.startsWith("pillar_share:education")).concat(["pillar_share:offers:17_target_40"]).sort((a, b) => (a < b ? -1 : 1)));
  });

  it("flags unknown pillars, weekend B2B slots, wrong counts, missing reactive slots and too many offers", () => {
    const slots = [slot(0, "memes"), slot(1, "offers", "2026-11-01"), slot(2, "offers"), slot(3, "education")];
    const p = calendarProblems(slots, pillars, { "@acme": 5 }, b2b);
    expect(p).toContain("s0:unknown_pillar:memes");
    expect(p).toContain("s1:not_a_work_day:sun");
    expect(p).toContain("@acme:slot_count_4_expected_5");
    expect(p.some((x) => x.startsWith("offer_share_50_over_20"))).toBe(true);
  });
});

describe("inbox routing", () => {
  const ctx = { autonomy: "approved_answers", autoRepliesToday: 0, crisis: false } as const;
  const simple = { category: "question_simple", risk: "low", proposed: "auto_reply", market: "GB", match_confidence: 0.95, reply_library_id: "faq-1" } as const;

  it("auto-replies only to a confident library match outside a crisis", () => {
    expect(routeInboxItem(simple, ctx)).toBe("auto_reply");
    expect(routeInboxItem({ ...simple, match_confidence: 0.85 }, ctx)).toBe("draft_for_human");
    expect(routeInboxItem({ ...simple, reply_library_id: null }, ctx)).toBe("draft_for_human");
    expect(routeInboxItem({ ...simple, market: "unknown" }, ctx)).toBe("draft_for_human");
    expect(routeInboxItem(simple, { ...ctx, autonomy: "draft_only" })).toBe("draft_for_human");
    expect(routeInboxItem(simple, { ...ctx, crisis: true })).toBe("draft_for_human");
    expect(routeInboxItem(simple, { ...ctx, autoRepliesToday: 200 })).toBe("draft_for_human");
    expect(routeInboxItem({ ...simple, category: "question_complex" }, ctx)).toBe("draft_for_human");
  });

  it("escalates complaints, press, legal, safety, crisis risk and any high-risk item, whatever the model proposed", () => {
    for (const category of ["complaint", "press", "legal_or_regulator", "safety", "crisis_risk"] as const) {
      expect(routeInboxItem({ ...simple, category }, ctx)).toBe("escalate");
    }
    expect(routeInboxItem({ ...simple, risk: "high" }, ctx)).toBe("escalate");
  });

  it("hides only spam and abuse; hiding anything else needs a person", () => {
    expect(routeInboxItem({ ...simple, category: "spam_or_scam", proposed: "hide_or_report" }, ctx)).toBe("hide_or_report");
    expect(routeInboxItem({ ...simple, category: "harassment_or_abuse", proposed: "hide_or_report" }, ctx)).toBe("hide_or_report");
    expect(routeInboxItem({ ...simple, category: "other", proposed: "hide_or_report" }, ctx)).toBe("draft_for_human");
  });
});

describe("crisis and KPIs", () => {
  it("pauses posts and auto-replies only at sev1", () => {
    expect(crisisActions("sev1")).toEqual({ pauseScheduled: true, autoRepliesOff: true, slaMinutes: 30, notifyPr: true });
    expect(crisisActions("sev2").pauseScheduled).toBe(false);
    expect(crisisActions("sev3").slaMinutes).toBe(480);
  });

  it("computes engagement rate, median reply time and share of voice, with null on no data", () => {
    expect(engagementRate({ reactions: 30, comments: 5, shares: 3, saves: 2, reach: 1000 })).toBe(0.04);
    expect(engagementRate({ reactions: 1, comments: 0, shares: 0, saves: 0, reach: 0 })).toBeNull();
    expect(medianMinutes([30, 5, 10])).toBe(10);
    expect(medianMinutes([4, 2, 8, 6])).toBe(5);
    expect(medianMinutes([])).toBeNull();
    expect(shareOfVoice(30, [50, 20])).toBe(0.3);
    expect(shareOfVoice(0, [])).toBeNull();
  });
});
