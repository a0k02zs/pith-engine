# Performance and paid social: KPIs

Version 0.2, 21 Oct 2026. Built against engine contract 0.1.0 (`engine/contracts/enums.json`, `schemas/metric-event.json`).

Every day this service sends `engine/metric.recorded` (kind `kpi`) per ad and KPI, and `engine/outbound.recorded` (type `spent`) for spend. The engine writes the rows. The analytics service (12) owns the final dictionary.

## 1. KPI dictionary

Column "Engine code": a code that exists in `enums.json` now. All codes are in the engine (the last 9 were added on 21 Oct 2026 at this service's request). "(derived)" means the warehouse calculates it and the service does not send it.

| KPI | Engine code | Formula | Grain | Main for |
|---|---|---|---|---|
| Spend | `spend` | Platform spend in client currency | ad, day | all |
| Impressions | `impressions` | Platform count | ad, day | all |
| Reach | `reach` | Platform count | ad set, day | all |
| Link clicks | `clicks` | Platform count | ad, day | all |
| Click-through rate | `ctr` | Clicks ÷ impressions | ad, day | all |
| Conversions | `conversions` | Count of the optimization event | ad, day | all |
| Conversion rate | `cvr` | Conversions ÷ clicks | ad, day | all |
| Revenue | `revenue` | Purchase value (platform-reported) | ad, day | B2C e-commerce |
| Cost per acquisition | `cpa` | Spend ÷ conversions | ad set, day | B2C lead, app |
| Return on ad spend | `roas` | Revenue ÷ spend | campaign, day | B2C e-commerce |
| Leads | `leads` | Platform or CRM count | campaign, day | B2B |
| Cost per lead | `cpl` | Spend ÷ leads | campaign, day | B2B |
| Sales-qualified leads | `sqls` | CRM count (offline conversion) | campaign, day | B2B |
| Pipeline value | `pipeline_value` | CRM value of opportunities from ads | campaign, day | B2B |
| Hook rate | `hook_rate` | 3-second video views ÷ impressions | ad, day | video |
| Hold rate | `hold_rate` | ThruPlays or 15-second views ÷ 3-second views | ad, day | video |
| Completion rate | `completion_rate` | 100% views ÷ 3-second views | ad, day | video |
| Creative win rate | `test_win_rate` | Variants marked "win" ÷ variants tested | client, month | all |
| Incremental lift | `incremental_lift` | (Test conversions − control conversions) ÷ control conversions | platform, per lift test | all |
| Tracking coverage | `tracking_coverage` | Spend with tracked conversions ÷ all spend | account, day | all |
| Cost per 1,000 impressions | (derived) | Spend ÷ impressions × 1,000 | warehouse | all |
| Cost per click | (derived) | Spend ÷ clicks | warehouse | all |
| Frequency | `frequency` | Impressions ÷ reach, 7 days | ad set, day | all |
| New-customer CPA | `new_customer_cpa` | Spend ÷ first purchases | campaign, day | B2C e-commerce |
| Cost per SQL | `cost_per_sql` | Spend ÷ SQLs | campaign, month | B2B |
| Pipeline return | `pipeline_roas` | Pipeline value ÷ spend | campaign, month | B2B |
| Incremental CPA | `incremental_cpa` | Spend ÷ incremental conversions | platform, per lift test | all |
| Incremental ROAS | `incremental_roas` | Incremental revenue ÷ spend | platform, per lift test | B2C |
| Budget pacing | `pacing` | Month-to-date spend ÷ planned month-to-date spend | account, day | all |
| Tracking match | `tracking_match` | Platform conversions ÷ backend conversions | account, week | all |
| Creative refresh time | `creative_refresh_days` | Days from fatigue alert to new ad live | client, month | all |

## 2. Targets at launch

These are starting targets. They are estimates, not measured data. Set real targets per client at gate G1 from the client's margin and past results.

| KPI | Start target | How to set it per client |
|---|---|---|
| CPA | Target CPA = (average order value × gross margin) ÷ 1.5 | From client margin data |
| ROAS | Break-even ROAS = 1 ÷ gross margin; target = 1.3 × break-even | From client margin data |
| Cost per SQL | Target = average deal value × SQL-to-won rate × 0.2 | From CRM data |
| Creative win rate | 15 to 25% | Track for 1 quarter, then set |
| Creative refresh time | 7 days or less | Fixed |
| Pacing | 95 to 105% | Fixed |
| Tracking match | 80 to 120% | Fixed; outside this range, fix tracking first |
| Frequency | ≤ 3.0 prospect, ≤ 6.0 retarget (7 days) | Fixed |

Example: average order value £80, gross margin 50%. Target CPA = 80 × 0.5 ÷ 1.5 = £26.67. Break-even ROAS = 1 ÷ 0.5 = 2.0. Target ROAS = 2.6.

## 3. Event payloads

The service sends daily values the next day at 06:00 client time. It sends days 1 to 7 back again each day, because platforms add late conversions. A re-sent value has `props.restated = true`; the engine keeps the latest value per key.

KPI value (`engine/metric.recorded`):

```json
{
  "name": "engine/metric.recorded",
  "data": {
    "client_id": "6f1c2a4e-0000-4000-8000-000000000123",
    "service": "paid_social",
    "kind": "kpi",
    "kpi": "cpa",
    "value": 24.10,
    "currency": "GBP",
    "date": "2026-10-20",
    "channel": "paid_ad",
    "platform": "meta",
    "market": "GB",
    "campaign_id": "acme_GB_meta_test_purchase_202610",
    "variant_id": "T014-V03",
    "props": {
      "platform_campaign_id": "120210000000",
      "ad_set_id": "120210000001",
      "ad_id": "120210000002",
      "stage": "test",
      "test_id": "T014",
      "restated": false
    },
    "occurred_at": "2026-10-21T06:00:00Z",
    "source": "meta_ads"
  }
}
```

Spend (`engine/outbound.recorded`, 1 per ad per day):

```json
{
  "name": "engine/outbound.recorded",
  "data": {
    "client_id": "6f1c2a4e-0000-4000-8000-000000000123",
    "service": "paid_social",
    "kind": "outbound",
    "type": "spent",
    "channel": "paid_ad",
    "platform": "meta",
    "market": "GB",
    "value": 182.40,
    "currency": "GBP",
    "campaign_id": "acme_GB_meta_test_purchase_202610",
    "variant_id": "T014-V03",
    "utm": {"source": "meta", "medium": "paid_social", "campaign": "acme_GB_meta_test_purchase_202610", "content": "T014-V03_vid915_socialproof_q-hook_en"},
    "occurred_at": "2026-10-20T23:59:59Z",
    "source": "meta_ads"
  }
}
```

`campaign_id` holds the campaign name from `templates/naming-convention.md`, so it matches `utm_campaign`. The platform IDs go in `props`.

## 4. Weekly report contents

See `templates/weekly-report.md`. It shows the main KPI against target, spend and pacing, the test results, fatigue alerts, what the agents changed and why, and the 3 next actions.
