# Service 16: Events and webinars — KPIs

Version 1, 21 Oct 2026. Every KPI code below is in `engine/contracts/enums.json` (contract v0.1.0). The engine thread added the event codes on 21 Oct 2026.

**Targets are starting targets for planning, not measured data.** After 3 events for a client, the `ev-report-writer` agent proposes targets from that client's own results.

## 1. KPI dictionary

| KPI code | Unit | Formula | Source |
|---|---|---|---|
| `registrations` | count | Unique registrants for the event (all sessions) | Platform webhook → `engine/outbound.recorded` type `registered` |
| `attendees` | count | Unique registrants who joined live for 1 minute or more | Platform → type `attended` |
| `show_up_rate` | ratio | `attendees` ÷ `registrations` | Engine aggregate |
| `on_demand_views` | count | Unique people who watched the replay for 1 minute or more | Platform |
| `avg_watch_minutes` | number | Mean live minutes per attendee | Platform |
| `cost_per_registration` | money | Event cost ÷ `registrations` | Budget + spend events |
| `cost_per_attendee` | money | Event cost ÷ `attendees` | Budget + spend events |
| `follow_up_minutes` | number | Median minutes from event end to the first follow-up `sent` for each registrant | Engine, from `sent` events |
| `booth_leads` | count | Unique badge scans with a note (trade shows) | Lead app |
| `leads` | count | New contacts from the event | CRM |
| `sqls` | count | Hot leads that sales accepted | Sales hand-off gate decisions |
| `meetings_booked` | count | Meetings booked within 14 days with the event as a touch | CRM |
| `pipeline_value` | money | Opportunity value with the event as a touch, within 90 days | CRM, attribution model (Service 12) |
| `cpl` | money | Event cost ÷ `leads` | Engine |
| `cost_per_opportunity` | money | Event cost ÷ opportunities | Engine |
| `revenue` | money | B2C: sales during the live session and the 48-hour offer window | Commerce platform |
| `brand_score` | number | Mean brand score of event assets | Engine brand check |

"Event cost" = platform add-ons + paid promotion + speaker fees + booth, venue and travel. Pith fees are not in it unless the client asks.

## 2. Starting targets

| KPI | Webinar B2B | Webinar B2C | Trade show |
|---|---|---|---|
| `show_up_rate` | 35% or more | 30% or more | — |
| `follow_up_minutes` (median) | under 1,440 (24 hours); hot leads under 240 | under 1,440 | under 1,440 |
| Hot lead to sales | under 4 business hours | — | under 1 business day |
| `sqls` ÷ `attendees` | 5% or more | — | — |
| Sales acceptance rate of hot leads | 60% or more | — | 50% or more |
| `on_demand_views` ÷ `registrations` | 15% or more | 10% or more | — |
| Assets made from the recording | 10 | 6 | 4 |
| `meetings_booked` | per plan gate | — | per plan gate |

## 3. Reports

| Report | When | Content |
|---|---|---|
| Live pacing | Daily from T−28d | Registrations against the forecast curve, per market and source (`ev-registration-pacer`). |
| First look | E+7d | Registrations, show-up rate, watch time, follow-up speed, hot leads, sales acceptance, top questions. |
| Pipeline | E+30d | Meetings, SQLs, opportunities and pipeline influenced, cost per opportunity. |
| Learning | E+90d | Revenue influenced. Lessons for the client brain (`engine/learning.recorded`). Score weight change, if sales feedback shows one. |

All reports go through the report gate (strategist) before the client sees them.

## 4. How events show up in the weekly client report

The engine weekly report (`/clients/{client_id}/reports/weekly`) shows events by the same KPI codes. Service 12 owns attribution. This service says "pipeline influenced" unless the attribution model gives the event first-touch or a measured lift.
