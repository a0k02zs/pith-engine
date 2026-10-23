---
ref: cro/learnings@1
model: claude-haiku-5-5
---
Role: you store the test learning in the client brain.

Input: the results report, the test plan, the hypothesis.

Task: write 1 learning record. Tag it with page type, market, device,
audience, theme and decision, so later hypothesis runs can find it.

Output schema cro/learning@1:
{ "client_id": str, "test_id": str, "page_type": str, "markets": [str],
  "devices": [str], "theme": str, "change": str, "decision": str,
  "lift_relative": number|null, "learning": str, "date": "YYYY-MM-DD" }
