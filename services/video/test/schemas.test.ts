import { describe, expect, it } from "vitest";
import { validateOutput } from "../src/registry.js";

const hook = (n: number, type = "question") => ({
  hook_id: `h${n}`, spoken: "Still paying for 3 tools?", on_screen: "3 tools. 1 bill.", first_frame: "Hand drops 3 invoices",
  type, persona: "ops_manager", claim_ids: [], is_new_type: n === 5,
});
const hooks = (count: number) => ({ ads: [{ ad_id: "ad1", hooks: Array.from({ length: count }, (_, i) => hook(i + 1)) }], new_claims: [], blockers: [] });

const plan = {
  track: "A", track_reason: "Explainer", shot_list: [{ shot: 1, rows: [1], type: "wide", subject: "Dashboard", source: "screen", duration_s: 4, notes: "" }],
  assets: [{ item: "Logo", type: "graphic", in_dam: true, licence_needed: false }],
  people: [{ role: "presenter", party_id: null, uses: ["filmed"], needs_consent: true, needs_contract: false }],
  cost_estimate: { currency: "GBP", lines: [{ item: "AI credits", amount: 120 }], total: 120 },
  needs_spend_gate: false, needs_rights_gate: true, new_template: false, blockers: [],
};

describe("output schemas", () => {
  it("needs exactly 5 hooks per ad of known types", () => {
    expect(validateOutput("video/hooks@1", hooks(5)).valid).toBe(true);
    expect(validateOutput("video/hooks@1", hooks(4)).valid).toBe(false);
    const bad = hooks(5);
    bad.ads[0].hooks[0].type = "clickbait";
    expect(validateOutput("video/hooks@1", bad).valid).toBe(false);
  });

  it("accepts a production plan and rejects an unknown track or a lower-case currency", () => {
    expect(validateOutput("video/production_plan@1", plan).valid).toBe(true);
    expect(validateOutput("video/production_plan@1", { ...plan, track: "D" }).valid).toBe(false);
    expect(validateOutput("video/production_plan@1", { ...plan, cost_estimate: { ...plan.cost_estimate, currency: "gbp" } }).valid).toBe(false);
  });

  it("allows only the 5 consent uses for people", () => {
    const people = [{ ...plan.people[0], uses: ["deepfake"] }];
    expect(validateOutput("video/production_plan@1", { ...plan, people }).valid).toBe(false);
  });

  it("checks export file names against the naming rule", () => {
    const exp = { file_name: "acme_2027-launch_ad-variants_h3_gb_en-gb_9x16_15s_v1", platform: "meta", placement: "reels", market: "GB", language: "en-GB",
      ratio: "9:16", duration_s: 15, safe_zone: "top 14%, bottom 20%", captions: "burned" };
    expect(validateOutput("video/export_plan@1", { exports: [exp] }).valid).toBe(true);
    expect(validateOutput("video/export_plan@1", { exports: [{ ...exp, file_name: "Acme final FINAL.mp4" }] }).valid).toBe(false);
  });

  it("accepts a CA-QC market and timecodes in the EDL", () => {
    const pre = { items: [{ check: "language", market: "CA-QC", result: "block", rule: "QC-FRENCH-MASTER", fix: "Make a French master" }], required_labels: [], overall: "block" };
    expect(validateOutput("video/precheck@1", pre).valid).toBe(true);
    const edl = { edl: [{ clip_id: "c1", in: "00:00:01.200", out: "00:00:03.000", track: "v1", row: 1 }], captions_file: "c.srt", music: { library: "Artlist", track_id: "a-1" }, overlays: [], editor_notes: [] };
    expect(validateOutput("video/edl@1", edl).valid).toBe(true);
    expect(validateOutput("video/edl@1", { ...edl, edl: [{ ...edl.edl[0], in: "1.2s" }] }).valid).toBe(false);
  });

  it("allows at most 3 learnings, each with evidence", () => {
    const l = { rule: "Question hooks beat claim hooks on Reels", market: "GB", evidence: { n: 8, metric: "hook_rate", value: 0.31, baseline: 0.22 } };
    const wa = { period: "2026-W43", top_videos: [], fatigued: [], learnings: [l], refresh_briefs: [], small_samples: [] };
    expect(validateOutput("video/weekly_analysis@1", wa).valid).toBe(true);
    expect(validateOutput("video/weekly_analysis@1", { ...wa, learnings: [l, l, l, l] }).valid).toBe(false);
    expect(validateOutput("video/weekly_analysis@1", { ...wa, learnings: [{ rule: l.rule, market: "GB" }] }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("video/nope@1", {})).toThrow(/Unknown output schema/);
  });
});
