# ABM pipeline — workflow spec

The pipeline runs on the engine workflow layer (Inngest). It has 9 stages and 6 human gates (G1 to G6). Gates use the approval inbox. The machine-readable version is `abm-pipeline.json`: 6 workflow definitions (`abm.account_list`, `abm.intent_daily`, `abm.account_activation`, `abm.play_run`, `abm.sales_handoff`, `abm.weekly_report`). Each one validates against `engine/contracts/schemas/workflow-definition.json`. Roles and approval kinds use the codes in `engine/contracts/enums.json`.

Legend: **A** = agent step, **S** = system step (no AI), **G** = human gate.

## 1. Stages

| # | Stage | Type | Agent or system | Input | Output | Engine calls |
|---|-------|------|-----------------|-------|--------|--------------|
| 1 | Build ICP and score accounts | A | `01-icp-account-scorer` | Closed-won deals (24 months), CRM accounts, firmographic and technographic data | ICP document, scored account list with fit score and reasons | `GET /clients/{id}/brain` |
| G1 | Approve ICP, list and tiers | G | `account_lead` + `client_sales` (both) | Scored list, proposed tiers, Tier 1 candidates | Approved list with tiers | `POST /approvals` kind `plan` |
| 2 | Watch intent | A (daily) | `02-intent-monitor` | Approved list, intent feeds, web visits, news, hiring | Intent score, signal log, surge events | emits `svc.abm/account.surged` |
| 3 | Map buying committee | A | `03-buying-committee-mapper` | Account, roles to find | 5 to 10 contacts with role, seniority, country, source | `POST /audiences/resolve` (service `abm`, purpose `b2b_marketing`) |
| 4 | Research account | A | `04-account-researcher` | Account, committee, client brain | Account brief (Tier 1) or cluster brief (Tier 2) | `GET /clients/{id}/brain` |
| 5 | Write personalized assets | A | `05-personalizer` | Brief, play, tier, market rules, templates | Emails, LinkedIn messages, ad copy, landing page brief, direct mail brief | `POST /compliance/check` on each asset |
| G2 | Approve Tier 1 assets | G | `account_lead` (add `client_executive` if they are the sender) | Each asset with brand score and compliance result | Approved, edited or rejected assets | `POST /approvals` kind `copy` |
| G3 | Approve Tier 2 and 3 templates | G | `account_lead` | Cluster and dynamic templates | Approved templates (reused without a new gate) | `POST /approvals` kind `template` |
| G4 | Approve spend and gifts | G | `account_lead` + `client_finance` | Ad budget for the account list, gifts over the market limit | Approved budget and gift list | `POST /approvals` kind `budget` (gifts in the payload) |
| 6 | Orchestrate the play | S + A | `06-play-orchestrator` | Approved assets, play definition, committee | Scheduled touches across email, LinkedIn ads, direct mail, sales tasks | `POST /compliance/check` at send time; emits `engine/metric.recorded` |
| 7 | Score engagement | S (hourly) | Engine rules | Replies, meetings, visits, clicks, gift redemptions | Engagement score per account and per contact | emits `svc.abm/account.engaged` |
| 8 | Hand off to sales | A | `07-sales-handoff` | Account over the hand-off threshold | Sales brief, suggested next step, open questions | emits `svc.abm/account.sales_ready` |
| G5 | Accept hand-off | G | `client_sales` | Sales brief | Accept (create opportunity) or return with reason | `POST /approvals` kind `handoff` (new kind, requested from the engine); CRM opportunity on accept |
| 9 | Report and learn | A (weekly) | `08-abm-reporter` | Scores, touches, KPIs, sales outcomes | Weekly report, proposed tier and threshold changes | writes learnings to client brain |
| G6 | Review report and changes | G | `account_lead` | Report and proposed changes | Report sent to the client; approved changes applied | `POST /approvals` kind `report` |

## 2. Triggers

| Trigger | Starts |
|---------|--------|
| New ABM client set up | Stage 1 |
| First day of each quarter | Stage 1 (ICP refresh) then G1 |
| First Monday of each month | Tier review: stage 1 re-score, then G1 for changes only |
| Each day 06:00 UTC | Stage 2 |
| Account added to the approved list | Stages 3, 4, 5 for that account; play P1 |
| `svc.abm/account.surged` | Play P5 for the account; alert to account owner within 1 hour |
| `svc.abm/account.engaged` crosses the hand-off threshold | Stage 8 |
| Each Monday 07:00 in the client's time zone | Stage 9 |

## 3. Guardrails (enforced by the workflow layer)

1. No agent can raise an ad budget or start new spend. G4 is required.
2. No agent can send a gift or direct mail item over the market limit. G4 is required.
3. No Tier 1 asset goes out without G2. A change to an approved asset needs G2 again.
4. No contact gets email if `POST /audiences/resolve` did not return them for `channel=email`.
5. No new claim, price, or named customer reference. Agents use only approved claims and references from the client brain.
6. Replies that are complaints, legal questions, or opt-outs stop the play for that contact and go to a person. Opt-outs are applied at once by the engine.
7. Maximum touches per contact: 2 a week in Tier 1, 1 a week in Tiers 2 and 3, across all channels and all services. The engine counts touches from other services too.
8. A play stops for an account when sales marks an open opportunity, unless sales asks for marketing support.

## 4. Time limits for gates

| Gate | Time limit | If late |
|------|------------|---------|
| G1 | 3 working days | Reminder each day; list stays at the last approved version |
| G2 | 2 working days | Reminder; the touch moves back 1 week |
| G3 | 3 working days | Reminder; Tier 2 and 3 plays wait |
| G4 | 2 working days | Reminder; no spend starts |
| G5 | 1 working day | Escalate to the client sales head |
| G6 | 1 working day | Report goes out marked "draft, not reviewed" only if the client agreed to this |

## 5. Failure handling

- Data source down (intent, enrichment): keep the last scores, mark them "stale", and do not start surge plays from stale data.
- Compliance `block`: the touch stops. The agent gets the reason and can propose a fix once. A second `block` goes to a person.
- Bounce rate over 3% for an account's contacts: stop email for that account and re-verify contacts.
- Agent output fails its schema: retry 2 times, then send to a person.

## 6. Events (proposed for `engine/contracts/events.md`)

| Event | Payload (main fields) |
|-------|-----------------------|
| `svc.abm/account.listed` | client_id, account_id, tier, fit_score, market |
| `svc.abm/account.tier_changed` | client_id, account_id, from_tier, to_tier, reason |
| `svc.abm/account.surged` | client_id, account_id, intent_score, delta_7d, top_signals[] |
| `svc.abm/account.engaged` | client_id, account_id, engagement_score, engaged_contacts, last_signal |
| `svc.abm/account.sales_ready` | client_id, account_id, scores, brief_id |
| `svc.abm/handoff.accepted` | client_id, account_id, opportunity_id |
| `svc.abm/handoff.returned` | client_id, account_id, reason |
| `svc.abm/play.started` / `svc.abm/play.completed` | client_id, account_id, play_id, outcome |
