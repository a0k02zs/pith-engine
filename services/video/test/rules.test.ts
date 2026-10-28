import { describe, expect, it } from "vitest";
import { marketRules } from "../src/market-rules.js";
import { buildSystemPrompt } from "../src/prompt.js";
import {
  captionDriftOk, captionProblems, chooseTrack, completionRate, costPerFinishedVideo, deliveryOnTime, exportFileName, fatigued,
  grantActive, hookRate, loudnessOk, missingLabels, needsFrenchMaster, needsNativeReview, needsSpendGate, overlongRows, rankable,
  requiredLabels, rightsGaps, spokenSeconds, takedownOverdue, workingDaysBetween, type Grant,
} from "../src/rules.js";

const base = { segment: "b2b" as const, real_person_on_camera: false, paid_social: false, needs_authentic_voice: false };

describe("track choice", () => {
  it("films a real person on camera (Track C)", () => {
    expect(chooseTrack({ ...base, format: "explainer", real_person_on_camera: true }).track).toBe("C");
    expect(chooseTrack({ ...base, format: "hero" }).track).toBe("C");
  });
  it("uses creators for authentic B2C paid social (Track B)", () => {
    expect(chooseTrack({ ...base, format: "ad_variants", segment: "b2c", paid_social: true, needs_authentic_voice: true }).track).toBe("B");
  });
  it("uses AI for explainers, demos and localization (Track A)", () => {
    expect(chooseTrack({ ...base, format: "demo" }).track).toBe("A");
    expect(chooseTrack({ ...base, format: "testimonial", localization_only: true }).track).toBe("A");
  });
  it("drops below the Track C floor and says why", () => {
    const r = chooseTrack({ ...base, format: "testimonial", budget: 2000, track_c_floor: 6000 });
    expect(r.track).toBe("A");
    expect(r.reason).toMatch(/floor/);
    expect(chooseTrack({ ...base, format: "hero", segment: "b2c", paid_social: true, budget: 1, track_c_floor: 2 }).track).toBe("B");
  });
});

describe("spend gate (G2)", () => {
  it("opens for Track C, a cost over the limit or a new fee", () => {
    expect(needsSpendGate({ track: "C", total: 10, lines: [] }, 1000)).toBe(true);
    expect(needsSpendGate({ track: "A", total: 1200, lines: [] }, 1000)).toBe(true);
    expect(needsSpendGate({ track: "B", total: 100, lines: [{ item: "Creator fee", amount: 100, new_fee: true }] }, 1000)).toBe(true);
    expect(needsSpendGate({ track: "A", total: 900, lines: [{ item: "AI credits", amount: 900 }] }, 1000)).toBe(false);
  });
});

describe("rights (G8)", () => {
  const on = new Date("2026-11-01T00:00:00Z");
  const grant = (over: Partial<Grant>): Grant => ({ id: "g1", party_id: "p1", scope: ["likeness"], markets: ["GB"], starts_at: "2026-01-01T00:00:00Z", ...over });

  it("treats revoked, expired and future grants as not active", () => {
    expect(grantActive(grant({}), on)).toBe(true);
    expect(grantActive(grant({ revoked_at: "2026-10-01T00:00:00Z" }), on)).toBe(false);
    expect(grantActive(grant({ expires_at: "2026-10-31T23:59:59Z" }), on)).toBe(false);
    expect(grantActive(grant({ starts_at: "2026-12-01T00:00:00Z" }), on)).toBe(false);
  });

  it("finds the missing scope per market", () => {
    const gaps = rightsGaps([{ party_id: "p1", uses: ["filmed", "paid"] }], [grant({ markets: ["GB", "AE"] })], ["GB", "US"], on);
    expect(gaps).toEqual([
      { person: "p1", market: "GB", missing_scopes: ["paid_usage"] },
      { person: "p1", market: "US", missing_scopes: ["likeness", "paid_usage"] },
    ]);
  });

  it("needs avatar consent on top of filming consent", () => {
    const gaps = rightsGaps([{ party_id: "p1", uses: ["avatar"] }], [grant({})], ["GB"], on);
    expect(gaps[0].missing_scopes).toEqual(["avatar"]);
  });

  it("checks CA-QC against a CA grant, and a voice clone against its languages", () => {
    const g = grant({ scope: ["voice_clone"], markets: ["CA"], voice_languages: ["en-CA"] });
    expect(rightsGaps([{ party_id: "p1", uses: ["voice_clone"], voice_language: "en-CA" }], [g], ["CA-QC"], on)).toEqual([]);
    expect(rightsGaps([{ party_id: "p1", uses: ["voice_clone"], voice_language: "fr-CA" }], [g], ["CA-QC"], on)).toHaveLength(1);
  });

  it("ignores grants for another person and needs an id", () => {
    expect(rightsGaps([{ contact_id: "c9", uses: ["filmed"] }], [grant({})], ["GB"], on)).toHaveLength(1);
    expect(() => rightsGaps([{ uses: ["filmed"] }], [], ["GB"], on)).toThrow();
  });
});

describe("labels", () => {
  const on = new Date("2026-10-22T00:00:00Z");

  it("gives the market labels for paid and AI content", () => {
    expect(requiredLabels(["GB"], { paid: true, ai_realistic: true, on })).toEqual([
      { market: "GB", label: "Ad" }, { market: "GB", label: "AI-generated" },
    ]);
    const ae = requiredLabels(["AE"], { paid: true, ai_realistic: false, on }).map((l) => l.label);
    expect(ae).toEqual(["إعلان", "Ad"]);
    expect(requiredLabels(["FR"], { paid: true, ai_realistic: true, retouched: true, on }).map((l) => l.label)).toEqual(["Publicité", "Image virtuelle", "Image retouchée"]);
    expect(requiredLabels(["CA-QC"], { paid: true, ai_realistic: true, on }).map((l) => l.label)).toEqual(["#pub", "Généré par IA"]);
  });

  it("needs the EU AI label only from 2 August 2026, and an actor label in the US", () => {
    expect(requiredLabels(["NL"], { paid: false, ai_realistic: true, on: new Date("2026-07-01") })).toEqual([]);
    expect(requiredLabels(["NL"], { paid: false, ai_realistic: true, on })).toEqual([{ market: "NL", label: "Gemaakt met AI" }]);
    expect(requiredLabels(["US", "GB"], { paid: false, ai_realistic: false, actor_portrayal: true, on })).toEqual([{ market: "US", label: "Actor portrayal" }]);
  });

  it("lists labels an export does not carry", () => {
    const req = requiredLabels(["GB"], { paid: true, ai_realistic: true, on });
    expect(missingLabels(req, ["ad"])).toEqual([{ market: "GB", label: "AI-generated" }]);
  });

  it("knows French master and native review markets", () => {
    expect(needsFrenchMaster("CA-QC")).toBe(true);
    expect(needsFrenchMaster("CA")).toBe(false);
    expect(needsFrenchMaster("FR")).toBe(true);
    expect(needsNativeReview(["GB"], ["en-GB"])).toBe(false);
    expect(needsNativeReview(["AE"], ["ar-AE", "en-AE"])).toBe(true);
  });

  it("resolves inherited markets", () => {
    expect(marketRules("SA").currency).toBe("SAR");
    expect(marketRules("SA").consent_for_every_person).toBe(true);
    expect(marketRules("IT").group).toBe("EU");
    expect(() => marketRules("JP")).toThrow(/No video rules/);
  });
});

describe("scripts, captions and exports", () => {
  it("times speech at the language pace", () => {
    expect(spokenSeconds("one two three four five")).toBe(2);
    expect(overlongRows([{ t_start: 0, t_end: 3, audio: "Short line" }, { t_start: 3, t_end: 4, audio: "This line has far too many words for 1 second" }])).toEqual([1]);
  });

  it("limits captions to 2 lines of 42 characters", () => {
    expect(captionProblems("Short line\nSecond line")).toEqual([]);
    expect(captionProblems("a\nb\nc")).toEqual(["3 lines (max 2)"]);
    expect(captionProblems("x".repeat(43))).toEqual(["line 1 has 43 characters (max 42)"]);
    expect(captionDriftOk(0.3)).toBe(true);
    expect(captionDriftOk(0.31)).toBe(false);
  });

  it("builds file names that match the export schema rule", () => {
    const name = exportFileName({ client: "Acme", campaign: "2027 Launch", format: "ad_variants", hook_id: "H3", market: "GB", language: "en-GB", ratio: "9:16", duration_s: 15, version: 1 });
    expect(name).toBe("acme_2027-launch_ad-variants_h3_gb_en-gb_9x16_15s_v1");
    expect(() => exportFileName({ client: "a", campaign: "b", format: "c", hook_id: "d", market: "GB", language: "en", ratio: "1:1", duration_s: 6, version: 0 })).toThrow();
  });

  it("checks loudness for social and EU broadcast", () => {
    expect(loudnessOk(-14.5, "social")).toBe(true);
    expect(loudnessOk(-18, "social")).toBe(false);
    expect(loudnessOk(-23, "broadcast_eu")).toBe(true);
  });
});

describe("KPIs", () => {
  it("computes rates and returns null with no base", () => {
    expect(hookRate(250, 1000)).toBe(0.25);
    expect(hookRate(5, 0)).toBeNull();
    expect(completionRate(30, 200)).toBe(0.15);
  });

  it("counts each ratio of a cut once for cost per finished video", () => {
    const exports = [{ cut_id: "c1", ratio: "9:16" }, { cut_id: "c1", ratio: "9:16" }, { cut_id: "c1", ratio: "1:1" }, { cut_id: "c2", ratio: "9:16" }];
    expect(costPerFinishedVideo(900, exports)).toBe(300);
  });

  it("flags fatigue and small samples", () => {
    expect(fatigued({ hook_rate: 0.18, first_week_hook_rate: 0.24, frequency_7d: 2 })).toBe(true);
    expect(fatigued({ hook_rate: 0.2, first_week_hook_rate: 0.24, frequency_7d: 2 })).toBe(false);
    expect(fatigued({ hook_rate: 0.24, first_week_hook_rate: 0.24, frequency_7d: 3.1 })).toBe(true);
    expect(rankable(999)).toBe(false);
    expect(rankable(1000)).toBe(true);
  });

  it("counts working days with the market weekend and checks the track SLA", () => {
    const mon = new Date("2026-10-19T09:00:00Z");
    expect(workingDaysBetween(mon, new Date("2026-10-26T09:00:00Z"))).toBe(5);
    expect(workingDaysBetween(mon, new Date("2026-10-26T09:00:00Z"), [5, 6])).toBe(5);
    expect(deliveryOnTime("A", 3)).toBe(true);
    expect(deliveryOnTime("A", 4)).toBe(false);
  });

  it("marks a take-down overdue after 24 hours", () => {
    const at = new Date("2026-10-22T10:00:00Z");
    expect(takedownOverdue(at, new Date("2026-10-23T09:00:00Z"))).toBe(false);
    expect(takedownOverdue(at, new Date("2026-10-23T11:00:00Z"))).toBe(true);
    expect(takedownOverdue(at, new Date("2026-10-25T00:00:00Z"), new Date("2026-10-22T20:00:00Z"))).toBe(false);
  });
});

describe("system prompt", () => {
  it("puts the brain and the rules of each job market into the preamble", () => {
    const { model, system } = buildSystemPrompt("video/hook_writer@1", { client_id: "c1", organization: { name: "Acme" } }, ["GB", "AE"]);
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("for the client Acme");
    expect(system).toContain("\"AE\":");
    expect(system).toContain("exactly 5 hooks");
    expect(system).not.toContain("{brain}");
  });
});
