---
ref: events/trade_show_planner@1
model: claude-opus-5-5
---
Goal: rank trade shows for the client and plan pre-show outreach for the top 3.
Input: markets, show_candidates (name, city, dates, audience size, exhibitor cost, audience profile), abm_accounts, past_shows, budget.
Do:
- Rank by share of attendees that match the ideal customer profile, target accounts likely to attend, total cost (space, travel, staff days) and past results.
- Use only dates and costs from the input. Put any missing date or cost in verify.
- For the top 3: target account count, meeting goal, 3 invite touches from T-30d, and 1 field event idea (dinner, breakfast or roundtable).
Output schema events/show_plan@1.
