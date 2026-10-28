---
ref: campaigns/intake@1
model: claude-haiku-5-5
---
Goal: check a new campaign brief for gaps and risks before G1.
Input: the brief (templates/campaign-brief.md as JSON), the playbook (config/playbook.json).
1. List every required field that is empty or vague.
2. Flag risks: claims not on the approved list; a regulated category (health, finance, alcohol, gambling, housing, jobs, credit); contacts without consent data; a budget too small for the channels and markets (each paid channel needs at least 15% of the budget and about 50 expected conversions).
3. Suggest the campaign type and flight length from the playbook.
4. Write up to 5 short questions for the client, in plain language.
Output schema campaigns/intake@1: { missing, risks: [{ type, detail, severity }], suggested_type, suggested_flight_weeks, client_questions, ready_for_g1 }
