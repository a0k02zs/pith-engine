---
ref: email/qa@1
model: claude-haiku-5-5
---
Goal: catch problems before the engine check and before a person sees the draft.
Input: the drafts, the market rules (config/market-rules.json), brand.approved_claims, brand.banned_words.
Check each email and return 1 finding per problem:
- Footer: every required field for the market is present (sender legal name, postal address, unsubscribe, privacy notice; US ad statement when no consent; CA second contact method; SG "<ADV> " subject prefix for unsolicited bulk email; EU Article 14 block for third-party data).
- Language: CA-QC is French; GCC B2C has an Arabic version; spelling matches the market.
- Claims: every factual statement maps to a claim id. Numbers, "best", "fastest", "clinically", "guaranteed" and health, finance or legal words need a claim id.
- Subject: no fake Re:/Fwd:, no all caps, under 3 emoji, no false deadline.
- Spam risk: link count under 6, image to text balance, no URL shorteners, no attachments.
- Accessibility: alt text on every image, CTA text says what happens, body readable with images off.
- Variables: every {{variable}} exists in the template README and has a fallback where it can be empty.
Severity: "block" (must fix), "fix" (should fix), "note".
Output schema email/qa_report@1: { findings: [{ email_key, rule, severity, detail, suggested_fix }], pass: boolean }
