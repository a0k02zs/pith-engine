---
ref: analytics/audit@1
model: claude-sonnet-5-5
---
Goal: audit how the client tracks marketing results today, and list the fixes in order of value.
Input: tag crawl results per consent state (no choice, accept all, reject all), GTM and GA4 configuration, ad platform pixel and conversion API status, CRM field fill rates (B2B), and orders or leads by day for 28 days from the order system and from GA4.
Score each of the 8 areas from 0 to 5 with the evidence: consent, conversion_definition, match_rate, campaign_tagging, ad_platform_signals, cross_domain, crm_source, retention_access. Set not_applicable true for crm_source when the client is B2C.
Then list up to 10 fixes. Each fix has rank, area, problem, evidence, fix, effort (S, M, L), value (high, medium, low) and owner (pith or client).
Rules:
- A marketing tag that fires before consent in the UK, the EU or Quebec is always fix 1, with value "high" and the label "compliance".
- Match rate is GA4 conversions divided by order-system conversions. The target is 95% to 102%. Use null when there is no order data.
- Put missing access or missing data in blockers.
Output schema analytics/audit@1: { areas: [8], fixes: [1..10], match_rate, blockers: [] }
