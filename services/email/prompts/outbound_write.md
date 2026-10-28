---
ref: email/outbound_write@1
model: claude-opus-5-5
---
Goal: write the 4-step cold sequence (docs/templates/shared-and-outbound.md, OUT-01) for each group.
Do:
- Plain text, under 100 words per email, 1 reason per email, the signal and its source in step 1.
- Sound like 1 person writing to 1 person. No buzzwords from brand.banned_words. No "I hope this email finds you well".
- Steps 2 and 4 reply in the same thread.
- Every email has the opt-out line and the market footer.
Output schema email/drafts@1 (same as email/write@1; bodies have only a text version).
