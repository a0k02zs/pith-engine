import { describe, expect, it } from "vitest";
import { createValidator, validateOutput } from "../src/registry.js";

const fee = { low: 400, high: 650, currency: "GBP", basis: "estimate" };

describe("output schemas", () => {
  it("registers the 10 influencer schemas", () => {
    const ajv = createValidator();
    for (const n of ["campaign_plan", "creator_longlist", "creator_vetting", "shortlist", "outreach_message", "deal_summary", "creator_brief", "content_checks", "payout_request", "weekly_report"]) {
      expect(ajv.getSchema(`influencer/${n}@1`), n).toBeDefined();
    }
  });

  it("accepts a campaign plan and needs 3 to 5 KPIs", () => {
    const plan = {
      play: "product_seeding",
      markets: [{ market: "GB", platforms: ["instagram", "tiktok"], creators: 10, tier_mix: { nano: 6, micro: 4, mid: 0, macro: 0, mega: 0, expert: 0 } }],
      budget_split: { creator_fees: 6000, product: 1500, shipping: 300, amplification: 1300, contingency: 1000, currency: "GBP" },
      timeline: [{ stage: "discover", start: "2026-11-02", end: "2026-11-04" }],
      kpis: [{ name: "roas", target: 2, basis: "estimate" }, { name: "cpa", target: 25, basis: "estimate" }, { name: "engagement_rate", target: 0.04, basis: "estimate" }],
      questions: [], needs_human: [], missing_data: [],
    };
    expect(validateOutput("influencer/campaign_plan@1", plan).valid).toBe(true);
    expect(validateOutput("influencer/campaign_plan@1", { ...plan, kpis: plan.kpis.slice(0, 2) }).valid).toBe(false);
    expect(validateOutput("influencer/campaign_plan@1", { ...plan, play: "giveaway" }).valid).toBe(false);
  });

  it("accepts a rejected creator with a hard stop and null score", () => {
    const vet = {
      party_id: "pty_1", status: "rejected", hard_stop: "licence_missing", score: null, factors: null,
      real_follower_pct: 88, audience_in_market_pct: 41, engagement_rate: 0.031, risks: [],
      licence: { required: true, type: "uae_media_council", number: null, expires: null, verified: false },
      fee_range: null, reason: "No UAE Media Council licence.", missing_data: [],
    };
    expect(validateOutput("influencer/creator_vetting@1", vet).valid).toBe(true);
    expect(validateOutput("influencer/creator_vetting@1", { ...vet, hard_stop: "too_expensive" }).valid).toBe(false);
    expect(validateOutput("influencer/creator_vetting@1", { ...vet, factors: { audience_country: 2, audience_demo: 0, interest: 0, engagement_quality: 0, brand_safety: 0, content_fit: 0 } }).valid).toBe(false);
  });

  it("never lets an outreach message state a fee", () => {
    const msg = { message_number: 1, subject: "Northwind x you", body: "Hi Sam", language: "en-GB", evidence: "https://instagram.com/p/abc", notice: "privacy_notice", states_fee: false, stop: false, needs_human: [] };
    expect(validateOutput("influencer/outreach_message@1", msg).valid).toBe(true);
    expect(validateOutput("influencer/outreach_message@1", { ...msg, states_fee: true }).valid).toBe(false);
    expect(validateOutput("influencer/outreach_message@1", { ...msg, message_number: 4 }).valid).toBe(false);
  });

  it("caps paid use at 12 months, exclusivity at 90 days, terms at 15 days and review rounds at 2", () => {
    const deal = {
      party_id: "pty_1", fee: 500, currency: "GBP", deliverables: [{ platform: "tiktok", format: "video_30s", count: 1, post_window: "2026-11-10/2026-11-17" }],
      paid_usage_months: 3, exclusivity: { category: "skincare", days_after_last_post: 30 }, rights_scopes: ["paid_usage"],
      payment_terms_days: 15, kill_fee_pct: 50, review_rounds: 2, disclosure_labels: ["Ad"],
    };
    const ds = { reply_draft: "Thanks Sam", deal, within_approved_range: true, ready_for_gate: true, needs_human: [] };
    expect(validateOutput("influencer/deal_summary@1", ds).valid).toBe(true);
    for (const bad of [{ paid_usage_months: 13 }, { exclusivity: { category: "x", days_after_last_post: 91 } }, { payment_terms_days: 30 }, { review_rounds: 3 }]) {
      expect(validateOutput("influencer/deal_summary@1", { ...ds, deal: { ...deal, ...bad } }).valid, JSON.stringify(bad)).toBe(false);
    }
  });

  it("allows at most 3 change requests on a content check", () => {
    const cc = { stage: "draft", checks: [{ item: "disclosure", result: "fail", evidence: "No label" }], overall: "fail", change_requests: ["Add 'Ad' at the start"], proof: null, needs_human: [] };
    expect(validateOutput("influencer/content_checks@1", cc).valid).toBe(true);
    expect(validateOutput("influencer/content_checks@1", { ...cc, change_requests: ["a", "b", "c", "d"] }).valid).toBe(false);
  });

  it("needs proof and a positive amount on a payout request", () => {
    const pr = { deal_id: "d1", party_id: "pty_1", amount: 500, currency: "USD", proof_urls: ["https://tiktok.com/@sam/video/1"], posts_verified: true, posts_on_hold: false, tax_form: { required: ["W-9", "W-8BEN", "W-8BEN-E"], on_file: "W-9" }, bank_details_on_file: true, due_by: "2026-11-20", blockers: [] };
    expect(validateOutput("influencer/payout_request@1", pr).valid).toBe(true);
    expect(validateOutput("influencer/payout_request@1", { ...pr, proof_urls: [] }).valid).toBe(false);
    expect(validateOutput("influencer/payout_request@1", { ...pr, amount: 0 }).valid).toBe(false);
  });

  it("needs a rights grant on every amplification pick", () => {
    const pick = { party_id: "pty_1", platform: "tiktok", post_url: "https://tiktok.com/@sam/video/1", artifact_id: null, rights_grant_ids: ["rg_1"], rights_end: "2027-02-01", markets: ["GB"], budget: 300, currency: "GBP", reason: "Lowest CPA" };
    const rep = { kpis: [{ scope: "creator", key: "pty_1", name: "roas", value: null, inputs: {} }], amplify: [pick], learn: [], flags: [], summary: "Good week.", missing_data: [] };
    expect(validateOutput("influencer/weekly_report@1", rep).valid).toBe(true);
    expect(validateOutput("influencer/weekly_report@1", { ...rep, amplify: [{ ...pick, rights_grant_ids: [] }] }).valid).toBe(false);
  });

  it("accepts a shortlist and a brief", () => {
    expect(validateOutput("influencer/shortlist@1", { creators: [{ party_id: "p", handle: "@sam", market: "GB", platform: "tiktok", tier: "micro", score: 82, reason: "r", risks: [], fee_range: fee }], total_fee_high: 650, creator_budget: 6000, currency: "GBP", within_budget: true, reserves: [], needs_human: [] }).valid).toBe(true);
    const brief = { deal_id: "d1", market: "DE", language: "de", key_message: "k", must_haves: ["product name"], must_not: [], claim_ids: [], disclosure: { labels: ["Anzeige"], placement: "caption start", spoken: true, paid_partnership_tool: true }, tracking: { code_placeholder: "{{code}}", utm_url: "https://example.com/?utm_source=sam" }, deliverables: [{ platform: "instagram", format: "reel", count: 1, draft_due: "2026-11-05", post_date: "2026-11-12" }], creative_freedom: "Own style", blockers: [] };
    expect(validateOutput("influencer/creator_brief@1", brief).valid).toBe(true);
    expect(validateOutput("influencer/creator_brief@1", { ...brief, tracking: { ...brief.tracking, code_placeholder: "SAM10" } }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("influencer/nope@1", {})).toThrow(/Unknown output schema/);
  });
});
