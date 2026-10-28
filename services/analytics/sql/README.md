# SQL and model jobs · service 12

Dialect: BigQuery (standard SQL), run by dbt in the client's regional dataset (`docs/markets.md`). Engine tables (`touchpoints`, `conversions`, `contacts`, `metrics_daily`) are replicated from Postgres into the dataset under the `engine` schema.

Client views that each client dataset needs: `source_orders` (order system or CRM), `kpi_targets` (from the client brain), `pith_fees` (from billing) and, optionally, `geo_units` (UK ITV regions, US DMAs).

| File | What it does | Used by |
|------|--------------|---------|
| `int_touchpoints.sql` | Conversion paths inside the lookback window, with position and recency | all attribution |
| `fct_attribution.sql` | Credit per touchpoint for 5 rule-based models; credits sum to 1 per conversion and model | all attribution |
| `attribution_summary.sql` | Attributed conversions, revenue, spend and ROAS by channel and model, with unattributed conversions shown | weekly_report, monthly_roi |
| `mmm_weekly.sql` | Weekly MMM input table | quarterly_mmm |
| `qa_metrics.sql` | Match rate and revenue gap for the data checks (`src/qa.ts`) | daily_data_qa, reports |
| `match_rate_28d.sql` | 28 days of orders from the order system, GA4 and the engine, with match rates | onboarding audit |
| `kpi_table.sql` | KPI table: this period, prior period, last year and target, each with a label. Ratio KPIs come from their parts | weekly_report, monthly_roi |
| `daily_kpi_forecast.sql` | Expected value and 90% band per market, channel and KPI (BigQuery ML `ARIMA_PLUS`) | daily_data_qa |
| `pith_service_roi.sql` | Media spend, Pith fee, credited revenue and ROI per Pith service | monthly_roi |
| `cohort_payback.sql` | CAC, payback month and LTV:CAC by acquisition month (cohorts under 20 customers hidden) | monthly_roi |
| `geo_daily_52w.sql` | 52 weeks of daily conversions and spend by region, with one region mapping for both | incrementality_test |

The Markov data-driven model is in `src/attribution.ts` (`attributeDataDriven`).

## Test

`python3 test_sql.py` (needs `pip install duckdb sqlglot`) builds sample engine tables in DuckDB, transpiles each BigQuery model with sqlglot and checks the results: totals, ratios from parts, targets, fees, CAC and the region mapping. `daily_kpi_forecast.sql` uses BigQuery ML, so the test only parses it. None of the models has run on BigQuery or on real client data yet.
