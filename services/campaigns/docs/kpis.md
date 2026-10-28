# KPIs

Shared KPI codes come from the engine (`engine/contracts/enums.json`): `revenue`, `cpa`, `roas`, `cpl`, `sqls`, `pipeline_value`, `cost_per_opportunity`, `incremental_lift`, `ctr`, `cvr`, `reach`. Ratios are stored 0 to 1. Service-only codes start with `campaigns.`. Targets come from the brief at G2. The numbers below are Pith service targets (how well Pith runs campaigns), not client results. They are planning targets, not measured data.

## Client result KPIs (per campaign, per market)

| KPI | B2C | B2B | How measured |
|---|---|---|---|
| Primary result | Sales, revenue | SQLs, pipeline value | Platform + CRM, joined on UTM and click ID |
| Cost per result | CPA, ROAS | Cost per lead, cost per opportunity | Spend ÷ results |
| Incremental lift | Yes, budgets over 20k USD eq. | Yes, budgets over 20k USD eq. | Geo or audience holdout |
| Reach in target audience | Yes | Account coverage (ABM) | Platform reach; accounts engaged ÷ target accounts |
| Channel efficiency | CTR, CVR, cost per result by channel | Same | Dashboard |

## Pith service KPIs (for every campaign)

| KPI | Target |
|---|---|
| Brief to launch (`campaigns.brief_to_launch_days`) | 10 working days or less |
| Gates met inside SLA (`campaigns.gates_in_sla_rate`) | 90% or more |
| Launch checklist first-time pass rate (`campaigns.qa_first_pass_rate`) | 80% or more |
| Spend accuracy (`campaigns.spend_accuracy`) | Within ±5% |
| Compliance incidents after launch | 0 |
| Final report delivered | Within 5 working days of flight end + settle window |
| Lessons written to the client brain | At least 3 per campaign |

## Alerts

| Alert | Rule | Goes to |
|---|---|---|
| Spend spike (`engine/spend.alert`) | Daily spend over 2x plan | Account lead, auto-pause |
| CPA drift | CPA over 50% of target for 3 days | Optimizer pause + log |
| Tracking break | Conversions drop 80% day on day with stable spend | Analytics lead |
| Creative fatigue | CTR down 30% from first 3 days and frequency above 4 | Channel lead |
| Off-pace | Spend under 80% of plan by mid-flight | Account lead |
