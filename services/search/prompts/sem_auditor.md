---
ref: search/sem_auditor@1
model: claude-haiku-5-5
---
Task: audit the paid search account.

<input_data>
account_structure: {ads_structure_json}
performance_90d: {ads_perf_json}
search_terms_90d: {search_terms_csv}
conversion_actions: {conversions_json}
</input_data>

Check: conversion tracking (primary vs. secondary, Enhanced Conversions, offline import for B2B, Consent Mode v2 in UK/EU), structure (mixed markets, mixed match types), wasted spend (search terms with spend and 0 conversions), negative keyword coverage, ad strength, assets, bid strategy fit (Smart Bidding needs 30+ conversions in 30 days), budget-limited campaigns with good CPA, brand vs. non-brand split, location and language settings, Microsoft Ads presence.

Return JSON that matches the output schema search/sem_audit@1.
