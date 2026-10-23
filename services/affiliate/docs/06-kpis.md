# Service 15 · Affiliate and partner marketing · KPIs

Version 1 · 21 Oct 2026. KPI codes come from `engine/contracts/enums.json`. Every metric is emitted as
`engine/metric.recorded` with `service: 15` (`affiliate`) and the channel `affiliate_link`.

## KPIs that use existing engine codes

| KPI | Engine code | Formula | Target (planning, not measured) |
|---|---|---|---|
| Partner revenue | `revenue` (dimension `source=partner`) | Sum of approved, net partner-attributed revenue | Client goal from T1 |
| Cost per acquisition from partners | `cpa` | (commission + bonuses + platform fees) ÷ approved conversions | Below the client's paid-media CPA |
| Return on partner spend | `roas` | Partner revenue ÷ total partner cost | ≥ 5 for B2C affiliate; client goal for B2B |
| Active partners | `active_partners` | Partners with ≥ 1 click in the month | Grow 10% a month in the first 6 months |
| Fraud rate | `fraud_rate` | Reversed for fraud ÷ all conversions (by value) | < 2% |
| Conversions | `conversions` | Approved partner conversions | |
| Clicks | `clicks` | Tracked partner clicks | |
| Conversion rate | `cvr` | Conversions ÷ clicks | |
| Disclosure compliance | `disclosure_compliance` | Checked partner pages with a correct label ÷ checked pages | 100% |
| Recruitment reply rate | `reply_rate` | Replies ÷ outreach sends | ≥ 8% (B2C), ≥ 5% (B2B) |
| B2B pipeline from partners | `pipeline_value` | Value of open opportunities from accepted registrations | Client goal |
| B2B win rate on partner deals | `win_rate` | Closed-won ÷ closed partner deals | |
| Time to launch | `time_to_launch_days` | Intake to go-live | ≤ 15 working days |

## KPIs added to the engine for this service (21 Oct 2026)

| Code | Unit | Formula | Why |
|---|---|---|---|
| `activation_rate` | ratio | Partners with ≥ 1 conversion within 90 days ÷ partners who joined in that cohort | The main health signal of a programme |
| `reversal_rate` | ratio | Reversed commission ÷ total commission (all reasons) | Drives the max commission formula |
| `payout_amount` | money | Net commission paid in the period | Budget tracking against the cap |
| `partner_revenue_concentration` | ratio | Top 5 partners' revenue ÷ partner revenue | Risk: dependence on few partners |
| `epc` | money | Partner earnings ÷ clicks (earnings per click) | Standard affiliate metric; partners compare programmes by it |

## Weekly and monthly views

- Weekly (internal): new applications, approvals, outreach replies, holds, disclosure findings.
- Monthly (client, template T9): the top-line 3, health, fraud and quality, payout vs cap, B2B pipeline.
- Quarterly (Gold partners): partner QBR pack with their own clicks, sales, EPC and next quarter plan.
