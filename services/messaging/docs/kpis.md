# KPIs

Draft 1, 21 Oct 2026. Shared codes come from `engine/contracts/enums.json` (`kpis`). Service-only codes use the `messaging.` prefix, as the engine naming rule says.

Targets are Pith starting targets, not industry facts. The optimizer and reporter use them until each client has 8 weeks of its own data. Then the client baseline replaces them.

## Primary KPIs (in the weekly scorecard)

| KPI | Code | Formula | Target | Amber | Red (auto-pause) |
|---|---|---|---|---|---|
| Revenue from messaging | `revenue` (service=messaging) | Attributed revenue, 1-day click window for SMS and WhatsApp, 1-day for push | Growth vs last 4 weeks | Down > 15% | Down > 30% |
| Revenue per message | `revenue_per_message` | revenue ÷ delivered | Client baseline | | |
| Click rate | `ctr` | unique clicks ÷ delivered | SMS ≥ 5%, WhatsApp ≥ 8%, push ≥ 2% | Below target 2 weeks | Below half of target |
| Conversion rate | `cvr` | conversions ÷ delivered | Client baseline | | |
| Opt-out rate per send | `opt_out_rate` | opt-outs ÷ delivered, per send | Marketing SMS < 0.5%, WhatsApp < 0.3% | > 1% | > 2% (stops a broadcast) |
| WhatsApp quality | `whatsapp_quality` | Meta rating: 3 High (green), 2 Medium (yellow), 1 Low (red) | 3 | 2 (cut marketing 50%) | 1 (stop marketing) |
| Self-resolution rate | `self_resolution_rate` | chats closed with no person ÷ all chats | ≥ 60% | < 50% | < 35% |
| Delivery rate | `delivered` ÷ `sends` | | ≥ 97% SMS, ≥ 95% WhatsApp | < 95% | < 90% (check sender and carrier filtering) |

## Secondary KPIs

| KPI | Code | Target |
|---|---|---|
| Reply rate (two-way flows) | `reply_rate` | Client baseline |
| Median first reply time (person) | `median_reply_minutes` | < 15 min in service hours |
| Speed to lead (F10) | `lead_response_minutes` | < 1 min for the auto message |
| Meetings booked from reminders and F10 | `meetings_booked` | Client baseline |
| Meeting show-up rate after reminders | `show_up_rate` | +10 points vs no reminder (test with holdout) |
| Incremental lift (broadcast vs holdout) | `incremental_lift` | > 0 at 95% confidence |
| Message cost | `spend` (service=messaging, platform=twilio etc.) | Inside monthly budget |
| Consent-eligible reach | `messaging.eligible_contacts` | Grows month on month |
| Opt-in rate at capture | `messaging.optin_rate` | ≥ 20% of checkout or form views |
| Push opt-in rate | `messaging.push_optin_rate` | iOS ≥ 50% after the pre-prompt screen |
| Handoffs by reason | `messaging.handoffs` (props.reason) | Report only |
| Template approval rate at Meta | `messaging.meta_approval_rate` | ≥ 90% first time |

## Events this service sends

| Provider event | `engine/outbound.recorded` type |
|---|---|
| Message queued at provider | `sent` |
| Delivery receipt | `delivered` |
| WhatsApp read receipt | `opened` |
| Short link click | `clicked` |
| Conversion matched to message | `converted` |
| Undelivered or failed | `failed` |
| Opt-out word or button | `unsubscribed` |
| Inbound reply | `replied` |
| WhatsApp block or report | `complained` |

Each event carries `service=messaging`, `channel`, `platform`, `market`, `flow_id`, `variant_id`, `artifact_id` and `campaign_id` when there is one. UTM: `utm_source=<platform>`, `utm_medium=sms|whatsapp|push`, `utm_campaign=<flow_id or campaign_id>`, `utm_content=<variant_id>`.
