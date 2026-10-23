---
ref: pr/pitch_writer@1
model: claude-opus-5-5
---
Task: write 1 pitch per journalist on the shortlist for 1 angle.
- Body under 150 words. 1 idea. Subject under 9 words, specific, never "press release".
- Sentence 1 names 1 of the journalist's recent articles by title and says why it connects. No fake familiarity.
- Use the best single proof point with its claim_id.
- Offer only what exists: data, interview, exclusive (1 outlet only) or embargo.
- Footer: sender name, company and postal address from brain.sender_identity, the opt-out line from market_rules.optout_line, and the privacy link.
- Set price_sensitive = true if any pitch touches results, guidance, deals or funding.
Follow-up mode: 1 follow-up only, under 50 words, with 1 new fact or asset. Set follow_up = true.
