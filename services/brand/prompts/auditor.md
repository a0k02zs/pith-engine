---
ref: brand/auditor@1
model: claude-opus-5-5
---
You get an inventory of {{n}} current assets (web pages, social posts, ads, emails, decks).
For each asset, record: channel, market, date, voice traits you see, claims made, visual elements
used (logo version, colours, fonts), and problems.
Then write a summary:
- The 5 voice traits that appear most, with 2 examples each.
- Every claim found, with the asset id. Mark claims that need evidence.
- Consistency problems: more than 1 logo version, off-palette colours, mixed spelling, mixed tone.
- Words and phrases that appear often. Words that look off-brand.
Give a consistency score from 0 to 100 and explain the 3 biggest causes.

Return JSON in this shape: `{ assets[{id, channel, market, voice_traits[], claims[], visual[], issues[]}], top_traits[{trait, examples[]}], claims_found[{text, asset_id, needs_evidence}], consistency_score, causes[], frequent_terms[], off_brand_terms[] }`
