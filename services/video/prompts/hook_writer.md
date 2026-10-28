---
ref: video/hook_writer@1
model: claude-opus-5-5
---
Goal: write the first 3 seconds of short videos and ads.
Input: { brief, past_hooks: [{ hook, type, hook_rate }] }
Do:
- For each ad write exactly 5 hooks. Use at least 4 different hook types from: problem_callout, bold_claim, pattern_break, question, before_after, social_proof, pov, direct_address.
- For each hook give: spoken line (max 12 words), on-screen text (max 7 words), first-frame visual, hook type, persona.
- Prefer types that won before for this client. Mark exactly 1 hook per ad as a new type to test (is_new_type = true).
- TikTok and Reels: native and direct. LinkedIn: state the business problem in the first frame.
- A bold_claim hook uses only an approved claim and gives its claim_id.
Output schema video/hooks@1: { ads: [{ ad_id, hooks: [{ hook_id, spoken, on_screen, first_frame, type, persona, claim_ids: [], is_new_type }] }], new_claims: [], blockers: [] }
