import { describe, expect, it } from "vitest";
import { validateOutput } from "../src/registry.js";
import { buildSystemPrompt } from "../src/prompt.js";
import { rulesFor } from "../src/market-rules.js";

const areas = ["consent", "conversion_definition", "match_rate", "campaign_tagging", "ad_platform_signals", "cross_domain", "crm_source", "retention_access"]
  .map((area) => ({ area, score: 3, evidence: "seen in crawl" }));
const fix = { rank: 1, area: "consent", problem: "Meta pixel fires before consent", evidence: "crawl, reject_all", fix: "Gate the tag on ad_storage", effort: "S", value: "high", owner: "pith", labels: ["compliance"] };

describe("output schemas", () => {
  it("accepts an audit with 8 areas and rejects 7", () => {
    expect(validateOutput("analytics/audit@1", { areas, fixes: [fix], match_rate: 0.97, blockers: [] }).valid).toBe(true);
    expect(validateOutput("analytics/audit@1", { areas: areas.slice(1), fixes: [fix], match_rate: null, blockers: [] }).valid).toBe(false);
  });

  it("allows only x_ custom event names and a known consent category", () => {
    const ev = { name: "purchase", trigger: "order confirmed", parameters: ["value", "currency"], consent_category: "analytics", destinations: ["ga4"], services: ["email"], conversion: "main" };
    const plan = { version: 1, events: [ev], lookback_days: { click: 30, view: 1 }, markets: [{ market: "GB", consent_mode: "advanced", warehouse_region: "europe-west2" }], changes: [], open_questions: [] };
    expect(validateOutput("analytics/tracking_plan@1", plan).valid).toBe(true);
    expect(validateOutput("analytics/tracking_plan@1", { ...plan, events: [{ ...ev, name: "x_quote_sent" }] }).valid).toBe(true);
    expect(validateOutput("analytics/tracking_plan@1", { ...plan, events: [{ ...ev, name: "Purchase Made" }] }).valid).toBe(false);
    expect(validateOutput("analytics/tracking_plan@1", { ...plan, events: [{ ...ev, consent_category: "maybe" }] }).valid).toBe(false);
  });

  it("caps findings at 5 and needs evidence", () => {
    const f = { title: "Search carries revenue", what: "x", so_what: "y", confidence: "high", evidence: ["last_non_direct 40%"], suggested_action: "" };
    const ok = { blocked: false, findings: [f], model_disagreement: [], platform_claim_ratio: { meta: 1.4 } };
    expect(validateOutput("analytics/findings@1", ok).valid).toBe(true);
    expect(validateOutput("analytics/findings@1", { ...ok, findings: Array(6).fill(f) }).valid).toBe(false);
    expect(validateOutput("analytics/findings@1", { ...ok, findings: [{ ...f, evidence: [] }] }).valid).toBe(false);
  });

  it("needs a 3-line headline and proposals that start with 'We propose'", () => {
    const r = { report_type: "weekly", headline: ["a", "b", "c"], qa_note: "", body_markdown: "x", proposals: [{ text: "We propose a test", expected_effect: "e", risk: "r" }], word_count: 320 };
    expect(validateOutput("analytics/report@1", r).valid).toBe(true);
    expect(validateOutput("analytics/report@1", { ...r, headline: ["a", "b"] }).valid).toBe(false);
    expect(validateOutput("analytics/report@1", { ...r, proposals: [{ ...r.proposals[0], text: "Move budget now" }] }).valid).toBe(false);
  });

  it("labels MMM scenarios 'Draft for approval'", () => {
    const sc = (name: string) => ({ name, budget: { search: 100 }, expected_revenue: 500, interval: [400, 600] });
    const m = { channels: [{ channel: "search", roi_median: 2, roi_ci90: [1, 3], marginal_roi: 1.4 }], scenarios: [sc("resplit"), sc("minus_10"), sc("plus_10")], label: "Draft for approval", notes: [] };
    expect(validateOutput("analytics/mmm_readout@1", m).valid).toBe(true);
    expect(validateOutput("analytics/mmm_readout@1", { ...m, label: "Final" }).valid).toBe(false);
  });

  it("refuses a test shorter than 21 days", () => {
    const t = { design: "geo_holdout", hypothesis: "h", decisions: { if_positive: "a", if_flat: "b", if_negative: "c" }, market: "GB", test_units: ["Granada"], control_units: ["Meridian"], base_rate: 0.04, expected_lift: 0.1, n_test: 50000, n_control: 50000, start: "2027-02-01", days: 28, cooldown_days: 7, expected_cost: 3000 };
    expect(validateOutput("analytics/test_design@1", t).valid).toBe(true);
    expect(validateOutput("analytics/test_design@1", { ...t, days: 14 }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => expect(() => validateOutput("analytics/nope@1", {})).toThrow(/Unknown output schema/));
});

describe("system prompt", () => {
  it("puts the client name, brain and market rules in the preamble", () => {
    const { model, system } = buildSystemPrompt("analytics/report@1", { client_id: "c1", organization: { name: "Northwind" } }, [rulesFor("GB")]);
    expect(model).toBe("claude-sonnet-5-5");
    expect(system).toContain("Northwind");
    expect(system).toContain("europe-west2");
    expect(system).toContain("We propose");
  });
});
