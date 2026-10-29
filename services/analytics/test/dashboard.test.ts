import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { chartRows, checkDashboard, formatValue, loadDashboard, renderDashboard, type Dashboard, type Row } from "../src/dashboard.js";

const def = loadDashboard();
const sample = JSON.parse(readFileSync(dir("test", "fixtures", "dashboard-sample.json"), "utf8")) as Record<string, Row[]>;
const opts = { client: "Sample client", period: "1 Sep to 26 Oct 2026", market: "GB", currency: "GBP" };
const chart = (id: string) => def.pages.flatMap((p) => p.charts).find((c) => c.id === id)!;
const clone = (): Dashboard => JSON.parse(JSON.stringify(def));

describe("dashboard definition", () => {
  it("is valid against the SQL models and the engine KPI codes", () => expect(checkDashboard(def)).toEqual([]));

  it("has the 4 pages", () => expect(def.pages.map((p) => p.id)).toEqual(["overview", "channels", "services", "data_health"]));

  it("finds a KPI code that is not in the engine enums", () => {
    const d = clone();
    d.pages[0].charts[0].kpis.push("made_up_kpi");
    expect(checkDashboard(d)).toContain("overview.headline_kpis: KPI made_up_kpi is not in the engine enums");
  });

  it("finds a column that is not in the SQL model", () => {
    const d = clone();
    d.pages[1].charts[0].fields.value = "revenue_typo";
    expect(checkDashboard(d)).toContain("channels.attributed_revenue: column revenue_typo is not in sql/attribution_summary.sql");
  });

  it("finds a missing SQL model and a chart with no label", () => {
    const d = clone();
    d.pages[3].charts[0].source = "no_such_model";
    delete d.pages[3].charts[0].label;
    const errors = checkDashboard(d);
    expect(errors).toContain("data_health.tracking_match: sql/no_such_model.sql does not exist");
    expect(errors).toContain("data_health.tracking_match: needs fields.label or a fixed label");
  });
});

describe("chart rows", () => {
  it("applies the market and model filters from the options", () => {
    expect(chartRows(chart("headline_kpis"), sample.kpi_table, opts).every((r) => r.market === "GB")).toBe(true);
    expect(chartRows(chart("attributed_revenue"), sample.attribution_summary, opts).every((r) => r.model === "position_based")).toBe(true);
    expect(chartRows(chart("attributed_revenue"), sample.attribution_summary, { ...opts, model: "linear" })).toHaveLength(1);
  });

  it("keeps only the total channel for the revenue trend", () => {
    const rows = chartRows(chart("revenue_trend"), sample.daily_kpi_forecast, opts);
    expect(rows).toHaveLength(56);
    expect(new Set(rows.map((r) => r.channel))).toEqual(new Set(["*"]));
  });
});

describe("formatting", () => {
  const o = { currency: "GBP", locale: "en-GB" };
  it("formats each kind of value", () => {
    expect(formatValue(38.4, "currency", o)).toBe("£38.40");
    expect(formatValue(61200, "currency", o)).toBe("£61,200");
    expect(formatValue(254300, "currency", o)).toBe("£254K");
    expect(formatValue(4.155, "ratio", o)).toBe("4.16×");
    expect(formatValue(0.985, "percent", o)).toBe("98.5%");
    expect(formatValue("2026-04-01", "month", o)).toBe("Apr 2026");
    expect(formatValue(null, "currency", o)).toBe("–");
  });
});

describe("rendered page", () => {
  const html = renderDashboard(def, sample, opts);

  it("has 1 figure per chart and an SVG for each plotted chart", () => {
    const ids = def.pages.flatMap((p) => p.charts.map((c) => c.id));
    for (const id of ids) expect(html).toContain(`id="${id}"`);
    expect(html.match(/<svg /g)).toHaveLength(5); // 2 line charts and 3 bar charts
  });

  it("shows the label of every figure", () => {
    expect(html).toContain('<span class="badge">estimated</span>');
    expect(html).toContain('<span class="badge">observed</span>');
  });

  it("marks a fall in CPA as better and a rise as worse", () => {
    expect(html).toMatch(/CPA[\s\S]*?▲ 4.1% vs prior \(worse\)/);
    expect(html).toMatch(/Revenue[\s\S]*?▲ 6.4% vs prior \(better\)/);
  });

  it("does not call a change in spend better or worse", () => expect(html).toContain('<div class="delta flat">▲ 4.8% vs prior</div>'));

  it("shows service ROI as a ratio, not money", () => {
    expect(html).toContain(">6.86×<");
    expect(html).not.toContain(">£6.86<");
  });

  it("draws the forecast band, the forecast and the target band", () => {
    expect(html).toContain('class="band"');
    expect(html).toContain('class="expected"');
    expect(html).toContain('class="refband"');
    expect(html).toContain("Target 95% to 102%");
  });

  it("shows unattributed conversions in a neutral color", () => expect(html).toContain('class="bar other"'));

  it("escapes text from the data", () => {
    const out = renderDashboard(def, { ...sample, pith_service_roi: [{ service: "<script>x</script>", roi: 1, label: "estimated" }] }, opts);
    expect(out).not.toContain("<script>x</script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("says when a chart has no data instead of failing", () => {
    const out = renderDashboard(def, {}, opts);
    expect(out.match(/No data for this period\./g)!.length).toBeGreaterThanOrEqual(5);
  });
});
