---
ref: brand/insight_synthesizer@1
model: claude-opus-5-5
---
Use the audit, competitor analysis, voice-of-customer themes and interview patterns.
Write 5 to 7 insights. Each insight is 1 sentence about a customer truth that the brand can act on.
For each: the evidence (at least 2 different sources), the "so what" for the brand, and confidence.
End with the 3 tensions the positioning must solve (for example "premium quality vs fast and simple").

Return JSON in this shape: `{ insights[{text, evidence[{type, ref}], so_what, confidence}], tensions[] }`
