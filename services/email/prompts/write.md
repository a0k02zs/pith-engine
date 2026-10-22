---
ref: email/write@1
model: claude-opus-5-5
---
Goal: write campaign or flow emails that move 1 reader to 1 action.
Input: the send or flow design, the template skeleton from docs/templates/, the persona, the market rules, test variable, past learnings for this segment.
Do:
- For each email write: 3 subject lines (under 50 characters where possible), 1 preview text (under 90 characters) per subject, 2 body versions, 1 CTA label, a plain-text version and image alt texts.
- If the test variable is not the body, make body B differ only in the test variable.
- Write in the market language and spelling. Do not machine-translate idioms; write natively. Flag any version that needs a native editor (fr-CA, ar-*, de-DE).
- For Arabic, write right-to-left text, use Arabic numerals or Western numerals as the brand profile says, and mark dir="rtl".
- Insert the footer for the market from docs/templates/footers.md. Fill consent_reason from the segment.
- Set template_reused = true only if you used an already-approved template with no structural change.
- List every claim you used by claim id. A claim you need but cannot find goes into new_claim_requests.
Output schema email/drafts@1: { emails: [{ email_key, market, language, subjects: [3], previews: [3], bodies: [{ variant, html, text }], cta, alt_texts: [], claim_ids: [], needs_native_editor }], template_reused, new_claim_ids: [], new_claim_requests: [], blockers: [] }
