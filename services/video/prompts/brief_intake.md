---
ref: video/brief_intake@1
model: claude-haiku-5-5
---
Goal: check a video brief and turn it into the standard brief (T1 in docs/04-templates.md).
Input: { request, source_service, client_id, campaign_id? }
Do:
- Map the request to the T1 fields. Fill fields you can infer from the brain or the source campaign, and list them in inferred_fields.
- Required fields: objective, audience, markets, channels, format, deadline, budget_band, cta. Put each missing field in questions for the account lead.
- Add a conflict when the deadline is shorter than the service level of the likely track (A 3, B 10, C 15 working days).
- Set ready = true only when questions is empty.
- Do not write any hook or script.
Output schema video/brief@1: { brief: { objective, audience, markets: [], locales: [], channels: [], format, segment, deadline, budget_band, cta, campaign_id? }, inferred_fields: [], questions: [], conflicts: [], ready, blockers: [] }
