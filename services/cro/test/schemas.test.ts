import { describe, expect, it } from "vitest";
import { validateOutput } from "../src/registry.js";
import { priority } from "../src/planning.js";

const hyp = {
  id: "h1",
  statement: "Because we saw e1 and e2, we expect that showing the delivery cost on the product page for mobile visitors will move add-to-cart rate by 10%, and will not harm revenue per visitor.",
  page: "/product",
  markets: ["GB"],
  audience: "mobile visitors",
  primary_metric: "add_to_cart_rate",
  guardrails: ["revenue_per_visitor"],
  evidence_ids: ["e1", "e2"],
  impact: 4,
  confidence: 4,
  effort: 2,
  priority: priority(4, 4, 2),
  flags: [],
};

const plan = {
  hypothesis_id: "h1", design: "ab", fallback: null, primary_metric: "add_to_cart_rate", baseline: 0.1, mde_relative: 0.2,
  alpha: 0.05, power: 0.8, arms: 2, sample_per_arm: 3841, days: 14, start: "2027-01-11", end: "2027-01-24",
  markets: ["GB"], devices: ["mobile"], guardrails: [{ metric: "revenue_per_visitor", stop_if: "worse at p < 0.01" }],
  method: "fixed_horizon", reason_for_changes: null,
};

describe("output schemas", () => {
  it("accepts scored hypotheses with a selected one", () => {
    expect(validateOutput("cro/hypotheses@1", { hypotheses: [hyp], selected: hyp }).valid).toBe(true);
  });

  it("needs the hypothesis form and evidence", () => {
    expect(validateOutput("cro/hypotheses@1", { hypotheses: [{ ...hyp, statement: "Make the button green" }], selected: hyp }).valid).toBe(false);
    expect(validateOutput("cro/hypotheses@1", { hypotheses: [{ ...hyp, evidence_ids: [] }], selected: hyp }).valid).toBe(false);
    expect(validateOutput("cro/hypotheses@1", { hypotheses: [{ ...hyp, impact: 6 }], selected: hyp }).valid).toBe(false);
  });

  it("accepts an A/B plan and checks arms, days and fallback", () => {
    expect(validateOutput("cro/test_plan@1", plan).valid).toBe(true);
    expect(validateOutput("cro/test_plan@1", { ...plan, arms: 3 }).valid).toBe(false);
    expect(validateOutput("cro/test_plan@1", { ...plan, days: 10 }).valid).toBe(false);
    expect(validateOutput("cro/test_plan@1", { ...plan, days: 49 }).valid).toBe(false);
    expect(validateOutput("cro/test_plan@1", { ...plan, fallback: "bolder_change" }).valid).toBe(false);
    expect(validateOutput("cro/test_plan@1", { ...plan, design: "abn", arms: 3 }).valid).toBe(true);
  });

  it("needs a fallback when a test is not testable", () => {
    const nt = { ...plan, design: "not_testable", days: null, start: null, end: null };
    expect(validateOutput("cro/test_plan@1", { ...nt, fallback: "fix_and_monitor" }).valid).toBe(true);
    expect(validateOutput("cro/test_plan@1", nt).valid).toBe(false);
  });

  it("needs questions when the brief is not complete, and the full plan when it is", () => {
    expect(validateOutput("cro/page_plan@1", { status: "need_info", questions: ["Which offer?"] }).valid).toBe(true);
    expect(validateOutput("cro/page_plan@1", { status: "need_info", questions: [] }).valid).toBe(false);
    expect(validateOutput("cro/page_plan@1", { status: "ok", questions: [] }).valid).toBe(false);
    const ok = {
      status: "ok", questions: [], template: "T2", primary_cta: "Book a 20-minute demo", message_match_promise: "Close the books in 3 days",
      sections: [{ id: "hero", job: "Repeat the ad promise" }], markets: ["AE"], languages: ["ar-AE", "en-AE"],
      launch_test: { statement: "Because we saw ...", primary_metric: "cro.demo_request_rate" },
    };
    expect(validateOutput("cro/page_plan@1", ok).valid).toBe(true);
  });

  it("needs html for a page and a change set for a variant", () => {
    const flags = { template_reused: false, only_moves_or_removes_approved_elements: false, preview_notes: "" };
    expect(validateOutput("cro/build@1", { kind: "page", html: "<html></html>", changes: [], ...flags }).valid).toBe(true);
    expect(validateOutput("cro/build@1", { kind: "page", html: null, changes: [], ...flags }).valid).toBe(false);
    expect(validateOutput("cro/build@1", { kind: "variant", html: null, changes: [], ...flags }).valid).toBe(false);
    const change = { selector: "h1", action: "text", value: "Delivery is free over £40" };
    expect(validateOutput("cro/build@1", { kind: "variant", html: null, changes: [change], ...flags }).valid).toBe(true);
  });

  it("accepts page copy and rejects a long headline", () => {
    const copy = {
      market: "GB", language: "en-GB", new_claims: [], missing: [], copy_reused: false, new_copy_ids: ["hero"],
      sections: [{ id: "hero", headline: "Close your books in 3 days", body: null, cta: "Book a 20-minute demo", proof_source_ids: ["clm-3-days"] }],
    };
    expect(validateOutput("cro/page_copy@1", copy).valid).toBe(true);
    expect(validateOutput("cro/page_copy@1", { ...copy, sections: [{ ...copy.sections[0], headline: "x".repeat(121) }] }).valid).toBe(false);
  });

  it("accepts a results report with only the known decisions", () => {
    const r = {
      decision: "ship", summary_for_client: "Showing delivery cost early raised add-to-cart by 20%.", lift_relative: 0.2, ci95: [0.05, 0.37],
      p_value: 0.006, guardrails: [{ metric: "revenue_per_visitor", status: "ok" }], srm_ok: true,
      learning: "Show costs early on mobile", next_step: "Ship to 100%", escalation_note: null,
    };
    expect(validateOutput("cro/results@1", r).valid).toBe(true);
    expect(validateOutput("cro/results@1", { ...r, decision: "not_ready" }).valid).toBe(false);
    expect(validateOutput("cro/results@1", { ...r, ci95: [0.05] }).valid).toBe(false);
  });

  it("accepts a QA report and a learning", () => {
    expect(validateOutput("cro/qa_report@1", { overall: "fail", items: [{ id: "consent-1", result: "fail", evidence: "Box is pre-ticked" }] }).valid).toBe(true);
    const l = { client_id: "c1", test_id: "t1", page_type: "product", markets: ["GB"], devices: ["mobile"], theme: "price clarity", change: "Delivery cost on page", decision: "ship", lift_relative: 0.2, learning: "Show costs early", date: "2027-01-30" };
    expect(validateOutput("cro/learning@1", l).valid).toBe(true);
    expect(validateOutput("cro/learning@1", { ...l, date: "30/01/2027" }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("cro/nope@1", {})).toThrow(/Unknown output schema/);
  });
});
