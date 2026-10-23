# ABM KPIs

Existing engine KPI codes are used where they exist. New codes (marked **new**) are requested from the engine thread for `contracts/enums.json`. Every metric event carries `service: "abm"` and `props.tier` and `props.account_id` where it applies.

## Outcome KPIs (reported to the client)

| KPI | Code | Formula | Start target | Source |
|-----|------|---------|--------------|--------|
| Pipeline value from target accounts | `pipeline_value` (props.tier) | Sum of open opportunity value on listed accounts, created after listing | 3x the quarter ABM fee by end of quarter 2 | CRM |
| Accounts to opportunity rate | `abm.account_to_opp_rate` **new** | Listed accounts with a new opportunity ÷ listed accounts, per quarter | Tier 1: 30%, Tier 2: 15%, Tier 3: 5% | CRM |
| Win rate on target accounts | `win_rate` (props.abm=true) | Won ÷ (won + lost) on listed accounts | 10 points above non-ABM deals | CRM |
| Deal size on target accounts | `deal_size` (props.abm=true) | Average won value | 1.5x non-ABM deals | CRM |
| Sales cycle on target accounts | `sales_cycle_days` (props.abm=true) | Days from opportunity to won | Shorter than non-ABM deals | CRM |

## Leading KPIs (reported weekly)

| KPI | Code | Formula | Start target | Source |
|-----|------|---------|--------------|--------|
| Engaged target accounts | `abm.engaged_accounts` **new** | Listed accounts with engagement ≥ 20 in 30 days | Tier 1: 60%, Tier 2: 35% | Engine |
| Sales-ready accounts | `abm.sales_ready_accounts` **new** | Accounts that passed the hand-off threshold this period | Track | Engine |
| Hand-off acceptance rate | `abm.handoff_accept_rate` **new** | G5 accepted ÷ G5 items | 70% or more | Approval inbox |
| Buying committee coverage | `abm.committee_coverage` **new** | Average roles filled per account ÷ target roles | Tier 1: 100% (4 roles), Tier 2: 100% (3 roles) | Engine |
| Meetings booked | `meetings_booked` | Meetings with committee members | Track | CRM, calendar |
| Reply rate | `reply_rate` | Replies ÷ delivered emails | 8% or more (Tier 1), 3% (Tier 2 and 3) | Engine |
| Account ad reach | `reach` (props.abm=true) | Committee members reached ÷ committee members on the list | 70% | LinkedIn Ads |
| Average account scores | `abm.fit_score`, `abm.intent_score`, `abm.engagement_score` **new** | Average per tier | Track | Engine |

## Health KPIs (internal)

| KPI | Code | Target |
|-----|------|--------|
| Bounce rate | `bounce_rate` | Under 2%; stop the account at 3% |
| Opt-out rate | `opt_out_rate` | Under 1% per send |
| Complaint rate | `complaint_rate` | Under 0.1% |
| Gate on time | `gate_sla_met` | 90% or more |
| Stale intent data | `abm.stale_accounts` **new** | 0 accounts stale more than 48 hours |

Targets are start values from common B2B ABM practice. They are estimates, not measured data. The reporter agent proposes new targets after 1 quarter of real data.
