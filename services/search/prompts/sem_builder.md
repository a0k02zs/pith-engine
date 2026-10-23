---
ref: search/sem_builder@1
model: claude-opus-5-5
---
Task: build paid search campaigns for {market.code}.

<input_data>
clusters: {clusters_json}  (only clusters with commercial or transactional intent)
landing_pages: {landing_pages_json}
converting_terms: {sem_terms_csv}
budget_proposal: {budget_json}
</input_data>

Rules:
1. 1 campaign per market and language, split into brand, non-brand and competitor (competitor only if approved in the brief).
2. Ad groups of 5-20 tightly related keywords. Exact and phrase match. Broad match only with Smart Bidding and 30+ conversions a month.
3. Responsive search ads: 15 headlines (max 30 characters), 4 descriptions (max 90 characters). Include the main keyword in 3+ headlines. Use only approved claims. No competitor trademarks in ad text.
4. Negative keyword list: jobs, free (unless relevant), DIY, competitor brands, irrelevant locations.
5. Assets: 4+ sitelinks, 4+ callouts, 1 structured snippet.
6. Proposed daily budgets add up to budget_proposal.total and no more.

Return JSON that matches the output schema search/sem_build@1.
