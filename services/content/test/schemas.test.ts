import { describe, expect, it } from "vitest";
import { validateOutput } from "../src/registry.js";

const brief = {
  brief_id: "cm-2027Q1-001",
  client_id: "c-123",
  market: "GB",
  language: "en-GB",
  format: "blog",
  persona: "ops-director",
  buyer_question: "How long does a CRM migration take?",
  source_of_question: "sales_call",
  original_input: "expert_interview",
  angle: "Most of the time goes on data clean-up, not the move itself.",
  claims_needed: [{ text: "Used by 400 UK firms", new_claim: false }],
  cta: "demo",
  word_count_target: 1800,
  due_date: "2027-01-20",
  repurpose: true,
};

describe("output schemas", () => {
  it("accepts a complete brief", () => {
    expect(validateOutput("content/brief@1", brief).valid).toBe(true);
  });

  it("rejects a brief with a bad id and a missing angle", () => {
    const { valid, errors } = validateOutput("content/brief@1", { ...brief, brief_id: "x", angle: undefined });
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it("accepts a plan that embeds briefs, and rejects a plan with 1 pillar", () => {
    const plan = { quarter: "2027Q1", pillars: [{ name: "Migration", why: "Top objection" }, { name: "Cost", why: "Search volume" }], briefs: [brief], quality_failures: [] };
    expect(validateOutput("content/plan@1", plan).valid).toBe(true);
    expect(validateOutput("content/plan@1", { ...plan, pillars: plan.pillars.slice(1) }).valid).toBe(false);
  });

  it("rejects a draft meta title over 60 characters", () => {
    const draft = {
      title: "T", meta_title: "x".repeat(61), meta_description: "d", slug: "crm-migration-time", body_markdown: "b",
      faq: [], claims: [], new_claims: [], needs_source: [], schema_types: ["Article"],
    };
    expect(validateOutput("content/draft@1", draft).valid).toBe(false);
    expect(validateOutput("content/draft@1", { ...draft, meta_title: "CRM migration time" }).valid).toBe(true);
  });

  it("rejects machine-only translation", () => {
    const loc = { brief_id: "cm-2027Q1-001", language: "ar-AE", native_editor: "R. Haddad", body_markdown: "...", machine_translation_only: true };
    expect(validateOutput("content/localized_copy@1", loc).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("content/nope@1", {})).toThrow(/Unknown output schema/);
  });
});
