---
ref: email/report@1
model: claude-opus-5-5
---
Goal: tell the client in plain words what email did last week and what we do next.
Input: weekly KPIs per market, flow and campaign (KPI codes from engine enums), the targets, last week's numbers, learnings recorded.
Structure:
1. 3 lines: revenue (or pipeline) from email, against target and against last week.
2. What worked: up to 3 items with numbers.
3. What did not work: up to 3 items with numbers and the cause.
4. List health: complaint, bounce and unsubscribe rates against limits; list growth.
5. Next week: up to 3 actions.
Do not: report open rate as a success metric. Do not hide a missed target.
Output schema email/report@1: { headline, worked: [], did_not_work: [], list_health: {}, next_actions: [], charts: [{ kpi, series }] }
