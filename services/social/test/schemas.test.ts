import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { createValidator, loadWorkflows, validateOutput } from "../src/registry.js";

const post = {
  caption: "3 ways finance teams close the month in 5 days.",
  variants: ["Month-end in 5 days?", "What slows your close?"],
  hashtags: ["#finance", "#accounting"],
  first_comment: null,
  cta: "Read the guide",
  alt_text: "Chart: close time falls from 12 to 5 days",
  claims_used: [{ text: "close in 5 days", claim_id: "clm-close-5" }],
  new_claims: [],
  labels: { disclosure: null, ai_generated: false },
  needs_human: false,
  blockers: [],
};

const item = {
  inbox_item_id: "ig-123",
  category: "question_simple",
  sentiment: 1,
  language: "en-GB",
  market: "GB",
  risk: "low",
  action: "auto_reply",
  reply_library_id: "faq-delivery",
  match_confidence: 0.95,
  reply_text: "We deliver in 2 working days.",
  reply_channel: "public",
  needs_human: false,
};

describe("output schemas", () => {
  it("compiles every schema in strict mode under an $id that matches its file", () => {
    const ajv = createValidator();
    for (const f of readdirSync(dir("schemas")).filter((f) => f.endsWith(".json"))) {
      const id = JSON.parse(readFileSync(dir("schemas", f), "utf8")).$id;
      expect(id).toBe(`social/${f.replace(".json", "")}@1`);
      expect(ajv.getSchema(id)).toBeTruthy();
    }
  });

  it("has no schema that no workflow uses", () => {
    const used = new Set(loadWorkflows().flatMap((w) => w.steps.map((s) => s.agent?.output_schema).filter(Boolean)));
    for (const f of readdirSync(dir("schemas")).filter((f) => f.endsWith(".json"))) {
      expect(used, f).toContain(`social/${f.replace(".json", "")}@1`);
    }
  });

  it("accepts a complete post and rejects bad hashtags or long alt text", () => {
    expect(validateOutput("social/post@1", post).valid).toBe(true);
    expect(validateOutput("social/post@1", { ...post, hashtags: ["finance"] }).valid).toBe(false);
    expect(validateOutput("social/post@1", { ...post, alt_text: "x".repeat(251) }).valid).toBe(false);
    expect(validateOutput("social/post@1", { ...post, labels: { disclosure: null } }).valid).toBe(false);
  });

  it("accepts known inbox categories and markets only", () => {
    expect(validateOutput("social/inbox_actions@1", { items: [item] }).valid).toBe(true);
    expect(validateOutput("social/inbox_actions@1", { items: [{ ...item, market: "unknown" }] }).valid).toBe(true);
    expect(validateOutput("social/inbox_actions@1", { items: [{ ...item, category: "angry" }] }).valid).toBe(false);
    expect(validateOutput("social/inbox_actions@1", { items: [{ ...item, market: "uk" }] }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("social/nope@1", {})).toThrow(/Unknown output schema/);
  });
});
