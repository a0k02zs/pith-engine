import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { loadPreamble, loadPrompt, validateOutput } from "../src/registry.js";

const names = readdirSync(dir("schemas"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

const reply = {
  class: "positive",
  risk: "green",
  risk_reasons: [],
  suspected_policy_violation: false,
  violation_reason: null,
  language: "en-GB",
  reply: "Thank you, Sam. We are glad the boots fit well.",
  themes: ["fit"],
};

const grant = {
  scope: ["likeness", "ugc_reuse"],
  markets: ["GB"],
  channels: ["instagram"],
  starts_at: "2026-10-01T00:00:00Z",
  expires_at: "2027-10-01T00:00:00Z",
  evidence_ref: "dm:123",
  person_name: "Sam Lee",
  is_minor: false,
};

const rights = {
  action: "record_grant",
  message: null,
  channel: "instagram",
  reply_class: "agreed",
  rights_level: "R1",
  grants: [grant],
  approval_needed: null,
  notes: "",
};

const host = {
  action: "reply",
  channel: "questions",
  text: "Hi, I am Pip, the AI assistant here.",
  is_ai_disclosed: true,
  handover_to: null,
  handover_reason: null,
};

const moderation = {
  label: "red",
  category: "legal_threat",
  reasons: ["mentions a lawyer"],
  action: "hide_and_escalate",
  escalation_reason: "legal",
  note_to_member: null,
};

describe("output schemas", () => {
  it.each(names)("%s has a matching prompt and rejects an empty object", (n) => {
    const ref = `community/${n}@1`;
    expect(loadPrompt(ref).task).toContain(`schema ${ref}`);
    expect(validateOutput(ref, {}).valid).toBe(false);
  });

  it("preamble carries the brain and market rules slots", () => {
    const p = loadPreamble();
    expect(p).toContain("{brain}");
    expect(p).toContain("{market_rules}");
  });

  it("accepts a well-formed review reply and rejects an unknown class", () => {
    expect(validateOutput("community/review_replier@1", reply).valid).toBe(true);
    expect(validateOutput("community/review_replier@1", { ...reply, class: "angry" }).valid).toBe(false);
    expect(validateOutput("community/review_replier@1", { ...reply, extra: 1 }).valid).toBe(false);
  });

  it("accepts an adult grant and needs guardian evidence for a minor", () => {
    expect(validateOutput("community/rights_agent@1", rights).valid).toBe(true);
    const minor = { ...rights, grants: [{ ...grant, is_minor: true }] };
    expect(validateOutput("community/rights_agent@1", minor).valid).toBe(false);
    const withGuardian = { ...rights, grants: [{ ...grant, is_minor: true, guardian_evidence_ref: "esign:9" }] };
    expect(validateOutput("community/rights_agent@1", withGuardian).valid).toBe(true);
  });

  it("rejects a grant with a non-ISO market or no scope", () => {
    expect(validateOutput("community/rights_agent@1", { ...rights, grants: [{ ...grant, markets: ["GBR"] }] }).valid).toBe(false);
    expect(validateOutput("community/rights_agent@1", { ...rights, grants: [{ ...grant, scope: [] }] }).valid).toBe(false);
  });

  it("accepts host and moderator outputs", () => {
    expect(validateOutput("community/host@1", host).valid).toBe(true);
    expect(validateOutput("community/host@1", { ...host, is_ai_disclosed: "yes" }).valid).toBe(false);
    expect(validateOutput("community/moderator@1", moderation).valid).toBe(true);
    expect(validateOutput("community/moderator@1", { ...moderation, escalation_reason: "boredom" }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("community/nope@1", {})).toThrow(/Unknown output schema/);
  });
});
