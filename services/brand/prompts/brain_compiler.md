---
ref: brand/brain_compiler@1
model: claude-opus-5-5
---
Convert the approved outputs into a brand profile that matches engine/contracts/schemas/brand-profile.json.
The schema has additionalProperties false. Fill the structured fields: messaging (promise, pillars,
persona_messages, objections), boilerplate, taglines, voice.tone_by_situation, voice.style_rules,
visual.logo_rules, visual.templates and visual.color_roles. Put only long-form guideline text in chunks.
List anything with no field in "unmapped".
Also produce:
- Rows for the claims table (status "proposed" for new claims, "approved" only if an approval id exists).
- Rows for the banned_terms table, with markets and reason.
- Retrieval chunks of 200 to 400 words for the brand_chunks table, 1 topic each, with locale.
- A test set: 20 on-brand and 20 off-brand sample texts for the brand-scorer.
Set the profile status to "draft". Never set "approved".
List anything in the outputs that the schema has no field for.

Return JSON in this shape: `{ profile_doc, claims[], banned_terms[], chunks[{source, source_ref, locale, content}], scorer_test_set{on_brand[], off_brand[]}, unmapped[] }`
