// Workflow expressions. The syntax is the CEL subset that specs/workflow.md defines.
// This file has no imports, so the workflow linter can load it without an install step.
//
// Rules that differ from strict CEL, because step outputs are loose JSON:
//   - there is 1 number type (no int and double split);
//   - a field that does not exist is null, and a field of null is null;
//   - null and false are false in !, &&, || and ?: (all other values use JavaScript truth);
//   - a root name that is not defined is an error.

export class ExprError extends Error {}

export type Node =
  | { t: "lit"; v: unknown }
  | { t: "id"; n: string }
  | { t: "get"; o: Node; k: string }
  | { t: "idx"; o: Node; i: Node }
  | { t: "call"; f: string; a: Node[] }
  | { t: "mcall"; o: Node; f: string; a: Node[] }
  | { t: "un"; op: string; x: Node }
  | { t: "bin"; op: string; l: Node; r: Node }
  | { t: "cond"; c: Node; a: Node; b: Node }
  | { t: "list"; e: Node[] }
  | { t: "map"; e: [Node, Node][] };

/** The names an expression can read. `event` is the trigger event, or the incoming event in wait.match. */
export const ROOTS = ["input", "steps", "client", "brain", "run", "now", "event"] as const;
export const FUNCTIONS = ["size", "has", "int", "double", "string", "bool", "abs", "min", "max"] as const;
export const MACROS = ["exists", "all", "map", "filter", "exists_one"] as const;
export const METHODS = ["size", "contains", "startsWith", "endsWith", "matches", "lowerAscii", "upperAscii"] as const;

type Tok = { k: "num" | "str" | "id" | "op" | "end"; v: string; at: number };
const OPS = ["||", "&&", "==", "!=", "<=", ">=", "<", ">", "+", "-", "*", "/", "%", "!", "?", ":", ".", ",", "(", ")", "[", "]", "{", "}"];

function tokens(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/.exec(src.slice(i))!;
      out.push({ k: "num", v: m[0], at: i });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      out.push({ k: "id", v: m[0], at: i });
      i += m[0].length;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\" && j + 1 < src.length) {
          const e = src[j + 1];
          s += e === "n" ? "\n" : e === "t" ? "\t" : e;
          j += 2;
        } else s += src[j++];
      }
      if (j >= src.length) throw new ExprError(`string has no end at position ${i}`);
      out.push({ k: "str", v: s, at: i });
      i = j + 1;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new ExprError(`unexpected '${c}' at position ${i}`);
    // '=>' and '=' are not operators: JavaScript arrow functions are not valid here.
    out.push({ k: "op", v: op, at: i });
    i += op.length;
  }
  out.push({ k: "end", v: "", at: src.length });
  return out;
}

const cache = new Map<string, Node>();

/** Parses an expression. Throws ExprError when the text is not a valid expression. */
export function parse(src: string): Node {
  const hit = cache.get(src);
  if (hit) return hit;
  const toks = tokens(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => toks[p].k === "op" && toks[p].v === v;
  const eat = (v: string) => {
    if (!isOp(v)) throw new ExprError(`expected '${v}' at position ${toks[p].at}, found '${toks[p].v || "end"}'`);
    p++;
  };
  const args = (close: string): Node[] => {
    const a: Node[] = [];
    if (!isOp(close)) {
      do a.push(ternary());
      while (isOp(",") && ++p);
    }
    eat(close);
    return a;
  };
  const binary = (next: () => Node, ops: string[]): Node => {
    let l = next();
    while (toks[p].k === "op" && ops.includes(toks[p].v)) {
      const op = toks[p++].v;
      l = { t: "bin", op, l, r: next() };
    }
    return l;
  };
  function ternary(): Node {
    const c = or();
    if (!isOp("?")) return c;
    p++;
    const a = ternary();
    eat(":");
    return { t: "cond", c, a, b: ternary() };
  }
  const or = (): Node => binary(and, ["||"]);
  const and = (): Node => binary(rel, ["&&"]);
  function rel(): Node {
    const l = add();
    const t = peek();
    if (t.k === "op" && ["==", "!=", "<", "<=", ">", ">="].includes(t.v)) {
      p++;
      return { t: "bin", op: t.v, l, r: add() };
    }
    if (t.k === "id" && t.v === "in") {
      p++;
      return { t: "bin", op: "in", l, r: add() };
    }
    return l;
  }
  const add = (): Node => binary(mul, ["+", "-"]);
  const mul = (): Node => binary(unary, ["*", "/", "%"]);
  function unary(): Node {
    if (isOp("!") || isOp("-")) return { t: "un", op: toks[p++].v, x: unary() };
    return postfix();
  }
  function postfix(): Node {
    let n = primary();
    for (;;) {
      if (isOp(".")) {
        p++;
        const id = toks[p++];
        if (id.k !== "id") throw new ExprError(`expected a field name at position ${id.at}`);
        if (isOp("(")) {
          p++;
          n = { t: "mcall", o: n, f: id.v, a: args(")") };
        } else n = { t: "get", o: n, k: id.v };
      } else if (isOp("[")) {
        p++;
        const i = ternary();
        eat("]");
        n = { t: "idx", o: n, i };
      } else return n;
    }
  }
  function primary(): Node {
    const t = toks[p++];
    if (t.k === "num") return { t: "lit", v: Number(t.v) };
    if (t.k === "str") return { t: "lit", v: t.v };
    if (t.k === "id") {
      if (t.v === "true") return { t: "lit", v: true };
      if (t.v === "false") return { t: "lit", v: false };
      if (t.v === "null") return { t: "lit", v: null };
      if (isOp("(")) {
        p++;
        return { t: "call", f: t.v, a: args(")") };
      }
      return { t: "id", n: t.v };
    }
    if (t.k === "op" && t.v === "(") {
      const n = ternary();
      eat(")");
      return n;
    }
    if (t.k === "op" && t.v === "[") return { t: "list", e: args("]") };
    if (t.k === "op" && t.v === "{") {
      const e: [Node, Node][] = [];
      if (!isOp("}")) {
        do {
          const k = ternary();
          eat(":");
          e.push([k, ternary()]);
        } while (isOp(",") && ++p);
      }
      eat("}");
      return { t: "map", e };
    }
    throw new ExprError(`unexpected '${t.v || "end"}' at position ${t.at}`);
  }
  const node = ternary();
  if (peek().k !== "end") throw new ExprError(`unexpected '${peek().v}' at position ${peek().at}`);
  cache.set(src, node);
  return node;
}

const truthy = (v: unknown) => v !== null && v !== undefined && v !== false && Boolean(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function equal(a: unknown, b: unknown): boolean {
  if (a === undefined) a = null;
  if (b === undefined) b = null;
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function compare(op: string, a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  const both = (typeof a === "number" && typeof b === "number") || (typeof a === "string" && typeof b === "string");
  if (!both) throw new ExprError(`cannot compare ${typeof a} ${op} ${typeof b}`);
  const x = a as number;
  const y = b as number;
  return op === "<" ? x < y : op === "<=" ? x <= y : op === ">" ? x > y : x >= y;
}

function size(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "string" || Array.isArray(v)) return v.length;
  if (isObj(v)) return Object.keys(v).length;
  throw new ExprError(`size() needs a list, a map or a string, not ${typeof v}`);
}

const num = (v: unknown, op: string): number => {
  if (typeof v !== "number") throw new ExprError(`'${op}' needs numbers, found ${v === null ? "null" : typeof v}`);
  return v;
};

export type Vars = Record<string, unknown>;

function run(n: Node, vars: Vars, bound: Vars): unknown {
  switch (n.t) {
    case "lit":
      return n.v;
    case "id":
      if (n.n in bound) return bound[n.n];
      if (Object.hasOwn(vars, n.n)) return vars[n.n];
      throw new ExprError(`'${n.n}' is not defined`);
    case "get": {
      const o = run(n.o, vars, bound);
      return isObj(o) && Object.hasOwn(o, n.k) ? (o[n.k] ?? null) : null;
    }
    case "idx": {
      const o = run(n.o, vars, bound);
      const i = run(n.i, vars, bound);
      if (Array.isArray(o) && typeof i === "number") return o[i < 0 ? o.length + i : i] ?? null;
      if (isObj(o) && typeof i === "string") return Object.hasOwn(o, i) ? (o[i] ?? null) : null;
      return null;
    }
    case "list":
      return n.e.map((e) => run(e, vars, bound));
    case "map":
      return Object.fromEntries(n.e.map(([k, v]) => [String(run(k, vars, bound)), run(v, vars, bound)]));
    case "un": {
      const x = run(n.x, vars, bound);
      return n.op === "!" ? !truthy(x) : -num(x, "-");
    }
    case "cond":
      return truthy(run(n.c, vars, bound)) ? run(n.a, vars, bound) : run(n.b, vars, bound);
    case "bin": {
      if (n.op === "&&") return truthy(run(n.l, vars, bound)) && truthy(run(n.r, vars, bound));
      if (n.op === "||") return truthy(run(n.l, vars, bound)) || truthy(run(n.r, vars, bound));
      const l = run(n.l, vars, bound);
      const r = run(n.r, vars, bound);
      switch (n.op) {
        case "==":
          return equal(l, r);
        case "!=":
          return !equal(l, r);
        case "<":
        case "<=":
        case ">":
        case ">=":
          return compare(n.op, l, r);
        case "in":
          if (r == null) return false;
          if (Array.isArray(r)) return r.some((x) => equal(x, l));
          if (isObj(r)) return typeof l === "string" && Object.hasOwn(r, l);
          throw new ExprError("'in' needs a list or a map on the right side");
        case "+":
          if (typeof l === "string" && typeof r === "string") return l + r;
          if (Array.isArray(l) && Array.isArray(r)) return [...l, ...r];
          return num(l, "+") + num(r, "+");
        case "-":
          return num(l, "-") - num(r, "-");
        case "*":
          return num(l, "*") * num(r, "*");
        case "/":
          if (num(r, "/") === 0) throw new ExprError("division by 0");
          return num(l, "/") / (r as number);
        case "%":
          if (num(r, "%") === 0) throw new ExprError("division by 0");
          return num(l, "%") % (r as number);
      }
      throw new ExprError(`unknown operator '${n.op}'`);
    }
    case "call": {
      if (n.f === "has") {
        if (n.a.length !== 1) throw new ExprError("has() takes 1 field");
        return run(n.a[0], vars, bound) != null;
      }
      const a = n.a.map((x) => run(x, vars, bound));
      switch (n.f) {
        case "size":
          return size(a[0]);
        case "int":
          return Math.trunc(Number(a[0]));
        case "double":
          return Number(a[0]);
        case "string":
          return a[0] == null ? "" : typeof a[0] === "object" ? JSON.stringify(a[0]) : String(a[0]);
        case "bool":
          return a[0] === "false" ? false : truthy(a[0]);
        case "abs":
          return Math.abs(num(a[0], "abs"));
        case "min":
          return Math.min(...a.map((x) => num(x, "min")));
        case "max":
          return Math.max(...a.map((x) => num(x, "max")));
      }
      throw new ExprError(`function '${n.f}()' is not defined`);
    }
    case "mcall": {
      const o = run(n.o, vars, bound);
      if ((MACROS as readonly string[]).includes(n.f)) {
        const v = n.a[0];
        if (n.a.length !== 2 || v.t !== "id") throw new ExprError(`.${n.f}() takes a name and an expression, for example .${n.f}(a, a.ok)`);
        const list = o == null ? [] : Array.isArray(o) ? o : isObj(o) ? Object.keys(o) : null;
        if (!list) throw new ExprError(`.${n.f}() needs a list or a map`);
        const each = (x: unknown) => run(n.a[1], vars, { ...bound, [v.n]: x });
        if (n.f === "exists") return list.some((x) => truthy(each(x)));
        if (n.f === "all") return list.every((x) => truthy(each(x)));
        if (n.f === "exists_one") return list.filter((x) => truthy(each(x))).length === 1;
        if (n.f === "filter") return list.filter((x) => truthy(each(x)));
        return list.map(each);
      }
      const a = n.a.map((x) => run(x, vars, bound));
      if (n.f === "size") return size(o);
      if (n.f === "contains") return Array.isArray(o) ? o.some((x) => equal(x, a[0])) : typeof o === "string" && o.includes(String(a[0]));
      if (o == null) return n.f === "lowerAscii" || n.f === "upperAscii" ? null : false;
      if (typeof o !== "string") throw new ExprError(`.${n.f}() needs a string`);
      if (n.f === "startsWith") return o.startsWith(String(a[0]));
      if (n.f === "endsWith") return o.endsWith(String(a[0]));
      if (n.f === "matches") return new RegExp(String(a[0])).test(o);
      if (n.f === "lowerAscii") return o.toLowerCase();
      if (n.f === "upperAscii") return o.toUpperCase();
      throw new ExprError(`method '.${n.f}()' is not defined`);
    }
  }
}

/** Evaluates an expression. Throws ExprError on a syntax error, an undefined name or a type error. */
export function evaluate(src: string, vars: Vars): unknown {
  return run(parse(src), vars, {});
}

/** Evaluates a condition. Returns { value: false, error } when the expression fails, so that the caller takes the safe path. */
export function test(src: string, vars: Vars): { value: boolean; error?: string } {
  try {
    return { value: truthy(evaluate(src, vars)) };
  } catch (e) {
    return { value: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface Analysis {
  /** Root names the expression reads. */
  roots: string[];
  /** Step ids read through steps.<id>. */
  steps: string[];
  /** Problems that make the expression invalid: syntax, undefined names, undefined functions. */
  problems: string[];
}

/** Checks an expression without data: syntax, root names and function names. */
export function analyze(src: string, roots: readonly string[] = ROOTS): Analysis {
  const out: Analysis = { roots: [], steps: [], problems: [] };
  let node: Node;
  try {
    node = parse(src);
  } catch (e) {
    out.problems.push(e instanceof Error ? e.message : String(e));
    return out;
  }
  const seen = new Set<string>();
  const steps = new Set<string>();
  const walk = (n: Node, bound: Set<string>): void => {
    switch (n.t) {
      case "lit":
        return;
      case "id":
        if (bound.has(n.n)) return;
        if (roots.includes(n.n)) seen.add(n.n);
        else out.problems.push(`'${n.n}' is not a defined name (use ${roots.join(", ")})`);
        return;
      case "get":
        if (n.o.t === "id" && n.o.n === "steps" && !bound.has("steps")) steps.add(n.k);
        return walk(n.o, bound);
      case "idx":
        if (n.o.t === "id" && n.o.n === "steps" && n.i.t === "lit" && typeof n.i.v === "string") steps.add(n.i.v);
        walk(n.o, bound);
        return walk(n.i, bound);
      case "list":
        return n.e.forEach((e) => walk(e, bound));
      case "map":
        return n.e.forEach(([k, v]) => (walk(k, bound), walk(v, bound)));
      case "un":
        return walk(n.x, bound);
      case "cond":
        walk(n.c, bound);
        walk(n.a, bound);
        return walk(n.b, bound);
      case "bin":
        walk(n.l, bound);
        return walk(n.r, bound);
      case "call":
        if (!(FUNCTIONS as readonly string[]).includes(n.f)) out.problems.push(`function '${n.f}()' is not defined`);
        return n.a.forEach((a) => walk(a, bound));
      case "mcall":
        walk(n.o, bound);
        if ((MACROS as readonly string[]).includes(n.f)) {
          const v = n.a[0];
          if (n.a.length !== 2 || v?.t !== "id") out.problems.push(`.${n.f}() takes a name and an expression`);
          else walk(n.a[1], new Set([...bound, v.n]));
          return;
        }
        if (!(METHODS as readonly string[]).includes(n.f)) out.problems.push(`method '.${n.f}()' is not defined`);
        return n.a.forEach((a) => walk(a, bound));
    }
  };
  walk(node, new Set());
  out.roots = [...seen];
  out.steps = [...steps];
  out.problems = [...new Set(out.problems)];
  return out;
}

const TEMPLATE = /\{\{\s*(.+?)\s*\}\}|\$\{\s*(.+?)\s*\}/g;

/** The expressions inside a template string: "{{ input.service }}.campaign_assets" or "${input.delay}". */
export function templateExprs(text: string): string[] {
  return [...text.matchAll(TEMPLATE)].map((m) => m[1] ?? m[2]);
}

/** Fills a template string. A part that is null becomes an empty string. */
export function render(text: string, vars: Vars): string {
  return text.replace(TEMPLATE, (_m, a, b) => {
    const v = evaluate(a ?? b, vars);
    return v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  });
}

const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

/** "90m", "48h", "5d", "2w" or a number of seconds. Returns milliseconds, or null when the text is not a duration. */
export function durationMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value * 1000;
  if (typeof value !== "string") return null;
  const m = /^\s*(\d+(?:\.\d+)?)\s*([smhdw])\s*$/.exec(value);
  return m ? Number(m[1]) * UNIT_MS[m[2]] : null;
}
