# Client dashboard · service 12

Each client gets 1 dashboard. Every client has the same pages, charts and KPI codes, so a strategist reads any client's dashboard the same way. The plan calls this "1 dashboard per client, with the same KPI names across services".

## Parts

| Path | What it is |
|------|------------|
| `config/dashboard.json` | The definition: pages, charts, the SQL model behind each chart, the KPI codes and the columns it reads. |
| `src/dashboard.ts` | `checkDashboard` checks the definition. `renderDashboard` turns query rows into 1 HTML page with inline SVG charts. |
| `test/dashboard.test.ts`, `test/fixtures/dashboard-sample.json` | Tests, and sample rows for every model. The sample is test data, not client data. |

## Pages and charts

| Page | Chart | Type | SQL model | KPI codes |
|------|-------|------|-----------|-----------|
| Overview | This period against the prior period and the target | stat tiles | `kpi_table` | `revenue`, `spend`, `roas`, `cpa` |
| Overview | Daily revenue against the forecast, with the 90% band | line | `daily_kpi_forecast` | `revenue` |
| Channels | Attributed revenue by channel | bar | `attribution_summary` | `attributed_revenue` |
| Channels | ROAS by channel | bar | `attribution_summary` | `roas` |
| Pith services | Credited revenue per unit of cost, by Pith service | bar | `pith_service_roi` | `attributed_revenue`, `spend` |
| Pith services | Payback and LTV to CAC by acquisition month | table | `cohort_payback` | `payback_months`, `ltv_cac` |
| Data health | Warehouse orders as a share of order-system orders, with the 95% to 102% target | line | `qa_metrics` | `tracking_match_rate` |

## Rules

1. Every figure shows its label: observed, modelled, estimated or platform-reported (`playbook.md` rule 5). A chart reads the label column of its model, or has a fixed label.
2. `checkDashboard` fails when a KPI code is not in `engine/contracts/enums.json`, when a column is not named in the SQL model, or when a model file is missing. The test suite runs it.
3. A fall in CPA, iCPA, payback months or the platform over-claim ratio shows as better. A change in spend shows no direction, because spend follows the plan.
4. Unattributed conversions show in a neutral gray, not the series color.
5. Every chart has a "Show the data as a table" view, and each mark has a hover tooltip.
6. Currency and number formats come from the options: use the report currency and language in `docs/markets.md`.
7. A chart with no rows says "No data for this period". It does not fail the page.

## Render

```ts
import { loadDashboard, renderDashboard } from "@pith/analytics";

const html = renderDashboard(loadDashboard(), rowsByModel, {
  client: "Client name", period: "1 to 31 Oct 2026", market: "GB", currency: "GBP", model: "position_based", locale: "en-GB",
});
```

`rowsByModel` maps each SQL model name to its result rows for the client and period. The page needs no network access. The weekly and monthly report workflows can attach it to the report at gate G4.

## Not done yet

- No run on BigQuery or on real client data. The same limit applies to the SQL models (`sql/README.md`).
- The page is a static report. A live Looker Studio version needs a client warehouse first.
