import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../src/prompt.js";
import { marketOverlay } from "../src/markets.js";
import { loadPrompt, validateOutput } from "../src/registry.js";

const ok = (ref: string, data: unknown) => validateOutput(ref, data).valid;

describe("output schemas", () => {
  it("accepts a normalized contact and rejects an upper-case email or a bad phone", () => {
    const c = { email: "sam@acme.co.uk", phone: "+447700900123", country_code: "GB", job_seniority: "vp", job_function: "finance", email_domain_type: "business" };
    expect(ok("crm_ops/normalized_contact@1", c)).toBe(true);
    expect(ok("crm_ops/normalized_contact@1", { ...c, email: "Sam@acme.co.uk" })).toBe(false);
    expect(ok("crm_ops/normalized_contact@1", { ...c, phone: "07700 900123" })).toBe(false);
    expect(ok("crm_ops/normalized_contact@1", { ...c, subdivision: "CA-QC", country_code: "CA" })).toBe(true);
  });
  it("needs at least 40 test cases and counts consent failures", () => {
    const tc = (i: number) => ({ id: `T${i}`, name: "case", expected: "x", actual: "x", pass: true, severity: "none", evidence_ref: "run/1" });
    const report = { cases: Array.from({ length: 40 }, (_, i) => tc(i)), blockers: 0, majors: 0, consent_failures: 0 };
    expect(ok("crm_ops/test_report@1", report)).toBe(true);
    expect(ok("crm_ops/test_report@1", { ...report, cases: report.cases.slice(1) })).toBe(false);
  });
  it("allows only the 4 auto-fixes in the health triage", () => {
    const t = { auto_fix: [{ check: "exact_duplicates", record_ids: ["c1"] }], block_now: [], report: [], digest_markdown: "ok", data_quality_score: 91 };
    expect(ok("crm_ops/health_triage@1", t)).toBe(true);
    expect(ok("crm_ops/health_triage@1", { ...t, auto_fix: [{ check: "fuzzy_merge", record_ids: ["c1"] }] })).toBe(false);
  });
  it("caps score changes at 5 and keeps the import profile fields the gate reads", () => {
    const change = { target: "eng.pricing_view", old: 10, new: 12, evidence: "n=140", expected_effect: "+4% MQLs" };
    const p = { period: "2027-01", rates: {}, rule_lift: [], changes: [change], notes: [] };
    expect(ok("crm_ops/score_proposal@1", p)).toBe(true);
    expect(ok("crm_ops/score_proposal@1", { ...p, changes: Array(6).fill(change) })).toBe(false);
    const imp = { rows: 400, countries: { GB: 400 }, missing_consent: 0, third_party: false, has_eu_or_uk: true, no_basis_rows: 0, flags: [] };
    expect(ok("crm_ops/import_profile@1", imp)).toBe(true);
  });
  it("keeps the hand-off brief short and the track list closed", () => {
    expect(ok("crm_ops/handoff_brief@1", { brief_markdown: "x".repeat(1201), watch_outs: [], inferred_items: [] })).toBe(false);
    const email = { n: 1, day: 0, goal: "thank", subjects: ["a", "b", "c"], points: ["p"], cta: "Read", claim_ids: [] };
    expect(ok("crm_ops/track_choice@1", { track: "N1", reason: "download", language: "en-GB", emails: [email] })).toBe(true);
    expect(ok("crm_ops/track_choice@1", { track: "N9", reason: "x", language: "en-GB", emails: [] })).toBe(false);
  });
  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("crm_ops/nope@1", {})).toThrow(/Unknown output schema/);
  });
});

describe("prompts", () => {
  it("loads a prompt with its model and builds the system prompt with the brain and market overlay", () => {
    expect(loadPrompt("crm_ops/auditor@1").model).toBe("claude-opus-5-5");
    expect(loadPrompt("crm_ops/normalizer@1").model).toBe("claude-haiku-5-5");
    const { system } = buildSystemPrompt("crm_ops/handoff_briefer@1", { client_id: "c1", organization: { name: "Northwind" } }, marketOverlay("SA"));
    expect(system).toContain("CRM of Northwind");
    expect(system).toContain("SA-DATA-TRANSFER");
    expect(system).toContain("120 words maximum");
    expect(() => loadPrompt("email/write@1")).toThrow();
  });
});
