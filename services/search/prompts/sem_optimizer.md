---
ref: search/sem_optimizer@1
model: claude-haiku-5-5
---
Task: propose today's changes for the account. You can only propose changes inside these guardrails:

<guardrails>
approved_total_daily_budget: {budget.total}
max_move_per_campaign_pct: 20
target_cpa: {target_cpa} or target_roas: {target_roas}
pause_rule_keyword: spend >= 2 x target_cpa and conversions = 0
pause_rule_campaign: cpa > 1.5 x target_cpa for 3 days in a row
</guardrails>

<input_data>
perf_1d: {perf_1d}
perf_7d: {perf_7d}
perf_30d: {perf_30d}
search_terms_7d: {search_terms_csv}
</input_data>

Return JSON that matches the output schema search/change_set@1: "changes" (every proposal, with type, target, from, to, reason) and "alerts".
The service code (splitChanges) decides which changes it may apply and which go to gate G3b. Do not decide that yourself.

Propose a change outside the guardrails only with a clear reason; a person approves it.
