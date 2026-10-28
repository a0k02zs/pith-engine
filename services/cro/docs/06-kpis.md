# CRO and Landing Pages: KPIs

Status: v1, 21 Oct 2026. KPI codes follow `engine/contracts/enums.json` (`kpis`). Service-only codes use `cro.<name>`, as `engine/specs/analytics.md` allows.

## 1. Client results

| KPI | Code | Formula | Target | Notes |
|---|---|---|---|---|
| Conversion rate | `cvr` | primary conversions ÷ sessions on the page | Up quarter on quarter | Per page, market and device |
| Revenue per visitor | `revenue_per_visitor` | revenue ÷ unique visitors | Up quarter on quarter | B2C primary money metric |
| Qualified lead rate | `cro.sql_rate` | SQLs from the page ÷ form submits | Not lower than before a test | B2B guardrail; reads the stage from the engine data layer |
| Form completion rate | `cro.form_completion_rate` | form submits ÷ form starts | Up | |
| Core Web Vitals pass rate | `cwv_pass_rate` | pages that pass LCP, INP and CLS at p75 ÷ live pages | 90% or more | Field data (CrUX) when there is enough traffic |
| Cumulative lift | `cro.cumulative_lift` | sum of the measured relative lift of shipped winners on the primary metric, per funnel | Shown as an estimate | Lifts do not simply add up; the report says so |

## 2. Program health

| KPI | Code | Formula | Target |
|---|---|---|---|
| Tests launched | `cro.tests_launched` | tests started in the month | Package level (1, 2 to 4, 4 to 8) |
| Test win rate | `test_win_rate` | tests with decision ship ÷ tests finished | 20% to 35% is normal. A much higher rate can mean tests are too safe |
| Valid test rate | `cro.valid_test_rate` | tests with no SRM and no tracking issue ÷ tests finished | 95% or more |
| SRM failure rate | `cro.srm_failure_rate` | tests stopped for SRM ÷ tests started | Under 5% |
| Test cycle time | `cro.cycle_days` | days from G1 approval to test start | 5 working days or less |
| Page time to live | `time_to_launch_days` | days from brief to live page | 5 working days or less |
| Backlog depth | `cro.backlog_ready` | approved hypotheses ready to build | At least 2 months of tests |

## 3. Events this service sends

| When | Event | Payload notes |
|---|---|---|
| A test or page is requested | `svc.cro/test.requested`, `svc.cro/page.requested` | `client_id`, page, markets, calling service |
| Tracking is broken | `svc.cro/tracking.broken` | broken events; listener is Analytics (12) |
| A test starts, ends, is not testable | `svc.cro/test.started`, `svc.cro/test.ended`, `svc.cro/test.not_testable` | `test_id`, reason for the end (`end_date`, `srm`, `guardrail`) |
| A page is live, or a brief lacks data | `svc.cro/page.published`, `svc.cro/page.needs_info` | listener is the calling service |
| Each day of a running test | `engine/metric.recorded` | 1 row per arm and KPI (`sessions`, `conversions`, `cvr`, `revenue_per_visitor`), with `test_id` and `arm` as dimensions |
| A test ends | `engine/metric.recorded` | `test_win_rate`, `cro.cumulative_lift` when shipped |
| A page goes live | `engine/outbound.recorded` | `type=posted`, channel `landing_page` |
| A learning is stored | `POST /clients/{id}/learnings` | the engine sends `engine/learning.recorded` |

## 4. Reports

- **Daily (automatic, internal):** running tests, SRM status, guardrails. No primary result before the sample is reached.
- **Per test:** the results report (`04-templates.md` section 6) at gate G4.
- **Monthly (client):** the outline in `04-templates.md` section 7. It goes through the engine `report` gate before the client sees it.
