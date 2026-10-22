# Email marketing: approval points and KPIs

Version 0.1, 21 Oct 2026. Approval kinds and roles are from the engine `specs/approval-inbox.md`. KPI codes are from `contracts/enums.json`.

## 1. Approval points

| # | Gate | Workflow and step | Kind | Who approves | SLA | Can skip? |
|---|---|---|---|---|---|---|
| 1 | Monthly calendar and offers | `email.monthly_calendar` → `approve_plan` | `calendar` | account_lead | 48 h | No |
| 2 | Flow design (new or changed flow) | `email.flow_build` → `approve_design` | `plan` | account_lead | 48 h | No |
| 3 | New copy or template | `email.flow_build` and `email.campaign_send` → `approve_copy` | `copy` | client_approver | 48 h | Yes, when the template is reused and there are no new claims |
| 4 | New claim, price, or health, finance or legal statement | Raised by the compliance check | `claim` | client_legal or client_approver | 72 h | Never |
| 5 | Outbound list, sequence and UK legitimate interest assessment | `email.outbound_sequence` → `approve_plan` | `plan` | account_lead and client_sales (both) | 48 h | No |
| 6 | Outbound copy | `email.outbound_sequence` → `approve_copy` | `copy` | client_approver | 48 h | No |
| 7 | Deliverability incident: resume sends | `email.deliverability_monitor` → `incident`; `email.campaign_send` → `hold` | `escalation` | account_lead or ops_lead | 1 h | Never |
| 8 | Weekly report before the client sees it | `email.weekly_report` → `approve` | `report` | strategist or analytics_lead | 24 h | No |
| 9 | First sync of Saudi contacts to a platform outside Saudi Arabia | Client onboarding | `go_live` | ops_lead | 24 h | Never |
| 10 | Go-live of a new market or sending domain | Client onboarding | `go_live` | ops_lead | 24 h | Never |
| 11 | Complaint, legal, press or regulator reply | `email.reply_triage` → `escalate` | `escalation` (via `engine/escalation.raised`) | account_lead | 1 h | Never |

**What the email agents can never do alone** (plan "Governance and risk", engine guardrails G3 to G6):
- Send to a contact with no consent record for their country. Recipients come only from `POST /audiences/resolve`.
- Publish a new claim, price or offer.
- Reply to a complaint, journalist or regulator.
- Resume sends after a stop limit.
- Delete contacts. Sunset only suppresses; deletion follows the engine retention rules.

## 2. KPIs

The targets are planning targets for this service. They are estimates, not measured data. The weekly report compares each client against its own baseline after the first 30 days.

### Revenue and pipeline

| KPI | Code | B2C target | B2B target | Notes |
|---|---|---|---|---|
| Revenue per recipient | `revenue_per_recipient` | Up 20% against baseline by month 3 | Not used | Main B2C metric |
| Revenue from email | `revenue` | Report share of total online revenue | Not used | Split by flow and campaign with `flow_id` |
| Flow revenue share | `revenue` where `flow_id` is set ÷ total email revenue | 40% or more by month 3 | Not used | Computed in analytics from `flow_id` |
| Conversion rate | `cvr` | Report per flow | Report per flow | Conversions ÷ delivered |
| MQLs from email | `mqls` | Not used | Report per flow | The CRM thread owns the score |
| Meetings booked | `meetings_booked` | Not used | Report per flow and sequence | |
| Pipeline from email | `pipeline_value` | Not used | Report monthly | |

### Engagement

| KPI | Code | Target | Notes |
|---|---|---|---|
| Click rate | `ctr` | B2C campaigns 1.5% or more; flows 3% or more; B2B nurture 2% or more | Clicks ÷ delivered |
| Reply rate (outbound) | `reply_rate` | 3% or more | Replies ÷ delivered |
| Open rate | not a KPI | Do not use | Apple Mail Privacy Protection makes it unreliable; only a deliverability signal |

### List health and deliverability

| KPI | Code | Target | Stop the send at |
|---|---|---|---|
| Spam complaint rate | `complaint_rate` | Under 0.1% | 0.3% |
| Hard bounce rate | `bounce_rate` | Under 1% | 2% |
| Unsubscribe rate per send | `opt_out_rate` | Under 0.3% | 1% |
| Delivered | `delivered` ÷ `sends` | 98% or more | Under 95% (watch) |
| List growth | new consented contacts per month | Positive every month | |

### Operations

| KPI | Code | Target |
|---|---|---|
| Days from brief to send | `time_to_launch_days` | 5 working days or fewer |
| Brand score of drafts | `brand_score` | 80 or more (engine minimum) |
| Unsubscribe processing time | from `engine/consent.changed` to platform suppression | Under 1 hour (limit 48 hours) |
| Flow error rate | `flow_error_rate` | Under 1% |

## 3. Events this service sends

All results go through `engine/outbound.recorded` with `service=email` and `channel=email`. Types: `sent`, `delivered`, `clicked`, `converted`, `bounced`, `complained`, `unsubscribed`, `replied`, `failed`. `opened` is sent for deliverability only.

Service-owned events (names under `svc.email/`):

| Event | When |
|---|---|
| `svc.email/audience.synced` | Daily audience sync finished |
| `svc.email/consent.applied` | A consent change reached the platform |
| `svc.email/flow.published` | A flow went live |
| `svc.email/send.scheduled` | A calendar send is ready to write |
| `svc.email/deliverability.checked` | A monitor run finished, with the level |
| `svc.email/outbound.started` | An outbound sequence started |
| `svc.email/reply.received` | A reply came in (from the platform webhook) |
| `svc.email/reply.classified` | The triage agent sorted a reply |
