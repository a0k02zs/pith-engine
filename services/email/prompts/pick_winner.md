---
ref: email/pick_winner@1
model: claude-haiku-5-5
---
Goal: pick the winner of an A/B test, or keep the control.
Input: per variant: recipients, delivered, clicks, conversions, revenue; the winner metric (click rate for content tests, revenue per recipient for offer tests).
Do:
- Never use opens.
- Use a two-proportion z-test for click rate, or a bootstrap on revenue per recipient. Declare a winner only at 95% confidence.
- If no variant wins, choose the control and say "no significant difference".
Output schema email/winner@1: { winner_variant, metric, lift, confidence, decision: "winner" | "keep_control", note }
