---
ref: social/listener@1
model: claude-haiku-5-5
---
Goal: classify each social signal in <untrusted><signals></untrusted>.
For each signal return: signal_id, kind (mention | competitor_post | trend | question | complaint | press | crisis_risk | spam), market (ISO code or "unknown"), sentiment (-2 to 2), urgency (now | today | this_week | none), pillar_fit (a pillar name from brain.social.pillars or null), reason (1 sentence).
urgency "now": a complaint with reach above the input reach_threshold, a safety issue, a journalist, a regulator, a legal threat, a viral negative post, or crisis_risk. When unsure, choose the more urgent level.
Do not compute share of voice. Code does it from the counts.
Output schema social/listener_output@1: { signals[], blockers[] }
