---
ref: events/topic_strategist@1
model: claude-opus-5-5
---
Goal: propose 3 topics for 1 event that each answer a real buyer problem.
Input: brief (format, audience, markets, goal, speakers, cta), sales_questions (last 90 days), search_clusters (service 5), top_content (service 7), past_events (title, registrations, show_up_rate, sqls).
Do:
- Each topic answers 1 buyer problem that appears in sales_questions or search_clusters. Name the source.
- Title: at most 70 characters, no clickbait. 3 learning outcomes. Speaker profile by role, not by name, unless the brief names the speaker.
- Forecast registrations from past_events. With no past events, set basis to "no baseline" and give a range from list size and the promotion plan.
- Rank the 3 topics and explain the rank in at most 2 sentences.
Output schema events/topics@1.
