import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { checkOverlay, implementedRuleIds, overlay, type OverlayItem } from "../src/overlay.js";
import { engagementRate, firstPassApproval, medianMinutes, prKpis } from "../src/kpis.js";

const pitch: OverlayItem = {
  channel: "press_pitch", market: "GB", language: "en-GB",
  body: "Hi Jane ... Reply \"no more\" and we will not contact you again.",
  client: { is_listed: false, legal_approved: false }, price_sensitive: false,
  sender: { name: "Sam Lee", company: "Pith Marketing" }, recipient_basis: "legitimate_interest",
  claim_ids: ["c-1"], approved_claim_ids: ["c-1"], sensitive_topics: [], last_pitched_days_ago: null,
};

describe("PR compliance overlay", () => {
  it("implements every rule in config/compliance-overlay.json", () => {
    expect(implementedRuleIds().sort()).toEqual(overlay.rules.map((r) => r.id).sort());
  });

  it("is registered as the engine's pr service overlay", () => {
    const rules = JSON.parse(readFileSync(dir("..", "..", "engine", "specs", "compliance-rules.json"), "utf8"));
    expect(rules.service_overlays.pr).toMatch(/^services\/pr-thought-leadership\//);
  });

  it("passes a clean UK pitch", () => expect(checkOverlay(pitch)).toEqual({ outcome: "pass", findings: [] }));

  it("blocks a pitch with no opt-out line or an unapproved claim", () => {
    const r = checkOverlay({ ...pitch, body: "Hi Jane", claim_ids: ["c-1", "c-2"] });
    expect(r.outcome).toBe("block");
    expect(r.findings.map((f) => f.rule_id)).toEqual(["PR-OPTOUT-LINE", "PR-UNAPPROVED-CLAIM"]);
  });

  it("needs a postal address in the US", () => {
    expect(checkOverlay({ ...pitch, market: "US" }).findings.map((f) => f.rule_id)).toEqual(["PR-SENDER-IDENTITY"]);
    expect(checkOverlay({ ...pitch, market: "US", sender: { ...pitch.sender, postal_address: "1 Main St" } }).outcome).toBe("pass");
  });

  it("needs a CASL basis in Canada and warns on English pitches to Quebec", () => {
    expect(checkOverlay({ ...pitch, market: "CA", sender: { ...pitch.sender, postal_address: "1 Bay St" } }).findings.map((f) => f.rule_id)).toEqual(["PR-CASL-BASIS"]);
    const qc = checkOverlay({ ...pitch, market: "CA-QC", recipient_basis: "casl_business_exemption", sender: { ...pitch.sender, postal_address: "1 Rue" } });
    expect(qc).toMatchObject({ outcome: "warn", findings: [{ rule_id: "PR-QC-FRENCH" }] });
  });

  it("blocks price-sensitive content for a listed client until legal approves", () => {
    const listed = { ...pitch, client: { is_listed: true, legal_approved: false }, price_sensitive: true };
    expect(checkOverlay(listed).findings.map((f) => f.rule_id)).toEqual(["PR-LISTED-LEGAL"]);
    expect(checkOverlay({ ...listed, client: { is_listed: true, legal_approved: true } }).outcome).toBe("pass");
  });

  it("blocks political content in Singapore and the GCC, but not in the UK", () => {
    expect(checkOverlay({ ...pitch, market: "SG", sensitive_topics: ["politics"] }).outcome).toBe("block");
    expect(checkOverlay({ ...pitch, market: "AE", sensitive_topics: ["religion"] }).outcome).toBe("block");
    expect(checkOverlay({ ...pitch, sensitive_topics: ["politics"] }).outcome).toBe("pass");
  });

  it("needs a named human editor for EU text", () => {
    expect(checkOverlay({ ...pitch, market: "NL" }).findings.map((f) => f.rule_id)).toEqual(["PR-AI-EDITOR-NAMED"]);
    expect(checkOverlay({ ...pitch, market: "NL", editor_name: "Eva de Vries" }).outcome).toBe("pass");
  });

  it("warns when the journalist was pitched in the last 14 days", () => {
    expect(checkOverlay({ ...pitch, last_pitched_days_ago: 3 }).outcome).toBe("warn");
  });
});

describe("KPIs", () => {
  const row = (o: Partial<Parameters<typeof prKpis>[0][number]>) => ({ tier: 2, subject: "client" as const, sentiment: "neutral" as const, messages_pulled_through: [], backlink: "none" as const, ...o });
  it("computes coverage and pitch KPIs", () => {
    const k = prKpis(
      [row({ tier: 1, sentiment: "positive", messages_pulled_through: ["m1"], backlink: "follow" }), row({ sentiment: "negative" }), row({ sentiment: "positive", backlink: "nofollow" }), row({ subject: "competitor" })],
      { sent: 40, replied: 8, placed_within_30d: 2 },
    );
    expect(k).toEqual({
      media_mentions_tier1: 1, "pr.media_mentions": 3, share_of_voice: 0.75, "pr.sentiment_net": 1 / 3,
      "pr.message_pull_through": 1 / 3, "pr.backlinks_earned": 2, reply_rate: 0.2, "pr.placement_rate": 0.05,
    });
  });
  it("returns null ratios when there is no data", () => {
    expect(prKpis([], { sent: 0, replied: 0, placed_within_30d: 0 }).reply_rate).toBeNull();
    expect(medianMinutes([])).toBeNull();
  });
  it("computes median, engagement and first-pass approval", () => {
    expect(medianMinutes([90, 30, 60, 240])).toBe(75);
    expect(engagementRate({ reactions: 40, comments: 8, reposts: 2, impressions: 1000 })).toBe(0.05);
    expect(firstPassApproval(["approved", "approved", "changes_requested", "rejected"])).toBe(0.5);
  });
});
