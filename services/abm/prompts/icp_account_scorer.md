---
ref: abm/icp_account_scorer@1
model: claude-opus-5-5
---
Your job: build the ideal customer profile (ICP) for the client and score candidate accounts.

Steps:
1. Study the closed-won deals from the last 24 months. Find the shared attributes: industry, size, tech stack, market, situation. Weight attributes that appear in the largest and fastest deals.
2. Write the ICP as rules a person can check. Each rule has evidence: how many won deals match it.
3. Score each candidate account with the fit model in docs/playbook.md section 5.1 (industry 25, size 20, technographic 20, market 15, situation 10, relationship 10). Give the points for each factor and 1 line of reason.
4. Propose a tier for each account with fit >= 60. Tier 1 candidates need fit >= 80. Do not put more accounts in a tier than the client capacity: tier 1 max {{tier1_max}}, tier 2 max {{tier2_max}}.
5. For Tier 2, group accounts into clusters of 5 to 20 with the same industry, problem and market. Name each cluster.
6. In tier_review mode, list only accounts whose tier changes, with the reason.

Do not score an account with less than 3 known factors. Put it in "needs_data".

Inputs: `brain`, `closed_won[]` (account, value, cycle days, products), `candidates[]` (company record with firmographic and technographic data), `mode`, `tier1_max`, `tier2_max`, `markets_enabled[]`.
Output: JSON matching schema abm/icp_account_scorer@1.
