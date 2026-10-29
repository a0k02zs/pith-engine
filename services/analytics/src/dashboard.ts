import { existsSync, readFileSync } from "node:fs";
import { dir, engineDir } from "./paths.js";

// The client dashboard (config/dashboard.json): 1 per client, same KPI codes for every client.
// checkDashboard checks the definition against the SQL models and the engine KPI codes.
// renderDashboard turns query rows into 1 self-contained HTML page with inline SVG charts.
// Every figure carries its label (observed, modelled, estimated, platform-reported): playbook.md rule 5.

export type ChartType = "stat" | "line" | "bar" | "table";
export type Format = "currency" | "ratio" | "percent" | "integer" | "number" | "month" | "date";
export type Row = Record<string, unknown>;

export const LABELS = ["observed", "modelled", "estimated", "platform-reported"] as const;
const CHART_TYPES: ChartType[] = ["stat", "line", "bar", "table"];

/** Fields each chart type needs in `fields`. */
const REQUIRED_FIELDS: Record<ChartType, string[]> = {
  stat: ["kpi", "value"],
  line: ["x", "y"],
  bar: ["category", "value"],
  table: [],
};

export interface Chart {
  id: string;
  type: ChartType;
  title: string;
  source: string;
  kpis: string[];
  fields: Record<string, string>;
  filter?: Record<string, string>;
  columns?: { field: string; title: string; format: Format }[];
  format?: Format;
  reference_band?: { low: number; high: number; title: string };
  /** A fixed label, when the SQL model has no label column. */
  label?: string;
}

export interface Dashboard {
  id: string;
  version: number;
  pages: { id: string; title: string; charts: Chart[] }[];
}

export interface RenderOptions {
  client: string;
  period: string;
  market: string;
  currency: string;
  /** Attribution model for the channel charts. */
  model?: string;
  /** BCP 47 locale for numbers, from docs/markets.md (report language). */
  locale?: string;
}

export function loadDashboard(): Dashboard {
  return JSON.parse(readFileSync(dir("config", "dashboard.json"), "utf8")) as Dashboard;
}

/** Problems with the definition, as text. An empty list means the definition is valid. */
export function checkDashboard(def: Dashboard, kpiCodes: string[] = engineKpis()): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const page of def.pages) {
    for (const c of page.charts) {
      const at = `${page.id}.${c.id}`;
      if (ids.has(c.id)) errors.push(`${at}: duplicate chart id`);
      ids.add(c.id);
      if (!CHART_TYPES.includes(c.type)) errors.push(`${at}: unknown chart type ${c.type}`);
      for (const k of c.kpis) if (!kpiCodes.includes(k)) errors.push(`${at}: KPI ${k} is not in the engine enums`);
      if (c.kpis.length === 0) errors.push(`${at}: no KPI codes`);
      for (const f of REQUIRED_FIELDS[c.type] ?? []) if (!c.fields[f]) errors.push(`${at}: needs fields.${f}`);
      if (c.type === "table" && !c.columns?.length) errors.push(`${at}: a table needs columns`);
      if (!c.fields.label && !c.label) errors.push(`${at}: needs fields.label or a fixed label`);
      if (c.label && !(LABELS as readonly string[]).includes(c.label)) errors.push(`${at}: label ${c.label} is not one of ${LABELS.join(", ")}`);
      if (c.reference_band && c.reference_band.low >= c.reference_band.high) errors.push(`${at}: reference band low must be under high`);

      const path = dir("sql", `${c.source}.sql`);
      if (!existsSync(path)) {
        errors.push(`${at}: sql/${c.source}.sql does not exist`);
        continue;
      }
      // Every column the chart reads must be named in the model. This catches a renamed column, not a wrong type.
      const sql = readFileSync(path, "utf8");
      const columns = [...Object.values(c.fields), ...Object.keys(c.filter ?? {}), ...(c.columns ?? []).map((x) => x.field)];
      for (const col of columns) {
        if (!new RegExp(`\\b${col}\\b`).test(sql)) errors.push(`${at}: column ${col} is not in sql/${c.source}.sql`);
      }
    }
  }
  return errors;
}

function engineKpis(): string[] {
  const enums = JSON.parse(readFileSync(engineDir("contracts", "enums.json"), "utf8"));
  return Object.keys(enums.kpis).filter((k) => !k.startsWith("$"));
}

// ---------- formatting ----------

/** Display format per KPI code, when the chart does not set one. */
const KPI_FORMAT: Record<string, Format> = {
  revenue: "currency", spend: "currency", cpa: "currency", attributed_revenue: "currency", attributed_pipeline: "currency",
  pipeline_value: "currency", icpa: "currency",
  roas: "ratio", mer: "ratio", ltv_cac: "ratio", mmm_roi: "ratio", platform_claim_ratio: "ratio",
  ctr: "percent", cvr: "percent", tracking_match_rate: "percent", tracking_coverage: "percent", incremental_lift: "percent",
  conversions: "integer", leads: "integer", payback_months: "integer",
};

/** KPIs where a fall is good. Everything else: a rise is good. */
const LOWER_IS_BETTER = new Set(["cpa", "icpa", "payback_months", "platform_claim_ratio"]);
/** KPIs where neither direction is good or bad on its own (spend follows the plan). */
const NO_DIRECTION = new Set(["spend"]);

const KPI_NAMES: Record<string, string> = {
  revenue: "Revenue", spend: "Spend", roas: "ROAS", cpa: "CPA", mer: "MER", conversions: "Conversions",
  attributed_revenue: "Attributed revenue", ltv_cac: "LTV to CAC", payback_months: "Payback",
};

export function formatValue(value: unknown, format: Format, opts: Pick<RenderOptions, "currency" | "locale">): string {
  if (value === null || value === undefined || value === "") return "–";
  const locale = opts.locale ?? "en-GB";
  if (format === "month" || format === "date") {
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(locale, format === "month" ? { month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  switch (format) {
    case "currency": {
      // Compact with a fixed K or M suffix. Intl's compact notation differs between ICU versions ("k" or "K").
      const [scaled, suffix] = Math.abs(n) >= 1e6 ? [n / 1e6, "M"] : Math.abs(n) >= 1e5 ? [n / 1e3, "K"] : [n, ""];
      const digits = suffix === "M" ? 1 : Math.abs(n) >= 100 || Number.isInteger(n) ? 0 : 2;
      const parts = new Intl.NumberFormat(locale, { style: "currency", currency: opts.currency, maximumFractionDigits: digits }).formatToParts(scaled);
      const lastNumber = parts.map((x) => x.type).lastIndexOf(parts.some((x) => x.type === "fraction") ? "fraction" : "integer");
      return parts.map((x, i) => x.value + (i === lastNumber ? suffix : "")).join("");
    }
    case "ratio":
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 1 }).format(n)}×`;
    case "percent":
      return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(n);
    case "integer":
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
    default:
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
  }
}

const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

const chartFormat = (c: Chart, kpi = c.kpis[0]) => c.format ?? KPI_FORMAT[kpi] ?? "number";

/** Rows for 1 chart: the chart's filter applied, with $market and $model taken from the options. */
export function chartRows(c: Chart, rows: Row[] | undefined, opts: RenderOptions): Row[] {
  const params: Record<string, string | undefined> = { $market: opts.market, $model: opts.model ?? "position_based" };
  const filter = Object.entries(c.filter ?? {}).map(([k, v]) => [k, v.startsWith("$") ? params[v] : v] as const);
  return (rows ?? []).filter((r) => filter.every(([k, v]) => v === undefined || String(r[k]) === v));
}

function labelOf(c: Chart, rows: Row[]): string {
  if (c.label) return c.label;
  const found = new Set(rows.map((r) => String(r[c.fields.label] ?? "")).filter(Boolean));
  return found.size ? [...found].join(", ") : "no label";
}

// ---------- charts ----------

const W = 640;
const PAD = { top: 12, right: 16, bottom: 28, left: 64 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) max = min + 1;
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let t = Math.floor(min / step) * step; t <= max + step * 1e-9; t += step) ticks.push(Number(t.toFixed(10)));
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

function renderStat(c: Chart, rows: Row[], opts: RenderOptions): string {
  const f = c.fields;
  const tiles = c.kpis.map((kpi) => {
    const r = rows.find((x) => x[f.kpi] === kpi);
    const fmt = chartFormat(c, kpi);
    if (!r) return `<div class="tile"><div class="tile-name">${esc(KPI_NAMES[kpi] ?? kpi)}</div><div class="tile-value muted">No data</div></div>`;
    const cur = Number(r[f.value]);
    const prior = f.prior ? Number(r[f.prior]) : NaN;
    let delta = "";
    if (Number.isFinite(cur) && Number.isFinite(prior) && prior !== 0) {
      const ch = (cur - prior) / Math.abs(prior);
      const good = ch === 0 || NO_DIRECTION.has(kpi) ? null : (ch > 0) !== LOWER_IS_BETTER.has(kpi);
      const cls = good === null ? "flat" : good ? "up" : "down";
      const arrow = ch > 0 ? "▲" : ch < 0 ? "▼" : "■";
      delta = `<div class="delta ${cls}">${arrow} ${esc(formatValue(Math.abs(ch), "percent", opts))} vs prior${good === null ? "" : good ? " (better)" : " (worse)"}</div>`;
    }
    const target = f.target && r[f.target] != null ? `<div class="tile-sub">Target ${esc(formatValue(r[f.target], fmt, opts))}</div>` : `<div class="tile-sub">No target set</div>`;
    const label = f.label ? String(r[f.label] ?? "") : c.label ?? "";
    return `<div class="tile"><div class="tile-name">${esc(KPI_NAMES[kpi] ?? kpi)} <span class="badge">${esc(label)}</span></div>` +
      `<div class="tile-value">${esc(formatValue(cur, fmt, opts))}</div>${delta}${target}</div>`;
  });
  return `<div class="tiles">${tiles.join("")}</div>`;
}

function renderLine(c: Chart, rows: Row[], opts: RenderOptions): string {
  const f = c.fields;
  const fmt = chartFormat(c);
  const pts = rows
    .map((r) => ({ x: String(r[f.x]), y: num(r[f.y]), e: num(r[f.expected]), lo: num(r[f.band_low]), hi: num(r[f.band_high]) }))
    .filter((p) => p.y !== null)
    .sort((a, b) => a.x.localeCompare(b.x));
  if (pts.length < 2) return noData();

  const H = 220;
  const vals = pts.flatMap((p) => [p.y, p.e, p.lo, p.hi]).filter((v): v is number => v !== null);
  if (c.reference_band) vals.push(c.reference_band.low, c.reference_band.high);
  const fromZero = fmt === "currency" || fmt === "integer";
  let lo = fromZero ? Math.min(0, ...vals) : Math.min(...vals);
  let hi = Math.max(...vals);
  if (!fromZero) { const pad = (hi - lo) * 0.1 || 0.01; lo -= pad; hi += pad; }
  const ticks = niceTicks(lo, hi);
  lo = ticks[0]; hi = ticks[ticks.length - 1];
  const iw = W - PAD.left - PAD.right, ih = H - PAD.top - PAD.bottom;
  const sx = (i: number) => PAD.left + (iw * i) / (pts.length - 1);
  const sy = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo)) * ih;
  const path = (key: "y" | "e") => {
    let d = "", pen = false;
    pts.forEach((p, i) => { const v = p[key]; if (v === null) { pen = false; return; } d += `${pen ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`; pen = true; });
    return d;
  };

  const out: string[] = [];
  for (const t of ticks) {
    out.push(`<line class="grid" x1="${PAD.left}" x2="${W - PAD.right}" y1="${sy(t).toFixed(1)}" y2="${sy(t).toFixed(1)}"/>`);
    out.push(`<text class="tick" x="${PAD.left - 8}" y="${sy(t).toFixed(1)}" text-anchor="end" dominant-baseline="middle">${esc(formatValue(t, fmt, opts))}</text>`);
  }
  if (c.reference_band) {
    const b = c.reference_band;
    out.push(`<rect class="refband" x="${PAD.left}" width="${iw}" y="${sy(b.high).toFixed(1)}" height="${(sy(b.low) - sy(b.high)).toFixed(1)}"><title>${esc(b.title)}</title></rect>`);
  }
  const band = pts.filter((p) => p.lo !== null && p.hi !== null);
  const hasBand = band.length >= 2;
  if (hasBand) {
    const up = pts.map((p, i) => (p.hi !== null ? `${sx(i).toFixed(1)},${sy(p.hi).toFixed(1)}` : "")).filter(Boolean);
    const down = pts.map((p, i) => (p.lo !== null ? `${sx(i).toFixed(1)},${sy(p.lo).toFixed(1)}` : "")).filter(Boolean).reverse();
    out.push(`<polygon class="band" points="${[...up, ...down].join(" ")}"/>`);
  }
  const hasExpected = pts.some((p) => p.e !== null);
  if (hasExpected) out.push(`<path class="expected" d="${path("e")}"/>`);
  out.push(`<path class="observed" d="${path("y")}"/>`);
  const last = pts.length - 1;
  out.push(`<circle class="dot" cx="${sx(last).toFixed(1)}" cy="${sy(pts[last].y!).toFixed(1)}" r="4"/>`);
  out.push(`<line class="axis" x1="${PAD.left}" x2="${W - PAD.right}" y1="${PAD.top + ih}" y2="${PAD.top + ih}"/>`);
  for (const i of [0, Math.floor(last / 2), last]) {
    const anchor = i === 0 ? "start" : i === last ? "end" : "middle";
    out.push(`<text class="tick" x="${sx(i).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}">${esc(formatValue(pts[i].x, "date", opts))}</text>`);
  }
  // hover: 1 hit column per point, wider than the mark, with a native tooltip
  const colW = iw / Math.max(1, last);
  pts.forEach((p, i) => {
    const tip = [formatValue(p.x, "date", opts), `${c.title}: ${formatValue(p.y, fmt, opts)}`];
    if (p.e !== null) tip.push(`Forecast: ${formatValue(p.e, fmt, opts)}`);
    if (p.lo !== null && p.hi !== null) tip.push(`90% band: ${formatValue(p.lo, fmt, opts)} to ${formatValue(p.hi, fmt, opts)}`);
    out.push(`<rect class="hit" x="${(sx(i) - colW / 2).toFixed(1)}" y="${PAD.top}" width="${colW.toFixed(1)}" height="${ih}"><title>${esc(tip.join("\n"))}</title></rect>`);
  });

  const legend = hasExpected || hasBand || c.reference_band
    ? `<div class="legend"><span class="key observed-key">Actual</span>${hasExpected ? `<span class="key expected-key">Forecast</span>` : ""}${hasBand ? `<span class="key band-key">90% forecast band</span>` : ""}${c.reference_band ? `<span class="key refband-key">${esc(c.reference_band.title)}</span>` : ""}</div>`
    : "";
  return `${legend}<div class="plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}">${out.join("")}</svg></div>` +
    dataTable([f.x, f.y, f.expected, f.band_low, f.band_high].filter(Boolean), rows.slice().sort((a, b) => String(a[f.x]).localeCompare(String(b[f.x]))), (col) => (col === f.x ? "date" : fmt), opts);
}

function renderBar(c: Chart, rows: Row[], opts: RenderOptions): string {
  const f = c.fields;
  const fmt = chartFormat(c);
  const bars = rows
    .map((r) => ({ cat: String(r[f.category]), v: num(r[f.value]) }))
    .filter((b): b is { cat: string; v: number } => b.v !== null)
    .sort((a, b) => b.v - a.v);
  if (!bars.length) return noData();

  const rowH = 28, gap = 2, left = 132, right = 72;
  const H = bars.length * rowH + 8;
  const max = Math.max(...bars.map((b) => b.v), 0);
  const min = Math.min(...bars.map((b) => b.v), 0);
  const span = max - min || 1;
  const iw = W - left - right;
  const x0 = left + ((0 - min) / span) * iw;
  const out: string[] = [];
  bars.forEach((b, i) => {
    const y = 4 + i * rowH + gap;
    const h = rowH - gap * 2 - 6;
    const len = (Math.abs(b.v) / span) * iw;
    const neg = b.v < 0;
    const x = neg ? x0 - len : x0;
    const r = Math.min(4, len / 2, h / 2);
    // square at the baseline, rounded at the data end
    const d = neg
      ? `M${x0},${y}H${x + r}A${r},${r} 0 0 0 ${x},${y + r}V${y + h - r}A${r},${r} 0 0 0 ${x + r},${y + h}H${x0}Z`
      : `M${x0},${y}H${x0 + len - r}A${r},${r} 0 0 1 ${x0 + len},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x0 + len - r},${y + h}H${x0}Z`;
    const cls = b.cat === "unattributed" ? "bar other" : "bar";
    out.push(`<text class="cat" x="${left - 10}" y="${y + h / 2}" text-anchor="end" dominant-baseline="middle">${esc(b.cat.replace(/_/g, " "))}</text>`);
    out.push(`<path class="${cls}" d="${d}"/>`);
    const lx = neg ? x - 6 : x0 + len + 6;
    out.push(`<text class="val" x="${lx.toFixed(1)}" y="${y + h / 2}" text-anchor="${neg ? "end" : "start"}" dominant-baseline="middle">${esc(formatValue(b.v, fmt, opts))}</text>`);
    out.push(`<rect class="hit" x="0" y="${4 + i * rowH}" width="${W}" height="${rowH}"><title>${esc(`${b.cat}: ${formatValue(b.v, fmt, opts)}`)}</title></rect>`);
  });
  out.push(`<line class="axis" x1="${x0.toFixed(1)}" x2="${x0.toFixed(1)}" y1="2" y2="${H - 2}"/>`);
  return `<div class="plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}">${out.join("")}</svg></div>` +
    dataTable([f.category, f.value], rows, (col) => (col === f.value ? fmt : "text"), opts);
}

function renderTable(c: Chart, rows: Row[], opts: RenderOptions): string {
  if (!rows.length) return noData();
  const cols = c.columns!;
  const head = cols.map((x) => `<th>${esc(x.title)}</th>`).join("");
  const body = rows.map((r) => `<tr>${cols.map((x) => `<td>${esc(formatValue(r[x.field], x.format, opts))}</td>`).join("")}</tr>`).join("");
  return `<div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function dataTable(cols: string[], rows: Row[], fmtOf: (col: string) => Format | "text", opts: RenderOptions): string {
  const head = cols.map((x) => `<th>${esc(x)}</th>`).join("");
  const body = rows.map((r) => `<tr>${cols.map((x) => {
    const fm = fmtOf(x);
    return `<td>${esc(fm === "text" ? r[x] ?? "–" : formatValue(r[x], fm, opts))}</td>`;
  }).join("")}</tr>`).join("");
  return `<details><summary>Show the data as a table</summary><div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></details>`;
}

const noData = () => `<p class="nodata">No data for this period.</p>`;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const RENDER: Record<ChartType, (c: Chart, rows: Row[], o: RenderOptions) => string> = {
  stat: renderStat, line: renderLine, bar: renderBar, table: renderTable,
};

/** 1 HTML page for 1 client and period. `data` maps a SQL model name to its result rows. */
export function renderDashboard(def: Dashboard, data: Record<string, Row[]>, opts: RenderOptions): string {
  const pages = def.pages.map((p) => {
    const charts = p.charts.map((c) => {
      const rows = chartRows(c, data[c.source], opts);
      return `<figure class="chart chart-${c.type}" id="${esc(c.id)}"><figcaption><span class="title">${esc(c.title)}</span>` +
        (c.type === "stat" ? "" : ` <span class="badge">${esc(labelOf(c, rows))}</span>`) +
        `</figcaption>${RENDER[c.type](c, rows, opts)}</figure>`;
    });
    return `<section id="${esc(p.id)}"><h2>${esc(p.title)}</h2>${charts.join("")}</section>`;
  });
  const nav = def.pages.map((p) => `<a href="#${esc(p.id)}">${esc(p.title)}</a>`).join("");
  const model = opts.model ?? "position_based";
  return `<!doctype html><html lang="${esc(opts.locale ?? "en-GB")}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${esc(opts.client)} dashboard</title><style>${CSS}</style></head><body><div class="viz-root"><header>` +
    `<p class="eyebrow">Pith Marketing · client dashboard</p><h1>${esc(opts.client)}</h1>` +
    `<p class="meta">${esc(opts.period)} · market ${esc(opts.market)} · ${esc(opts.currency)} · attribution model ${esc(model.replace(/_/g, " "))}</p>` +
    `<p class="meta">Each figure has a label: observed, modelled, estimated or platform-reported. Hover a mark for its value.</p>` +
    `<nav>${nav}</nav></header><main>${pages.join("")}</main></div></body></html>`;
}

// Colors: the dataviz reference palette (single series = slot 1 blue; band = sequential step 100/200).
const CSS = `
.viz-root{color-scheme:light;--page:#f9f9f7;--surface-1:#fcfcfb;--text-primary:#0b0b0b;--text-secondary:#52514e;--muted:#898781;
--grid:#e1e0d9;--axis:#c3c2b7;--series-1:#2a78d6;--band:#cde2fb;--ref:#e1e0d9;--other:#c3c2b7;--good:#006300;--bad:#d03b3b;--border:rgba(11,11,11,.10)}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])) .viz-root{color-scheme:dark;--page:#0d0d0d;--surface-1:#1a1a19;--text-primary:#f0efec;
--text-secondary:#c3c2b7;--grid:#2c2c2a;--axis:#383835;--series-1:#3987e5;--band:#0d366b;--ref:#383835;--other:#52514e;--good:#0ca30c;--bad:#e66767;--border:rgba(255,255,255,.10)}}
:root[data-theme="dark"] .viz-root{color-scheme:dark;--page:#0d0d0d;--surface-1:#1a1a19;--text-primary:#f0efec;--text-secondary:#c3c2b7;--grid:#2c2c2a;
--axis:#383835;--series-1:#3987e5;--band:#0d366b;--ref:#383835;--other:#52514e;--good:#0ca30c;--bad:#e66767;--border:rgba(255,255,255,.10)}
*{box-sizing:border-box}body{margin:0;background:#f9f9f7}
@media (prefers-color-scheme:dark){body{background:#0d0d0d}}
.viz-root{background:var(--page);color:var(--text-primary);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh;padding:24px 16px 48px}
header,main{max-width:960px;margin:0 auto}
h1{font-size:28px;margin:0 0 4px}h2{font-size:20px;margin:32px 0 12px}
.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-secondary);margin:0 0 4px}
.meta{color:var(--text-secondary);margin:0 0 4px;font-size:14px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}nav a{color:var(--text-primary);border:1px solid var(--border);border-radius:999px;padding:4px 12px;text-decoration:none;font-size:14px}
.chart{background:var(--surface-1);border:1px solid var(--border);border-radius:10px;padding:16px;margin:0 0 16px;min-width:0}
figcaption{margin-bottom:8px;font-weight:600}
.badge{display:inline-block;font-weight:400;font-size:12px;color:var(--text-secondary);border:1px solid var(--border);border-radius:999px;padding:0 8px;vertical-align:1px}
.plot{overflow-x:auto}svg{width:100%;min-width:560px;height:auto;display:block;overflow:visible}
.grid{stroke:var(--grid);stroke-width:1}.axis{stroke:var(--axis);stroke-width:1}
.tick,.cat,.val{fill:var(--text-secondary);font-size:12px;font-variant-numeric:tabular-nums}.cat{fill:var(--text-primary)}
.observed{fill:none;stroke:var(--series-1);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.expected{fill:none;stroke:var(--muted);stroke-width:2;stroke-dasharray:4 4}
.band{fill:var(--band);opacity:.6}.refband{fill:var(--ref);opacity:.7}
.dot{fill:var(--series-1);stroke:var(--surface-1);stroke-width:2}
.bar{fill:var(--series-1)}.bar.other{fill:var(--other)}
.hit{fill:transparent}.hit:hover{fill:var(--text-primary);opacity:.05}
.legend{display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:var(--text-secondary);margin-bottom:6px}
.key::before{content:"";display:inline-block;width:16px;height:0;margin-right:6px;vertical-align:4px;border-top:2px solid}
.observed-key::before{border-color:var(--series-1)}.expected-key::before{border-top:2px dashed var(--muted)}
.band-key::before,.refband-key::before{height:10px;border:0;vertical-align:-1px}.band-key::before{background:var(--band)}.refband-key::before{background:var(--ref)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.tile{border:1px solid var(--border);border-radius:8px;padding:12px 14px}
.tile-name{font-size:14px;color:var(--text-secondary)}.tile-value{font-size:30px;font-weight:600;margin:2px 0}
.tile-sub{font-size:13px;color:var(--text-secondary)}.muted{color:var(--muted);font-size:20px}
.delta{font-size:13px}.delta.up{color:var(--good)}.delta.down{color:var(--bad)}.delta.flat{color:var(--text-secondary)}
details{margin-top:8px;font-size:14px}summary{cursor:pointer;color:var(--text-secondary)}
.tablewrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14px;margin-top:8px}
th,td{text-align:left;padding:6px 10px;border-bottom:1px solid var(--grid);font-variant-numeric:tabular-nums}th{color:var(--text-secondary);font-weight:500}
.nodata{color:var(--text-secondary)}
@media (forced-colors:active){.observed{stroke:CanvasText}.bar{fill:CanvasText}}
`;
