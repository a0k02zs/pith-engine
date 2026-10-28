# Campaigns and the shared engine (contract v0.1.0)

Status: aligned with `/mnt/project-files/engine/` contract **v0.1.0** on 21 Oct 2026. The engine thread owns those contracts. This file lists only what the campaign service adds or how it uses them.

## Workflows (engine `workflow-definition.json` format, validated against the schema and `enums.json`)

| File | Workflow id | Trigger |
|---|---|---|
| campaigns.launch.json | `campaigns.launch` | `svc.campaigns/brief.submitted` |
| campaigns.optimize_daily.json | `campaigns.optimize_daily` | cron 07:00 market time, per live campaign |
| campaigns.crisis.json | `campaigns.crisis` | `engine/escalation.raised` for a live campaign |

## Engine calls used

| Need | Engine contract |
|---|---|
| Client brain | `GET /clients/{id}/brain?market=` (read by every agent step) |
| Lessons | `POST /learnings` (step `learn`) |
| Approvals | `gate` steps; kinds `plan`, `budget`, `go_live`, `budget_change`, `escalation`, `report` |
| Compliance | `check` steps with `compliance`; outcome `pass` / `warn` / `block` |
| Spend caps | `spend_policies` rows written after the `budget` gate; `max_auto_change_pct` 20, `cpa_pause_pct` 50, `cpa_pause_days` 3 |
| Child runs | `subflow` steps; completion through `engine/run.finished` |
| Spend alerts | `engine/spend.alert` |
| Results | `engine/metric.recorded`, `engine/outbound.recorded`, `engine/conversion.recorded` |

## Events the campaign service owns

| Event | Sent when | Payload |
|---|---|---|
| `svc.campaigns/brief.submitted` | Client submits the brief form | `{client_id, campaign_id, brief}` |
| `svc.campaigns/brief.updated` | Client answers intake questions | `{client_id, campaign_id, brief}` |
| `svc.campaigns/concept.approved` | Concept and budget gates pass | `{client_id, run_id, campaign_id, concept_id, budget}` |
| `svc.campaigns/market.launched` | Go-live passes for 1 market | `{client_id, run_id, campaign_id, market}` |
| `svc.campaigns/flight.started` / `flight.ended` | Flight starts or ends | `{client_id, campaign_id}` |
| `svc.campaigns/market.resumed` | Account lead approves restart after a crisis | `{client_id, campaign_id, market}` |
| `svc.campaigns/campaign.closed` | Final report approved | `{client_id, campaign_id, learning_ids[]}` |

## Contract for channel services that join a campaign

1. Expose a workflow `<service>.campaign_assets`. Its input is 1 channel brief (`templates/master-brief-and-concepts.md`, part 3) plus `campaign_id` and `markets[]`.
2. Run your own create, check and `copy` / `creative` / `script` gates inside that workflow.
3. Register each asset as an engine `artifact` with `campaign_id`, market and language.
4. Finish the run (`engine/run.finished`, status `succeeded`) with `output.artifact_ids[]`. A failed run marks the campaign at risk.
5. Publish or spend only after `svc.campaigns/market.launched` for that market. Pause on a campaign crisis for that market.
6. Never change campaign budgets yourself. The campaign optimizer changes them inside `spend_policies`.

## UTM tags

Engine standard (`engine/specs/analytics.md` §4): `utm_source` = platform, `utm_medium` = channel code, `utm_campaign` = `campaign_id` (`<yyyy>-<slug>`), `utm_content` = `<artifact id 8>-<variant>`, `utm_term` = keyword or audience, `pith_mkt` = market ISO code.

## KPI codes

Shared codes from `enums.json`: `spend`, `revenue`, `roas`, `cpa`, `cpl`, `sqls`, `pipeline_value`, `cost_per_opportunity`, `incremental_lift`, `ctr`, `cvr`, `conversions`, `reach`. Service-only codes: `campaigns.brief_to_launch_days`, `campaigns.gates_in_sla_rate`, `campaigns.spend_accuracy`, `campaigns.qa_first_pass_rate`.
