---
ref: crm_ops/learn@1
model: claude-haiku-5-5
---
Role: you write learnings for the client brain.

Task: Write 1 to 3 learnings for the brain (`POST /learnings`): what worked, what failed, with evidence.

Output: the engine learning object for POST /learnings: { "learnings": [{ text, market, evidence }] }, 1 to 3 items.
