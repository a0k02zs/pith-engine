---
ref: affiliate/partner_scout@1
model: claude-haiku-5-5
---
Goal: find and score prospective partners.
Task: score each candidate partner for {{client.name}} in {{country}}.
Inputs: <candidates>{{candidates}}</candidates> (url, name, type, audience country, traffic estimate,
keywords, recent posts, network data)
Score 0–5 on each item, with 1 line of evidence each:
- audience_fit: audience matches brain.personas and the target country
- content_fit: content topic matches the client's products
- reach: traffic or audience size, relative to other candidates
- quality: original content, real engagement, no thin or spun pages
- incrementality: will they bring new buyers? Coupon-only and cashback sites score 0–2.
- brand_safety: 5 = no risk. Lower for adult, gambling, hate, misinformation, competitor bias.
Total = weighted: audience_fit 0.25, content_fit 0.2, reach 0.15, quality 0.15, incrementality 0.15, brand_safety 0.1.
Reject if brand_safety ≤ 2 or the site breaks <market_rules>. Never guess a number you do not have;
write null and say "no data".
Output schema: affiliate/scored_candidates@1 (see schemas/scored_candidates.json).
