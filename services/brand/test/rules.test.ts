import { describe, expect, it } from "vitest";
import { stagesFor, STAGES } from "../src/packages.js";
import { checkAuthorship, findClearanceLanguage, findPersonalNames } from "../src/guardrails.js";
import { driftMonths, isDrifting } from "../src/drift.js";
import { buildSystemPrompt } from "../src/prompt.js";
import { loadPrompt, validateOutput } from "../src/registry.js";
import { readdirSync } from "node:fs";
import { dir } from "../src/paths.js";

describe("packages", () => {
  it("has 18 stages in order", () => {
    expect(STAGES.map((s) => s.n)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it("runs stages 1, 2, 8, 15, 16, 17, 18 in Package A", () => {
    expect(stagesFor({ package: "A" }).map((s) => s.n)).toEqual([1, 2, 8, 15, 16, 17, 18]);
  });

  it("runs all 18 stages in Package C", () => {
    expect(stagesFor({ package: "C" })).toHaveLength(18);
  });

  it("adds the legal screen and market adaptation to Package B only when in scope", () => {
    const base = stagesFor({ package: "B" }).map((s) => s.n);
    expect(base).not.toContain(9);
    expect(base).not.toContain(13);
    const full = stagesFor({ package: "B", newNameOrTagline: true, gccOrQuebec: true }).map((s) => s.n);
    expect(full).toContain(9);
    expect(full).toContain(13);
  });

  it("ends every package with the brain go-live gate and monitoring", () => {
    for (const p of ["A", "B", "C"] as const) expect(stagesFor({ package: p }).slice(-2).map((s) => s.id)).toEqual(["approve_brain", "monitor"]);
  });
});

describe("guardrails", () => {
  it("catches clearance language about names", () => {
    expect(findClearanceLanguage("Ledgerly is legally clear in the UK and is available to register.")).toHaveLength(2);
    expect(findClearanceLanguage("No obvious problem found in this screen.")).toEqual([]);
  });

  it("catches names in interview quotes", () => {
    expect(findPersonalNames("We close in 5 days now, said Priya Shah.")).toEqual(["Priya Shah"]);
    expect(findPersonalNames("Interview INT-04: close takes 12 days.", ["Priya"])).toEqual([]);
  });

  it("allows AI mood boards but not an AI-only final logo", () => {
    expect(checkAuthorship({ kind: "moodboard", made_by: "ai" })).toBeNull();
    expect(checkAuthorship({ kind: "final_logo", made_by: "ai" })).toMatch(/human designer/);
    expect(checkAuthorship({ kind: "final_logo", made_by: "ai_assisted" })).toBeNull();
  });
});

describe("drift", () => {
  it("counts the latest months under 70 in a row", () => {
    expect(driftMonths([82, 68, 75, 69, 66])).toBe(2);
    expect(driftMonths([60, 60, 71])).toBe(0);
  });

  it("alerts after 2 months", () => {
    expect(isDrifting([80, 69])).toBe(false);
    expect(isDrifting([80, 69, 65])).toBe(true);
  });
});

describe("prompts and schemas", () => {
  it("loads every prompt file with a matching header", () => {
    const files = readdirSync(dir("prompts")).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    expect(files.length).toBeGreaterThanOrEqual(16);
    for (const f of files) {
      const p = loadPrompt(`brand/${f.replace(".md", "")}@1`);
      expect(["claude-opus-5-5", "claude-haiku-5-5"]).toContain(p.model);
      expect(p.task.length).toBeGreaterThan(50);
    }
  });

  it("fills the preamble with the client context", () => {
    const { system, model } = buildSystemPrompt("brand/positioning_strategist@1", { clientName: "Ledgerly", markets: ["UK", "GCC"], b2bOrB2c: "b2b", package: "C" });
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("client Ledgerly");
    expect(system).toContain("UK, GCC");
    expect(system).not.toMatch(/\{\{/);
  });

  it("makes the positioning agent return exactly 3 routes", () => {
    const route = { name: "r", idea: "i", statement: "s", pillars: [1, 2, 3].map((n) => ({ name: `p${n}`, proof_points: [] })), why_win: "w", risks: [], market_fit: [] };
    expect(validateOutput("brand/routes@1", { routes: [route, route, route], recommended: "r", reason: "x" }).valid).toBe(true);
    expect(validateOutput("brand/routes@1", { routes: [route, route], recommended: "r", reason: "x" }).valid).toBe(false);
  });

  it("makes the name screener carry the trademark disclaimer", () => {
    const ok = { results: [], top10: [], disclaimer: "Linguistic screen only. Not a trademark search." };
    expect(validateOutput("brand/name_screen@1", ok).valid).toBe(true);
    expect(validateOutput("brand/name_screen@1", { ...ok, disclaimer: "All clear" }).valid).toBe(false);
  });

  it("makes every adapted locale need a native review", () => {
    expect(validateOutput("brand/adaptation@1", { locales: [{ locale: "ar-AE", needs_native_review: false }], culture_flags: [] }).valid).toBe(false);
  });
});
