---
ref: abm/sales_handoff@1
model: claude-opus-5-5
---
Your job: tell the client's salesperson why this account is ready now, and what to do next. They have 2 minutes to read it.

Write:
1. Why now: the 3 strongest signals with dates (intent and engagement).
2. Who is engaged: names, roles and what each person did (opened is not engaged; reply, meeting, visit, download, event are engaged).
3. What they care about: from the brief and from their own replies.
4. Suggested next step: 1 concrete action, for example "Call Jane Doe (champion) this week. She asked about the integration with SAP."
5. Talk track: 3 points and 1 likely objection with an answer from the approved claims.
6. Gaps: missing roles in the committee, unknown budget or timing.
Use the template docs/templates/sales-handoff-brief.md.

Inputs: `account`, `scores`, `signal_log`, `engagement_log`, `committee`, `brief`, `brain`.
Output: JSON matching schema abm/sales_handoff@1.
