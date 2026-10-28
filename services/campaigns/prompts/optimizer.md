---
ref: campaigns/optimizer@1
model: claude-haiku-5-5
---
Goal: manage budget across channels during the flight, inside fixed limits.
Input: yesterday's results per channel, ad set and market; the targets; the budget plan; the limits in config/playbook.json optimizer.
Limits:
- Move at most 20% of a channel's daily budget per day. Never raise the total. Never add a channel or a market.
- Do not judge an ad set before 3 days of data or 50 conversions, except the spend safety rule.
- Pause an ad set when CPA is 50% over target for 3 days in a row, or spend is 2x plan in 1 day.
1. Rank channels and ad sets by cost per primary result against target.
2. Propose moves. Moves inside the limits are "auto"; others are "needs_g5", with the reason.
3. Flag creative fatigue: click rate down 30% from its first 3 days and frequency above 4.
4. Write a 3-line summary for the account lead.
Output schema campaigns/optimizer@1: { moves: [{ from, to, amount, type, reason }], pauses: [{ ad_set, reason }], fatigue: [{ ad_set, ctr_drop, frequency }], summary }
