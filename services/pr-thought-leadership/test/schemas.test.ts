import { describe, expect, it } from "vitest";
import { createValidator, validateOutput } from "../src/registry.js";
import { buildSystemPrompt } from "../src/prompt.js";
import { marketRules } from "../src/market-rules.js";

const article = { title: "Month-end close is still manual", url: "https://www.ft.com/content/abc", date: "2026-10-01" };

describe("output schemas", () => {
  it("compiles all 18 schemas in strict mode", () => {
    const ajv = createValidator();
    expect(Object.keys(ajv.schemas).filter((k) => k.startsWith("pr/"))).toHaveLength(18);
  });

  it("accepts a pitch batch and rejects a 31-name batch", () => {
    const p = { party_id: "j1", subject: "UK finance teams still close by spreadsheet", body: "...", language: "en-GB", market: "GB", references_article_url: article.url, claim_ids: ["c-1"], new_claim_ids: [], follow_up: false };
    const batch = { angle_id: "a-1", price_sensitive: false, pitches: [p], gaps: [] };
    expect(validateOutput("pr/pitches@1", batch).valid).toBe(true);
    expect(validateOutput("pr/pitches@1", { ...batch, pitches: Array(31).fill(p) }).valid).toBe(false);
  });

  it("holds angle plans to 8 to 12 angles", () => {
    const angle = {
      angle_id: "a-1", story_type: "data_story", markets: ["GB"], target_tier: 1, headline: "h", hook: "h", reader_value: "r",
      proof: [{ text: "62% of teams", claim_id: "c-1", source: "survey" }], spokesperson_id: "e-1", offer: "exclusive", risks: [], geo_prompts: [],
      sensitive: false, score: { news_value: 4, fit: 4, proof: 3, effort: 2 }, lowest_score_reason: "needs design work",
    };
    const plan = { month: "2026-11", angles: Array(8).fill(angle), new_claim_ids: [], gaps: [] };
    expect(validateOutput("pr/angle_cards@1", plan).valid).toBe(true);
    expect(validateOutput("pr/angle_cards@1", { ...plan, angles: [angle] }).valid).toBe(false);
  });

  it("accepts a 'pitch only' release answer and a full release, but not a mix", () => {
    expect(validateOutput("pr/release@1", { recommend: "pitch_only", reason: "not news", fact_sheet: "" }).valid).toBe(true);
    const full = { markets: { GB: { headline: "h", body: "b", quotes: [] } }, fact_sheet: "f", translated_markets: [], approvals_needed: [], new_claim_ids: [], embargo_at: null };
    expect(validateOutput("pr/release@1", full).valid).toBe(true);
    expect(validateOutput("pr/release@1", { ...full, recommend: "pitch_only" }).valid).toBe(false);
  });

  it("rejects executive posts with no source or 4 hashtags", () => {
    const post = { pillar: "Ops", format: "story", text: "t", source_refs: ["memo-1:2"], claim_ids: [], new_claim_ids: [], hashtags: [], post_at_local: "2026-10-27T08:30:00Z", needs_legal: false };
    const out = { executive_id: "e-1", posts: [post], new_claim_ids: [], needs_more_input: "" };
    expect(validateOutput("pr/exec_posts@1", out).valid).toBe(true);
    expect(validateOutput("pr/exec_posts@1", { ...out, posts: [{ ...post, source_refs: [] }] }).valid).toBe(false);
    expect(validateOutput("pr/exec_posts@1", { ...out, posts: [{ ...post, hashtags: ["#a", "#b", "#c", "#d"] }] }).valid).toBe(false);
  });

  it("checks media records and crisis levels", () => {
    const j = { name: "Jane Doe", outlet: "Financial Times", role: "Reporter", country: "GB", language: "en-GB", beats: ["fintech"], recent_articles: [article], tier: 1, tier_reason: "national", fit: 4.5, consent_basis: "legitimate_interest", source: "muckrack:2026-10-21" };
    expect(validateOutput("pr/media_list@1", { journalists: [j], new_tier1_count: 1, removed_party_ids: [] }).valid).toBe(true);
    expect(validateOutput("pr/media_list@1", { journalists: [{ ...j, consent_basis: "none" }], new_tier1_count: 1, removed_party_ids: [] }).valid).toBe(false);
    expect(validateOutput("pr/mentions_scored@1", { records: [], max_crisis_level: 4, crisis_items: [] }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => expect(() => validateOutput("pr/nope@1", {})).toThrow(/Unknown output schema/));
});

describe("prompts", () => {
  it("builds a system prompt with the brain, market rules and the agent task", () => {
    const { model, system } = buildSystemPrompt("pr/pitch_writer@1", { client_id: "c-1", organization: { name: "Acme" } }, marketRules("GB"));
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("for the client Acme");
    expect(system).toContain('"time_zone":"Europe/London"');
    expect(system).toContain("You never send, post or reply to anyone");
    expect(system).toContain("Body under 150 words");
  });
});
