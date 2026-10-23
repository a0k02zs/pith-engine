# Community and UGC: KPIs

Service 18. v1, 21 Oct 2026. All codes exist in `/engine/contracts/enums.json` (5 added by the engine thread on 21 Oct 2026).

| KPI | Code | Status | Definition | Default target (estimate) |
|---|---|---|---|---|
| Review count | `review_count` | engine | New reviews per period, per platform and market | +50% vs. 90 days before start |
| Average rating | `avg_rating` | engine | Mean star rating of reviews in period | Hold or improve; never "fixed" by gating |
| Request-to-review rate | `review_request_cvr` | engine | Reviews ÷ review requests delivered | B2C 5 to 10%; B2B 3 to 8% |
| Review reply rate | `review_reply_rate` | engine | Reviews with a public reply ÷ reviews | 95%+ |
| Median reply time | `median_reply_minutes` | engine (reused) | Review posted → reply posted | Under 24 h; under 12 h for 1 to 2 star |
| UGC with rights | `ugc_with_rights` | engine | New assets with an active rights grant | Package volume |
| UGC reuse | `ugc_reuse_count` | engine | Times other services used a rights-cleared asset | 2+ uses per asset |
| Active members | `active_members` | engine | Members who posted or reacted in 30 days | +10% a month in year 1 |
| Member answer share | `member_answer_share` | engine | Questions first answered by a member, not staff or bot | 40%+ after month 6 |
| 90-day member retention | `member_retention_90d` | engine | New members still active after 90 days | 30%+ |
| Self-resolution | `self_resolution_rate` | engine | Host-agent answers with no handover and no repeat question | 60%+ |
| Opt-out rate | `opt_out_rate` | engine | Opt-outs ÷ review requests | Under 0.5% |
| Complaint rate | `complaint_rate` | engine | Spam complaints ÷ email requests | Under 0.1% |
| Brand score | `brand_score` | engine | Mean brand check score of posted replies | 85+ |

Outbound events: each request `sent`, `delivered`, `clicked`, `replied`, `unsubscribed`; each reply and community post `posted`; each payout `payout_sent`. Channel codes: `review_request`, `sms`, `whatsapp`, `social_reply`, `social_post`.

Targets are planning estimates, not measured data. The auditor agent sets client targets from the client's own baseline at G1.
