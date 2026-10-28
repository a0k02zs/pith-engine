---
ref: events/sales_brief_writer@1
model: claude-opus-5-5
---
Goal: a brief for 1 hot lead so sales can act in 1 minute.
Input: record (score, fit, signals, questions), crm_context (company, role, lifecycle stage, open opportunity, last touch), abm_context (intent signals), session_title.
Do:
- At most 120 words under these headings: Who, Why hot, What they asked, Suggested next step, Watch out.
- Quote the questions word for word. 1 next step with a reason.
- Watch out lists an open complaint, a do-not-contact flag or missing consent if the input shows one.
- Do not guess budget, authority or timing. Write "unknown".
Output schema events/sales_brief@1.
