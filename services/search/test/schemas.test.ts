import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { createValidator, validateOutput } from "../src/registry.js";

const brief = {
  brief_id: "se-2026-11-001",
  cluster_id: "cl-payroll-uk",
  market: "GB",
  locale: "en-GB",
  page_type: "how_to",
  target_query: "how to run payroll for contractors",
  intent: "informational",
  main_question: "How do you run payroll for contractors in the UK?",
  direct_answer: "You check IR35 status, then pay through PAYE or an umbrella company.",
  outline: [
    { h2: "Check IR35 status", h3: [] },
    { h2: "Choose how to pay", h3: ["PAYE", "Umbrella company"] },
  ],
  facts: [{ text: "IR35 applies to medium and large clients", source_url: "https://www.gov.uk/guidance/understanding-off-payroll-working-ir35" }],
  claims: [{ text: "Used by 4,000 UK firms", new_claim: false }],
  gap_angle: "A worked example for each status",
  entities: ["IR35", "HMRC", "PAYE"],
  expert_questions: ["q1?", "q2?", "q3?", "q4?", "q5?"],
  internal_links_out: ["/a", "/b", "/c"],
  internal_links_in: ["/d"],
  schema_type: "HowTo",
  title_tag: "How to run contractor payroll in the UK",
  meta_description: "A step by step guide to contractor payroll and IR35.",
  slug: "contractor-payroll-uk",
  word_range: { min: 1200, max: 1800 },
};

describe("output schemas", () => {
  it("compiles all 14 schemas with search ids", () => {
    const files = readdirSync(dir("schemas")).filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(14);
    const ajv = createValidator();
    for (const f of files) expect(ajv.getSchema(`search/${f.replace(".json", "")}@1`), f).toBeDefined();
  });

  it("accepts a valid brief", () => {
    const r = validateOutput("search/brief@1", brief);
    expect(r.valid, JSON.stringify(r.errors)).toBe(true);
  });

  it("rejects a brief whose main question is not a question, or whose title tag is too long", () => {
    expect(validateOutput("search/brief@1", { ...brief, main_question: "Contractor payroll" }).valid).toBe(false);
    expect(validateOutput("search/brief@1", { ...brief, title_tag: "x".repeat(61) }).valid).toBe(false);
    expect(validateOutput("search/brief@1", { ...brief, expert_questions: ["q1?"] }).valid).toBe(false);
    expect(validateOutput("search/brief@1", { ...brief, extra: true }).valid).toBe(false);
  });

  it("accepts a change set and rejects an unknown change type", () => {
    const ok = { changes: [{ type: "budget_move", target: "c1", from: 100, to: 110, reason: "CPA under target" }], alerts: [] };
    expect(validateOutput("search/change_set@1", ok).valid).toBe(true);
    const bad = { changes: [{ ...ok.changes[0], type: "raise_total" }], alerts: [] };
    expect(validateOutput("search/change_set@1", bad).valid).toBe(false);
  });

  it("needs exactly 3 summary lines in a report", () => {
    const report = { summary: ["a", "b", "c"], seo: [], geo: [], sem: [], explanations: [], next_month: ["x"], client_asks: [] };
    expect(validateOutput("search/report@1", report).valid).toBe(true);
    expect(validateOutput("search/report@1", { ...report, summary: ["a", "b"] }).valid).toBe(false);
  });
});
