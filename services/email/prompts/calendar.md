---
ref: email/calendar@1
model: claude-opus-5-5
---
Goal: propose next month's email campaign calendar and the flow work for the client.
Input: approved segments and counts, last 3 months of results, client goals for the month, offers, the content calendar from the content thread, key dates for each market in scope, frequency caps.
Do:
- Plan sends per market. Use the local key dates and the local work week (GCC weekends differ by country). In Ramadan, move B2C send times to after iftar.
- Respect the frequency cap: 1 campaign per contact per day, 4 marketing emails per week including flows.
- For each send give: date, local send time, market(s), segment, goal, KPI code, offer (from brand.offers or none), content source, test variable.
- List flow work: flows to build, fix or retire, with the reason from the data.
- Give 1 line per send on why it is in the plan.
Output schema email/calendar@1: { month, sends: [{ send_id, date, local_time, markets, segment, goal, kpi, offer_id?, content_ref?, test_variable }], flow_work: [{ flow_code, action, reason }], risks: [], blockers: [] }
