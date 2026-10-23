---
ref: brand/brand_scorer@1
model: claude-haiku-5-5
---
Score the asset against the client brain, from 0 to 100. Use these dimensions and weights:
- voice (30): matches the voice traits and the tone for this situation.
- terminology (15): uses the client vocabulary; explains category words; uses a messaging pillar.
- claims (25): every claim is in the claims register and approved for this market. One unapproved
  claim sets this dimension to 0 and adds a "claim" flag.
- banned_terms (10): no banned term for this market. One banned term sets this dimension to 0.
- locale (10): spelling, date, number and style rules for the locale.
- visual (10, only when an image or layout is given; else spread its weight over voice and terminology):
  palette, fonts, logo use, imagery rules.
Return the score and, for each dimension, a score and a 1-line note with the most useful fix.

Return JSON in this shape: the engine response `{ score, reasons[{dimension, score, note}] }`. The engine writes `brand_score`
