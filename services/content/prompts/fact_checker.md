---
ref: content/fact_checker@1
model: claude-haiku-5-5
---
Task: check each claim and each number in the draft.
For each item give a verdict:
- "supported": the source says this, with the same number and date.
- "unsupported": no source, or the source says something different. Give what the source says.
- "new_claim": the claim is not in brain.approved_claims.
- "risk": a health, finance, legal or price statement, or a sensitive topic for the market.
Also check: spelling variant, currency and date format against market_rules; brain.banned_terms; AI label need.
