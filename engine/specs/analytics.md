# Measurement — spec v0.1.0

1 dashboard per client, with the same KPI names across services, and a weekly AI report (plan, "Measurement").

## 1. Ownership split (agreed with the Analytics and attribution thread, service 12)

- **Engine owns:** event capture (`engine/outbound.recorded`, `engine/metric.recorded`, `engine/conversion.recorded`), the core tables (`outbound_events`, `metrics_daily`, `touchpoints`, `conversions`, `attributions`), the KPI dictionary (`contracts/enums.json` → `kpis`) and the UTM standard below.
- **Service 12 owns:** the tracking plan per client, the attribution models (rule-based and data-driven), the marketing mix model, incrementality tests and the client reports. It writes model output to `attributions` and to `metrics_daily` with `source=model`.

## 2. KPI codes

Shared codes and units are in `enums.json`. Units: `money` (with ISO currency), `count`, `ratio` (0 to 1, never percent), `number`.
Service-only KPIs use `<service>.<name>`, for example `content.pieces_published`. Promote to a shared code when 2 or more services use it.

Common mappings from service specs: open rate is not a KPI (plan: weak signal after Apple Mail Privacy Protection); GEO citation share = `ai_citation_share`; cost per finished video = `cost_per_finished_video`.

## 3. Formulas (engine computes these daily from raw counts)

| KPI | Formula |
|-----|---------|
| `ctr` | clicks ÷ impressions (ads, social) or clicks ÷ delivered (email) |
| `cvr` | conversions ÷ clicks |
| `roas` | revenue ÷ spend (same currency) |
| `cpa` | spend ÷ conversions |
| `bounce_rate`, `complaint_rate`, `opt_out_rate` | bounces, complaints, unsubscribes ÷ sends |
| `revenue_per_recipient` | attributed email revenue ÷ delivered |
| `hook_rate` | 3-second views ÷ impressions |
| `show_up_rate` | attendees ÷ registrations |
| `ai_citation_share` | tracked prompts that cite the client ÷ tracked prompts |

## 4. UTM standard

All links that leave a Pith channel carry UTMs. Lower case, words joined with `-`.

| Param | Value |
|-------|-------|
| `utm_source` | platform: `klaviyo`, `hubspot`, `linkedin`, `meta`, `google`, `tiktok`, `snapchat`, `whatsapp`, `<creator-handle>`, `<partner-id>` |
| `utm_medium` | channel code from `enums.channels` (`email`, `sms`, `paid_ad`, `social_post`, `influencer_post`, ...) |
| `utm_campaign` | `campaign_id` (`<yyyy>-<slug>`, for example `2026-black-friday`) |
| `utm_content` | `<artifact_id short 8>-<variant_id>` |
| `utm_term` | keyword (search) or audience id (paid social) |
| `pith_mkt` | market ISO code |

## 5. Currency and time

Store money in the original currency plus a daily `reporting_currency` value from the client's home market. Store times in UTC; report by client local date.

## 6. Consent and tracking

Tracking events from GB and EU visitors require `tracking` consent (consent mode keeps modelled data). Contacts with `gpc_opt_out` are excluded from ad platform audience syncs.
