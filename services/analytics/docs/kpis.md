# KPIs · service 12

KPI codes use the engine dictionary (`engine/contracts/enums.json`, `engine/specs/analytics.md`). All codes are in `enums.json` (checked 2026-10-21, after the engine's "Analytics (12), second round" change). Formulas follow `engine/specs/analytics.md`.

## A. KPIs we report to the client

| KPI | Code | Definition | Source |
|-----|------|------------|--------|
| Revenue (deduplicated) | `revenue` | Sum of order or closed-won value in the period, from the order system or CRM | Warehouse |
| Marketing spend | `spend` | Sum of media cost plus Pith fees, by channel | Ad APIs, invoices |
| Blended ROAS | `roas` | Revenue ÷ spend, all channels | Warehouse |
| Marketing efficiency ratio | `mer` | Same as blended ROAS; shown for e-commerce clients who use this name | Warehouse |
| Blended CPA | `cpa` | Spend ÷ new customers (B2C) or ÷ opportunities (B2B) | Warehouse |
| Attributed revenue by channel | `attributed_revenue` | Revenue credited to a channel by the chosen attribution model | Attribution model |
| Attributed pipeline by channel | `attributed_pipeline` | B2B opportunity value credited to a channel | CRM plus model |
| Channel ROI (MMM) | `mmm_roi` | Incremental revenue per 1 unit of spend, with 90% credible interval | MMM |
| Incremental lift | `incremental_lift` | (Test group result − control group result) ÷ control group result | Test |
| Cost per incremental acquisition | `icpa` | Test spend ÷ incremental conversions | Test |
| Payback period | `payback_months` | Months until gross margin from a cohort covers its acquisition cost | Warehouse |
| Customer lifetime value to CAC | `ltv_cac` | 12-month gross margin per customer ÷ CPA | Warehouse |
| Platform over-claim ratio | `platform_claim_ratio` | Sum of platform-reported conversions ÷ warehouse conversions | Ad APIs, warehouse |

Targets come from the client brain. If the client has no target, the first report shows the baseline and the strategist proposes a target at gate G4.

## B. KPIs we use to run the service

| KPI | Code | Target | Alert at |
|-----|------|--------|----------|
| Tracking coverage | `tracking_coverage` | 95% of spend has tracked results | Under 80% blocks reports |
| Tracking match rate | `tracking_match_rate` | Warehouse orders ÷ order-system orders between 95% and 102% | Outside 90% to 105% |
| Consent rate (UK, EU) | `consent_rate` | Reported, no target | Drop of 10 points in 1 week |
| Event match quality (Meta CAPI) | `emq` | 7.0 or higher | Under 6.0 |
| Report on time | `report_on_time` | 100% of weekly reports by Monday 10:00 local time | Any late report |
| Report review pass rate | `report_review_pass` | 90% of drafts pass G4 with no number changed | Under 80% over 4 weeks |
| Decisions logged | `decisions_logged` | At least 1 logged client decision per monthly report | 2 months with none |
| MMM holdout MAPE | `mmm_mape` | Under 10% | Over 15% blocks G6 |
| Time to first dashboard | `time_to_dashboard_days` | 20 working days from intake | Over 25 |

"Decisions logged" is the main proof of value. A report that leads to no decision did not do its job.
