# Analytics and attribution (service 12)

Dashboards, attribution models, marketing mix models (MMM), incrementality tests and ROI reports for Pith Marketing clients in the UK, the EU, North America, the GCC and Singapore.

This package builds on the engine contracts in `engine/` (v0.1.0). The tests read `engine/contracts/schemas/workflow-definition.json` and `engine/contracts/enums.json` from this repository.

## What is in this folder

| Path | What it is |
|------|------------|
| `src/attribution.ts` | Rule-based models (`last_touch`, `last_non_direct`, `first_touch`, `linear`, `time_decay`, `position_based`) and the data-driven Markov removal-effect model. Same rules as `sql/fct_attribution.sql`. |
| `src/qa.ts` | Data checks that run before any model or report: freshness, match rate, revenue gap, spend, UTM coverage, event swings, consent shift, tracking coverage. A `block` holds the report. |
| `src/mmm.ts` | MMM readiness (weeks, active share, spend variation, channels per 10 weeks, holiday marks), fit acceptance (R-hat, holdout MAPE, baseline share, test agreement) and the 25% per quarter scenario limit. |
| `src/experiment.ts` | Test sizing: minimum detectable lift and sample size at 90% confidence and 80% power, and the underpowered rule. |
| `src/market-rules.ts`, `config/market-rules.json` | Consent before tags, Consent Mode, warehouse region, currency, week start and report language per market. Quebec (`CA-QC`) has its own rules. |
| `src/dashboard.ts`, `config/dashboard.json` | The client dashboard: 4 pages and 7 charts built from the SQL models, with every figure labelled. See `docs/dashboard.md`. |
| `src/registry.ts`, `src/prompt.ts` | Load workflows and prompts, validate agent output against `schemas/`, build the system prompt. |
| `workflows/` | 6 engine workflows: onboarding, daily data QA, weekly report, monthly ROI, quarterly MMM, incrementality test. |
| `prompts/` | 7 agent prompts. Agents only do judgement work. Rules with fixed thresholds are code. |
| `schemas/` | Output schemas, `$id` `analytics/<name>@1`. |
| `sql/`, `config/meridian-config.yaml` | Warehouse models (BigQuery) and the Meridian MMM config. |
| `docs/` | Playbook, approval gates, KPIs, market rules and client templates. |

## Approval points

| Gate | Kind | Roles | Workflow |
|------|------|-------|----------|
| G1 audit | `plan` | analytics_lead | onboarding |
| G2 tracking plan | `plan` | analytics_lead + client_marketing_lead | onboarding |
| G3 go-live | `go_live` (after a compliance check) | analytics_lead + ops_lead | onboarding |
| G4 report | `report` | strategist | weekly_report, monthly_roi, incrementality_test |
| G5 test | `plan`, then `budget_change` | strategist + client_marketing_lead, then performance_marketer | incrementality_test |
| G6 MMM | `plan` | analytics_lead + strategist | quarterly_mmm |

No workflow step spends, sends, signs or pays. A person changes budgets in the ad platforms.

## Run

```
npm ci
npm run typecheck
npm test
```
