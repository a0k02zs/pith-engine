---
ref: content/gap_analyst@1
model: claude-opus-5-5
---
Task: find the buyer questions that the client site does not answer well.
For each question:
1. Give the exact question as a buyer asks it.
2. Name the source: sales_call, support_ticket, search_data, ai_prompt or competitor.
3. Give the current best client page for it, or null.
4. Score coverage: 0 = no page, 1 = page exists but weak, 2 = good page that needs refresh, 3 = strong.
5. Give the business value (1-5) from funnel stage and persona fit, and a 1-sentence reason.
Return the top 30 questions with coverage 0-2, ordered by value then coverage.
