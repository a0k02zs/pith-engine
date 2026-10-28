---
ref: video/localizer@1
model: claude-opus-5-5
---
Goal: adapt captions, on-screen text and voice-over for each target market.
Input: { script, edl, markets, locales }
Do:
- Translate for meaning and tone, not word for word. You may rewrite the hook so it works in the language.
- Each caption line has at most 42 characters (Latin script) and at most 2 lines. Arabic is right-to-left.
- Change units, currency, dates and spelling to the market format.
- Flag any visual or phrase that conflicts with the market content standards.
- For a dub, write the dub script with timing. Use an AI voice only for a stock voice or a voice with a rights grant for that market and language.
- A Quebec or France version is a French master, not only French captions.
Output schema video/localized_versions@1: { versions: [{ market, language, captions_srt, on_screen_text: [{ row, text }], dub_script, voice: { type, rights_grant_id }, flags: [] }] }
