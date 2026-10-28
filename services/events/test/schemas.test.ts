import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { buildSystemPrompt, loadPrompt, marketRules, validateOutput } from "../src/index.js";

const schemaFiles = readdirSync(dir("schemas")).filter((f) => f.endsWith(".json"));
const promptFiles = readdirSync(dir("prompts")).filter((f) => f.endsWith(".md") && !f.startsWith("_"));

const followUp = {
  contact_id: "c1",
  subject: "Your replay: Close the books faster",
  body: "Hi Sam, thanks for joining.",
  suggested_extra: "",
  resources_used: ["https://example.com/guide"],
  template_id: "tpl-engaged-GB",
  template_approved: true,
  only_merge_fields_changed: true,
  new_claim_requests: [],
};

describe("output schemas", () => {
  it("has 11 schemas, each with an $id that matches its file and a closed top level", () => {
    expect(schemaFiles).toHaveLength(11);
    for (const f of schemaFiles) {
      const s = JSON.parse(readFileSync(dir("schemas", f), "utf8"));
      expect(s.$id).toBe(`events/${f.replace(".json", "")}@1`);
      expect(s.additionalProperties).toBe(false);
    }
  });

  it("accepts a filled follow-up and needs the fields the template gate reads", () => {
    expect(validateOutput("events/follow_up@1", followUp).valid).toBe(true);
    for (const key of ["template_approved", "only_merge_fields_changed", "new_claim_requests"]) {
      const { [key]: _, ...rest } = followUp as Record<string, unknown>;
      expect(validateOutput("events/follow_up@1", rest).valid, key).toBe(false);
    }
  });

  it("allows at most 2 resources in a follow-up", () => {
    expect(validateOutput("events/follow_up@1", { ...followUp, resources_used: ["a", "b", "c"] }).valid).toBe(false);
  });

  it("accepts only the known question classes in live Q&A", () => {
    const t = { class: "press", escalate: true, hand_raise: false, matched_prepared_answer: null, draft_answer: "", needs_live_speaker: false, priority: "high" };
    expect(validateOutput("events/qa_triage@1", t).valid).toBe(true);
    expect(validateOutput("events/qa_triage@1", { ...t, class: "angry" }).valid).toBe(false);
  });

  it("caps pacing actions at 3 and uses the 3 pacing statuses", () => {
    const action = { market: "GB", action: "email_new_segment", expected_registrations: 40, cost: 0, needs_budget_gate: false, reason: "Engaged segment not yet invited" };
    const pacing = { by_market: [{ market: "GB", target_to_date: 200, actual_to_date: 150, status: "at_risk" }], actions: [action], blockers: [] };
    expect(validateOutput("events/pacing@1", pacing).valid).toBe(true);
    expect(validateOutput("events/pacing@1", { ...pacing, actions: [action, action, action, action] }).valid).toBe(false);
    expect(validateOutput("events/pacing@1", { ...pacing, by_market: [{ ...pacing.by_market[0], status: "late" }] }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("events/nope@1", {})).toThrow(/Unknown output schema/);
  });
});

describe("prompts", () => {
  it("has 11 agent prompts with a matching ref and a current model", () => {
    expect(promptFiles).toHaveLength(11);
    for (const f of promptFiles) {
      const ref = `events/${f.replace(".md", "")}@1`;
      const p = loadPrompt(ref);
      expect(["claude-opus-5-5", "claude-haiku-5-5"]).toContain(p.model);
      expect(p.task.length).toBeGreaterThan(50);
    }
  });

  it("builds a system prompt with the client name, brain and market rules filled in", () => {
    const brain = { client_id: "cl_1", organization: { name: "Ledgerly" }, approved_claims: [] };
    const { model, system } = buildSystemPrompt("events/follow_up_writer@1", brain, marketRules("GB"));
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("for the client Ledgerly.");
    expect(system).toContain('"timezone":"Europe/London"');
    expect(system).not.toMatch(/\{brain|\{market_rules\}/);
    expect(system).toContain("You do not write new copy.");
  });
});
