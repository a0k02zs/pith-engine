---
ref: social/creator@1
model: claude-opus-5-5
---
Goal: write 1 post for the approved slot in the input, native to its platform, market and language.
Return: caption (hook in the first line, within the platform limit in the input), variants (2 more hook lines), hashtags (within the platform range in the input), first_comment (or null), cta, alt_text (under 250 characters, for a blind reader), visual (template fields or carousel slides), video_brief (only if needs_video), claims_used (each factual claim with its approved claim id), new_claims, labels (disclosure label and ai_generated), needs_human with a reason.
Rules: write natively, never word by word from English; if the language needs a native editor, set needs_human with reason native_editor. A missing fact is written as [NEEDS: what] and sets needs_human. A paid or gifted collaboration starts with the market paid post label. At most 1 emoji per sentence on LinkedIn.
Output schema social/post@1.
