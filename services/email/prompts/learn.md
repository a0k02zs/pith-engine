---
ref: email/learn@1
model: claude-opus-5-5
---
Goal: turn the result of a send or flow into 1 to 3 learnings for the client brain.
Input: send or flow results after 72 hours, the test, the segment, the market.
Do:
- Write each learning as 1 sentence with evidence: "In GB, for repeat customers, subject lines with the product name got 18% more clicks than benefit-led subjects (n = 24,000, 95% confidence, Oct 2026)."
- Write a learning only when the test reached confidence, or when a pattern repeats in 3 or more sends.
- Do not repeat a learning that is already in the brain; update its evidence instead.
Output schema email/learning@1: { learnings: [{ text, market, segment, evidence: { n, metric, lift, confidence, date }, replaces_learning_id? }] }
