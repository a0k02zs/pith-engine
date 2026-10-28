import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { marketRule } from "../src/markets.js";
import { buildSystemPrompt } from "../src/prompt.js";
import { loadPreamble, loadPrompt } from "../src/registry.js";

const names = readdirSync(dir("prompts")).filter((f) => f.endsWith(".md") && !f.startsWith("_")).map((f) => f.replace(".md", ""));

describe("agent prompts", () => {
  it("has a prompt for each output schema", () => {
    const schemas = readdirSync(dir("schemas")).map((f) => f.replace(".json", "")).sort();
    expect(names.sort()).toEqual(schemas);
  });

  for (const n of names) {
    it(`${n} has a matching header and a current model`, () => {
      const p = loadPrompt(`abm/${n}@1`);
      expect(p.model).toMatch(/^claude-(opus|sonnet|haiku)-5-5$/);
      expect(p.task.length).toBeGreaterThan(200);
    });
  }

  it("has placeholders for the client brain and market rules in the preamble", () => {
    const pre = loadPreamble();
    for (const ph of ["{brain.client_name}", "{brain}", "{market_rules}"]) expect(pre).toContain(ph);
  });

  it("fills the preamble and appends the agent task", () => {
    const { model, system } = buildSystemPrompt("abm/sales_handoff@1", { client_id: "cl_1", organization: { name: "Acme" } }, marketRule("GB"));
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("Acme");
    expect(system).toContain('"currency":"GBP"');
    expect(system).not.toMatch(/\{brain|\{market_rules\}/);
    expect(system).toContain(loadPrompt("abm/sales_handoff@1").task);
  });

  it("rejects refs that are not ABM version 1", () => {
    expect(() => loadPrompt("email/write@1")).toThrow(/Unknown prompt ref/);
    expect(() => loadPrompt("abm/sales_handoff@2")).toThrow(/Unknown prompt ref/);
  });
});
