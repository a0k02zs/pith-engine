import { describe, expect, it } from "vitest";
import { analyze, durationMs, evaluate, ExprError, render, templateExprs, test as cond } from "../src/expr.ts";

const vars = {
  input: { tier: 1, spend: 2.5, flag: false, markets: ["GB", "SG"], name: "Pith", end: "2026-11-01" },
  steps: { write: { output: { ids: [], ok: true, items: [{ x: 5 }, { x: 1 }], n: 3 }, timed_out: false } },
  run: { loops: { draft: 1 } },
  now: { iso: "2026-11-12T10:00:00.000Z", weekday: "Thursday" },
  event: { data: { id: "a" } },
};

describe("expressions", () => {
  it.each([
    ["input.tier == 1", true],
    ["input.spend > 0 || input.flag == true", true],
    ["size(steps.write.output.ids) == 0 && steps.write.output.ok", true],
    ["steps.write.output.items.exists(a, a.x > 3)", true],
    ["steps.write.output.items.all(a, a.x > 3)", false],
    ["size(steps.write.output.items.filter(a, a.x > 3)) == 1", true],
    ["steps.write.output.n * 2 > 5.5", true],
    ["steps.write.output.n / 2 == 1.5", true],
    ["'GB' in input.markets", true],
    ["input.missing == null", true],
    ["input.missing.deeper.more == null", true],
    ["!input.missing", true],
    ["has(input.missing)", false],
    ["has(input.tier) ? input.tier : 9", 1],
    ["(has(input.none) ? input.none : input.name) == 'Pith'", true],
    ["input.missing > 3", false],
    ["size(input.missing) == 0", true],
    ["input.missing.exists(a, a.ok)", false],
    ["now.iso >= input.end", true],
    ["now.weekday == 'Thursday'", true],
    ["run.loops.draft < 2", true],
    ["input.name.startsWith('Pi') && input.name.contains('th')", true],
    ["-input.tier + 3 % 2", 0],
    ["[1, 2] + [3]", [1, 2, 3]],
    ["{'a': 1}.a", 1],
    ["input.markets[0]", "GB"],
    ["input.markets.map(m, m + '!')", ["GB!", "SG!"]],
    ["event.data.id == 'a'", true],
  ])("%s", (expr, want) => expect(evaluate(expr, vars)).toEqual(want));

  it("refuses a name that is not defined, and JavaScript syntax", () => {
    expect(() => evaluate("budget.remaining > 1", vars)).toThrow(ExprError);
    expect(() => evaluate("input.markets.some(a => a)", vars)).toThrow(ExprError);
    expect(() => evaluate("input.tier === 1", vars)).toThrow(ExprError);
    expect(() => evaluate("input.name > 3", vars)).toThrow(/cannot compare/);
    expect(() => evaluate("coalesce(input.a, 1)", vars)).toThrow(/not defined/);
  });

  it("gives false and the error when a condition fails", () => {
    expect(cond("input.name > 3", vars)).toEqual({ value: false, error: expect.stringContaining("cannot compare") });
    expect(cond("input.tier == 1", vars)).toEqual({ value: true });
  });

  it("finds names, step ids and problems without data", () => {
    const a = analyze("steps.write.output.items.exists(a, a.x > input.tier) && event.data.id == run.id");
    expect(a.problems).toEqual([]);
    expect(a.roots.sort()).toEqual(["event", "input", "run", "steps"]);
    expect(a.steps).toEqual(["write"]);
    expect(analyze("async.data.x == output.plan").problems).toHaveLength(2);
    expect(analyze("any(input.list, a => a.ok)").problems).toHaveLength(1);
    expect(analyze("messaging.checkCaps(input.a)").problems.join()).toMatch(/messaging/);
  });

  it("fills templates and reads durations", () => {
    expect(templateExprs("{{ input.name }}.campaign_assets")).toEqual(["input.name"]);
    expect(render("{{ input.name }}.x and ${input.tier}", vars)).toBe("Pith.x and 1");
    expect(durationMs("90m")).toBe(5_400_000);
    expect(durationMs("2w")).toBe(1_209_600_000);
    expect(durationMs(30)).toBe(30_000);
    expect(durationMs("flow.delay")).toBeNull();
  });
});
