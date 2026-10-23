import { describe, expect, it } from "vitest";
import { compileBrain, type BrainBundle } from "../src/compile.js";
import { readJson, validateBrandProfile } from "../src/registry.js";
import { dir } from "../src/paths.js";

const CLIENT = "00000000-0000-4000-8000-000000000013";
const example = readJson(dir("examples", "brand-profile.example.json"));
const chunk = (n = 250) => Array.from({ length: n }, () => "word").join(" ");
const samples = (s: string) => Array.from({ length: 20 }, (_, i) => `${s} ${i}`);

function bundle(over: Partial<BrainBundle> = {}): BrainBundle {
  const { client_id, version, status, ...doc } = example;
  return {
    profile_doc: doc,
    claims: [],
    banned_terms: [{ term: "revolutionary", reason: "Hype" }],
    chunks: [{ source: "guideline", source_ref: "logo", locale: "en-GB", content: chunk() }],
    scorer_test_set: { on_brand: samples("good"), off_brand: samples("bad") },
    unmapped: [],
    ...over,
  };
}

describe("example brand profile", () => {
  it("validates against the engine brand-profile.json", () => {
    const r = validateBrandProfile(example);
    expect(r.valid, JSON.stringify(r.errors)).toBe(true);
  });

  it("uses the 8 brand fields the engine added for this service", () => {
    for (const k of ["messaging", "boilerplate", "taglines"]) expect(example).toHaveProperty(k);
    for (const k of ["tone_by_situation", "style_rules"]) expect(example.voice).toHaveProperty(k);
    for (const k of ["logo_rules", "templates", "color_roles"]) expect(example.visual).toHaveProperty(k);
  });
});

describe("compileBrain", () => {
  it("compiles a clean bundle into a valid draft", () => {
    const r = compileBrain(bundle(), CLIENT, 3);
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.profile).toMatchObject({ client_id: CLIENT, version: 3, status: "draft" });
    expect(validateBrandProfile(r.profile).valid).toBe(true);
  });

  it("never lets an agent approve a profile", () => {
    const b = bundle();
    b.profile_doc.status = "approved";
    const r = compileBrain(b, CLIENT, 1);
    expect(r.profile.status).toBe("draft");
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toMatch(/only the go-live gate approves/);
  });

  it("turns an approved claim with no approval id back into a proposed claim", () => {
    const r = compileBrain(bundle({ claims: [{ text: "Close in 5 days", status: "approved" }] }), CLIENT, 1);
    expect(r.claims[0].status).toBe("proposed");
    expect(r.ok).toBe(false);
  });

  it("keeps an approved claim that has an approval id", () => {
    const r = compileBrain(bundle({ claims: [{ text: "Close in 5 days", status: "approved", approval_id: "apr_1" }] }), CLIENT, 1);
    expect(r.claims[0].status).toBe("approved");
    expect(r.ok).toBe(true);
  });

  it("blocks approved_claims in the profile that have no approval", () => {
    const b = bundle();
    b.profile_doc.approved_claims = [{ id: "00000000-0000-4000-8000-000000000001", text: "Saves 50%", markets: ["GB"] }];
    const r = compileBrain(b, CLIENT, 1);
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/Saves 50%/);
  });

  it("requires a reason on every banned term", () => {
    const r = compileBrain(bundle({ banned_terms: [{ term: "cheap" }] }), CLIENT, 1);
    expect(r.ok).toBe(false);
  });

  it("keeps chunks between 200 and 400 words", () => {
    expect(compileBrain(bundle({ chunks: [{ source: "guideline", content: chunk(150) }] }), CLIENT, 1).ok).toBe(false);
    expect(compileBrain(bundle({ chunks: [{ source: "guideline", content: chunk(401) }] }), CLIENT, 1).ok).toBe(false);
    expect(compileBrain(bundle({ chunks: [{ source: "guideline", content: chunk(400) }] }), CLIENT, 1).ok).toBe(true);
  });

  it("reports unmapped content without blocking the draft", () => {
    const r = compileBrain(bundle({ unmapped: ["brand architecture"] }), CLIENT, 1);
    expect(r.ok).toBe(true);
    expect(r.problems[0]).toMatch(/Unmapped/);
  });

  it("blocks a profile with a field the engine schema does not have", () => {
    const b = bundle();
    b.profile_doc.brand_architecture = "branded house";
    const r = compileBrain(b, CLIENT, 1);
    expect(r.ok).toBe(false);
    expect(r.schemaErrors.length).toBeGreaterThan(0);
  });

  it("rejects a bundle without a full scorer test set", () => {
    const r = compileBrain(bundle({ scorer_test_set: { on_brand: ["a"], off_brand: [] } }), CLIENT, 1);
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toMatch(/brain_bundle@1/);
  });
});
