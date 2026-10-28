import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { createValidator, validateOutput } from "../src/registry.js";

const files = readdirSync(dir("schemas")).filter((f) => f.endsWith(".json")).sort();

describe("agent output schemas", () => {
  it("has 1 schema for each of the 8 agents", () => {
    expect(files.map((f) => f.replace(".json", ""))).toEqual([
      "account_researcher", "buying_committee_mapper", "icp_account_scorer", "intent_monitor",
      "personalizer", "play_orchestrator", "reporter", "sales_handoff",
    ]);
  });

  it("compiles every schema in strict mode", () => {
    expect(() => createValidator()).not.toThrow();
  });

  for (const f of files) {
    const schema = JSON.parse(readFileSync(dir("schemas", f), "utf8"));
    it(`${f} has the id abm/<name>@1 and rejects unknown fields`, () => {
      expect(schema.$id).toBe(`abm/${f.replace(".json", "")}@1`);
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(schema.additionalProperties).toBe(false);
      expect(validateOutput(schema.$id, {}).valid).toBe(false);
      expect(validateOutput(schema.$id, { unexpected: true }).valid).toBe(false);
    });
  }

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("abm/nope@1", {})).toThrow(/Unknown output schema/);
  });
});
