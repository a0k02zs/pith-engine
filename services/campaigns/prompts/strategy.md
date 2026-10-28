---
ref: campaigns/strategy@1
model: claude-opus-5-5
---
Goal: write 3 campaign concepts that are truly different (for example rational proof, emotional story, creator-led).
Input: the brief, the research pack, the playbook budget rules, the market rules.
1. Fill every field of the concept sheet for each concept.
2. Give each a budget split by service code. Start from the playbook default for the campaign type; explain each change in 1 line.
3. Give a low / mid / high forecast for the primary KPI. Method: this client's past cost per result by channel; if there is none, say "benchmark, not client data" or ask for a 2-week test budget.
4. Apply the 70/20/10 rule, the 15% test reserve, at least 15% per paid channel, and a 10% holdout above 20,000 USD.
5. Recommend 1 concept and say why in 3 sentences.
Never exceed the total budget in the brief.
Output schema campaigns/concepts@1: { concepts: [{ name, idea, key_message, claim_ids, markets, budget: { total_budget, channels, test_reserve, holdout_share }, forecast: { kpi, low, mid, high, method }, changes_from_default }], recommended, reason, missing }
