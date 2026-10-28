import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { buildSystemPrompt } from "../src/prompt.js";
import { createValidator, loadPrompt, validateOutput } from "../src/registry.js";
import { marketRules } from "../src/market-rules.js";

const prompts = readdirSync(dir("prompts")).filter((f) => f.endsWith(".md") && !f.startsWith("_"));

describe("output schemas", () => {
  it("compiles every schema in strict mode", () => {
    expect(() => createValidator()).not.toThrow();
    expect(readdirSync(dir("schemas")).length).toBe(8);
  });

  it("accepts a valid creator ad plan and rejects one without a rights grant", () => {
    const ad = {
      market: "GB", platform: "tiktok", ad_type: "spark", stage: "prospect", audience_ref: "aud_1", budget: 500,
      start_date: "2026-11-01", end_date: "2026-11-28", headline: "Try it", cta: "Shop now", rights_grant_ids: ["g1"], claim_ids: [], new_claims: [],
    };
    const plan = { ads: [ad], excluded_markets: [{ market: "SA", reason: "no Mawthooq licence" }], earliest_expiry: "2026-11-30" };
    expect(validateOutput("paid_social/amplify_plan@1", plan).valid).toBe(true);
    expect(validateOutput("paid_social/amplify_plan@1", { ...plan, ads: [{ ...ad, rights_grant_ids: [] }] }).valid).toBe(false);
  });

  it("accepts a media plan, refuses a daily move limit above 20%, and refuses unknown fields", () => {
    const media_plan = {
      client_id: "cl_1", month: "2026-11", currency: "GBP", total_budget: 30000, test_share: 0.15,
      lines: [{ market: "GB", platform: "meta", stage: "test", budget: 4500, kpi: "cpa", target: 25 }],
      max_daily_move_pct: 20, autopause_cpa_multiple: 1.5, autopause_days: 3,
    };
    const out = { type: "media_plan", media_plan, test_card: null, reasons: [], risks: [], data_gaps: [] };
    expect(validateOutput("paid_social/strategy@1", out).valid).toBe(true);
    expect(validateOutput("paid_social/strategy@1", { ...out, media_plan: { ...media_plan, max_daily_move_pct: 30 } }).valid).toBe(false);
    expect(validateOutput("paid_social/strategy@1", { ...out, extra: 1 }).valid).toBe(false);
  });

  it("only lets customer lists resolve for channel paid_ad and purpose marketing", () => {
    const a = {
      name: "buyers", platform: "meta", market: "GB", stage: "retain", type: "matched_list", definition: {}, estimated_size: null,
      resolve_request: { channel: "paid_ad", purpose: "marketing", markets: ["GB"], filter: {} }, exclusions: [], special_category: null,
    };
    expect(validateOutput("paid_social/audiences@1", { audiences: [a], reasons: [], risks: [] }).valid).toBe(true);
    const bad = { ...a, resolve_request: { ...a.resolve_request, channel: "email" } };
    expect(validateOutput("paid_social/audiences@1", { audiences: [bad], reasons: [], risks: [] }).valid).toBe(false);
  });

  it("needs 2 signals for a fatigue flag", () => {
    const base = { date: "2026-11-02", moves: [], pauses: [], recommendations_for_people: [], no_action_reason: null };
    expect(validateOutput("paid_social/optimizer_actions@1", { ...base, fatigue_flags: [{ ad_id: "a", signals: ["ctr_drop", "frequency"] }] }).valid).toBe(true);
    expect(validateOutput("paid_social/optimizer_actions@1", { ...base, fatigue_flags: [{ ad_id: "a", signals: ["ctr_drop"] }] }).valid).toBe(false);
  });
});

describe("prompts", () => {
  for (const f of prompts) {
    it(`${f} has a header that matches its file name`, () => {
      const p = loadPrompt(`paid_social/${f.replace(/\.md$/, "")}@1`);
      expect(p.model).toMatch(/^claude-(opus|haiku)-5-5$/);
      expect(p.task.length).toBeGreaterThan(100);
    });
  }

  it("builds a system prompt with the client name, the brain and the market rules", () => {
    const { model, system } = buildSystemPrompt("paid_social/optimizer@1", { client_id: "cl_1", organization: { name: "Acme" } }, marketRules("GB"));
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("The client is Acme.");
    expect(system).toContain('"currency":"GBP"');
    expect(system).not.toMatch(/\{brain|\{market_rules\}/);
  });
});
