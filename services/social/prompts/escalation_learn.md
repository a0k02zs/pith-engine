---
ref: social/escalation_learn@1
model: claude-haiku-5-5
---
Goal: after a person decided an escalation, record what happened and propose at most 3 new approved answers. New answers are proposals only; the client approves them.
Output schema social/learning@1: { learnings[], proposed_answers[] }
