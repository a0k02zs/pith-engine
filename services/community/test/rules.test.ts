import { describe, expect, it } from "vitest";
import { marketRules } from "../src/market-rules.js";
import {
  autoReplyTrialPassed,
  championEligible,
  contentCleared,
  effectiveLabel,
  expiryAction,
  grantExpiry,
  grantGaps,
  grantScopes,
  hostMessageOk,
  incentiveAllowed,
  isReviewGating,
  moderationAction,
  nextSendTime,
  paidAdRequirements,
  redTopicsFor,
  replyRoute,
  requestDelayHours,
  requestSkipReasons,
  rightsDealGates,
  widgetNeedsVerificationNote,
  type Grant,
  type RequestContext,
} from "../src/rules.js";

const now = new Date("2026-10-23T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("market rules", () => {
  it("covers every launch market", () => {
    for (const m of ["GB", "SG", "US", "CA", "CA-QC", "AE", "SA", "QA", "KW", "BH", "OM", "NL", "DE", "FR", "IE", "ES"]) {
      expect(marketRules(m).paid_ugc_label, m).toBeTruthy();
    }
  });

  it("falls back to EU_DEFAULT for other EU countries", () => {
    expect(marketRules("IE").group).toBe("EU");
    expect(marketRules("IE").review_widget_verification_note).toBe(true);
  });

  it("inherits GCC rules and overrides the weekend and licence", () => {
    const sa = marketRules("SA");
    expect(sa.group).toBe("GCC");
    expect(sa.extra_sensitive_topics).toContain("religion");
    expect(sa.weekend).toEqual(["fri", "sat"]);
    expect(sa.paid_post_licence).toBe("mawthooq");
  });

  it("applies the Quebec subdivision", () => {
    expect(marketRules("CA-QC").paid_ugc_label).toBe("#pub");
    expect(marketRules("CA").paid_ugc_label).toBe("#ad");
  });

  it("throws for a market with no rules", () => {
    expect(() => marketRules("JP")).toThrow(/No community rules/);
  });
});

describe("review requests", () => {
  const base: RequestContext = {
    platform: "google",
    channel: "email",
    consentBasis: "consent",
    openTicket: false,
    alreadyReviewed: false,
    optedOut: false,
    now,
  };

  it("clamps the learned delay to 50% either way", () => {
    expect(requestDelayHours("ecommerce")).toBe(168);
    expect(requestDelayHours("ecommerce", 10)).toBe(84);
    expect(requestDelayHours("ecommerce", 1000)).toBe(252);
    expect(requestDelayHours("ecommerce", 200)).toBe(200);
  });

  it("lets a clean request through", () => {
    expect(requestSkipReasons(base, marketRules("GB"))).toEqual([]);
  });

  it("blocks Yelp asks and sends Amazon to the native request", () => {
    expect(requestSkipReasons({ ...base, platform: "Yelp" }, marketRules("US"))).toContain("platform_forbids_asks");
    expect(requestSkipReasons({ ...base, platform: "amazon" }, marketRules("US"))).toContain("use_platform_native_request");
  });

  it("skips opted-out, reviewed, open-ticket and recent contacts", () => {
    const r = requestSkipReasons({ ...base, optedOut: true, alreadyReviewed: true, openTicket: true, lastRequestAt: days(-30) }, marketRules("GB"));
    expect(r).toEqual(expect.arrayContaining(["opted_out", "already_reviewed", "open_ticket", "asked_recently"]));
    expect(requestSkipReasons({ ...base, lastRequestAt: days(-91) }, marketRules("GB"))).toEqual([]);
  });

  it("checks the consent basis per market and channel", () => {
    expect(requestSkipReasons({ ...base, consentBasis: "soft_opt_in" }, marketRules("GB"))).toEqual([]);
    expect(requestSkipReasons({ ...base, consentBasis: "soft_opt_in" }, marketRules("DE"))).toContain("no_consent_basis");
    expect(requestSkipReasons({ ...base, channel: "sms", consentBasis: "consent" }, marketRules("US"))).toContain("no_consent_basis");
    expect(requestSkipReasons({ ...base, channel: "sms", consentBasis: "prior_express_written" }, marketRules("US"))).toEqual([]);
    expect(requestSkipReasons({ ...base, channel: "in_app", consentBasis: null }, marketRules("DE"))).toEqual([]);
  });

  it("needs a clean DNC check for Singapore SMS", () => {
    const sms = { ...base, channel: "sms" as const };
    expect(requestSkipReasons(sms, marketRules("SG"))).toContain("dnc_listed");
    expect(requestSkipReasons({ ...sms, dncListed: false }, marketRules("SG"))).toEqual([]);
  });

  it("moves a send out of local quiet hours", () => {
    // 21:30 in London (BST ends 25 Oct 2026, so UTC+1) moves to 09:00 next day.
    const t = nextSendTime(new Date("2026-10-23T20:30:00Z"), "Europe/London");
    expect(t.toISOString()).toBe("2026-10-24T08:00:00.000Z");
    const day = new Date("2026-10-23T10:00:00Z");
    // 21:00 in Singapore (UTC+8) moves to 09:00 next day.
    expect(nextSendTime(new Date("2026-10-23T13:00:00Z"), "Asia/Singapore").toISOString()).toBe("2026-10-24T01:00:00.000Z");
    expect(nextSendTime(day, "Europe/London").toISOString()).toBe(day.toISOString());
  });

  it("flags review gating and banned incentives", () => {
    expect(isReviewGating({ 1: true, 2: true, 3: true, 4: true, 5: true })).toBe(false);
    expect(isReviewGating({ 1: false, 2: false, 3: true, 4: true, 5: true })).toBe(true);
    expect(incentiveAllowed({ platform: "Google", sameForAnyRating: true, disclosedInReview: true })).toBe(false);
    expect(incentiveAllowed({ platform: "feefo", sameForAnyRating: true, disclosedInReview: true })).toBe(true);
    expect(incentiveAllowed({ platform: "feefo", sameForAnyRating: false, disclosedInReview: true })).toBe(false);
  });
});

describe("review replies", () => {
  const ok = { class: "positive", risk: "green", suspected_policy_violation: false } as const;

  it("escalates negative, red and suspected-violation reviews (G4)", () => {
    expect(replyRoute({ ...ok, class: "negative" }, true, 99)).toBe("escalate");
    expect(replyRoute({ ...ok, risk: "red" }, true, 99)).toBe("escalate");
    expect(replyRoute({ ...ok, suspected_policy_violation: true }, true, 99)).toBe("escalate");
  });

  it("sends mixed and amber to a person", () => {
    expect(replyRoute({ ...ok, class: "mixed" }, true, 99)).toBe("human");
    expect(replyRoute({ ...ok, risk: "amber" }, true, 99)).toBe("human");
  });

  it("auto-posts only after the trial and at brand score 85+", () => {
    expect(replyRoute(ok, false, 99)).toBe("human");
    expect(replyRoute(ok, true, 84)).toBe("human");
    expect(replyRoute(ok, true, 85)).toBe("auto");
  });

  it("passes the trial after 30 days with under 10% edits", () => {
    expect(autoReplyTrialPassed({ firstReplyAt: days(-31), repliesApproved: 40, repliesEdited: 3, now })).toBe(true);
    expect(autoReplyTrialPassed({ firstReplyAt: days(-31), repliesApproved: 40, repliesEdited: 4, now })).toBe(false);
    expect(autoReplyTrialPassed({ firstReplyAt: days(-10), repliesApproved: 40, repliesEdited: 0, now })).toBe(false);
    expect(autoReplyTrialPassed({ repliesApproved: 0, repliesEdited: 0, now })).toBe(false);
  });
});

describe("UGC rights", () => {
  const grant: Grant = {
    person_name: "Sam Lee",
    scope: grantScopes("R2"),
    markets: ["GB"],
    channels: ["instagram", "site"],
    starts_at: days(-10).toISOString(),
    expires_at: days(300).toISOString(),
    rights_level: "R2",
  };

  it("gives every grant likeness and adds paid scopes only at R3", () => {
    expect(grantScopes("R1")).toEqual(["likeness", "ugc_reuse"]);
    expect(grantScopes("R3")).toContain("paid_usage");
    expect(grantScopes("R3", true)).toContain("whitelisting");
    expect(grantScopes("R2", true)).not.toContain("whitelisting");
  });

  it("sets expiry from the level", () => {
    const start = new Date("2026-01-15T00:00:00Z");
    expect(grantExpiry("R1", start).toISOString()).toBe("2027-01-15T00:00:00.000Z");
    expect(grantExpiry("R2", start).toISOString()).toBe("2028-01-15T00:00:00.000Z");
  });

  it("covers owned channels at R2 but not paid ads", () => {
    expect(grantGaps(grant, "owned_channel", "GB", "site", now)).toEqual([]);
    expect(grantGaps(grant, "paid_ad", "GB", "site", now)).toEqual(
      expect.arrayContaining(["level R2 does not cover paid_ad", "no paid_usage scope"]),
    );
  });

  it("finds market, channel, date, revocation and minor gaps", () => {
    expect(grantGaps(grant, "owned_channel", "US", "site", now)).toContain("market US not granted");
    expect(grantGaps(grant, "owned_channel", "GB", "tiktok", now)).toContain("channel tiktok not granted");
    expect(grantGaps({ ...grant, starts_at: days(5).toISOString() }, "owned_channel", "GB", "site", now)).toContain("not started");
    expect(grantGaps({ ...grant, expires_at: days(-1).toISOString() }, "owned_channel", "GB", "site", now)).toContain("expired");
    expect(grantGaps({ ...grant, revoked_at: days(-1).toISOString() }, "owned_channel", "GB", "site", now)).toContain("revoked");
    expect(grantGaps({ ...grant, is_minor: true }, "owned_channel", "GB", "site", now)).toContain("minor without guardian evidence");
    expect(grantGaps({ ...grant, is_minor: true, guardian_evidence_ref: "esign:1" }, "owned_channel", "GB", "site", now)).toEqual([]);
  });

  it("clears content only when every person shown has a grant (G8)", () => {
    expect(contentCleared(["Sam Lee"], [grant], "owned_channel", "GB", "site", now)).toBe(true);
    expect(contentCleared(["Sam Lee", "Ana Ruiz"], [grant], "owned_channel", "GB", "site", now)).toBe(false);
    expect(contentCleared([], [grant], "owned_channel", "GB", "site", now)).toBe(false);
  });

  it("warns 30 days before expiry and pulls at expiry or revocation", () => {
    expect(expiryAction({ expires_at: days(60).toISOString() }, now)).toBe("none");
    expect(expiryAction({ expires_at: days(30).toISOString() }, now)).toBe("warn");
    expect(expiryAction({ expires_at: days(0).toISOString() }, now)).toBe("pull");
    expect(expiryAction({ expires_at: null, revoked_at: days(-1).toISOString() }, now)).toBe("pull");
    expect(expiryAction({ expires_at: null }, now)).toBe("none");
  });

  it("needs contract and payout gates for paid deals (G2)", () => {
    expect(rightsDealGates("R1", 0)).toEqual([]);
    expect(rightsDealGates("R3", 0)).toEqual(["contract"]);
    expect(rightsDealGates("R2", 50)).toEqual(["contract", "payout"]);
  });

  it("lists market paperwork for paid UGC ads", () => {
    expect(paidAdRequirements(marketRules("GB"))).toEqual(["label:Ad"]);
    expect(paidAdRequirements(marketRules("AE"))).toEqual(["label:Ad", "licence:uae_media_council_permit", "explicit_face_consent"]);
    expect(paidAdRequirements(marketRules("US"))).toContain("publicity_release");
    expect(paidAdRequirements(marketRules("FR"))).toEqual(["label:Publicité", "ai_media_label_if_edited"]);
  });
});

describe("moderation and community", () => {
  it("never treats paid ad use as green", () => {
    expect(effectiveLabel("green", "paid_ad")).toBe("amber");
    expect(effectiveLabel("green", "organic_repost")).toBe("green");
    expect(moderationAction("green", "paid_ad")).toBe("queue");
  });

  it("hides spam and hides then escalates red items", () => {
    expect(moderationAction("green", "community_live", true)).toBe("hide");
    expect(moderationAction("red", "community_live")).toBe("hide_and_escalate");
    expect(moderationAction("green", "community_live")).toBe("keep");
  });

  it("adds market and brain topics to the red list", () => {
    const t = redTopicsFor(marketRules("AE"), ["recalls"]);
    expect(t).toEqual(expect.arrayContaining(["press", "regulator", "alcohol", "recalls"]));
    expect(new Set(t).size).toBe(t.length);
  });

  it("invites champions on help given, not on reviews", () => {
    expect(championEligible({ membersHelped: 5, guidelineBreaks: 0 })).toBe(true);
    expect(championEligible({ membersHelped: 4, guidelineBreaks: 0 })).toBe(false);
    expect(championEligible({ membersHelped: 9, guidelineBreaks: 1 })).toBe(false);
  });

  it("needs the AI disclosure in the first host message", () => {
    const de = marketRules("DE");
    expect(hostMessageOk("Hallo, ich bin Pip, die KI-Assistenz.", true, de)).toBe(true);
    expect(hostMessageOk("Hi, I am Pip, the AI assistant here.", true, marketRules("GB"))).toBe(true);
    expect(hostMessageOk("Hi, I am Pip.", true, de)).toBe(false);
    expect(hostMessageOk("Hi again.", false, de)).toBe(true);
  });

  it("needs a review verification note on EU widgets only", () => {
    expect(widgetNeedsVerificationNote(marketRules("NL"))).toBe(true);
    expect(widgetNeedsVerificationNote(marketRules("GB"))).toBe(false);
  });
});
