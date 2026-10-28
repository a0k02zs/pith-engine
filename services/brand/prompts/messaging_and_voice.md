---
ref: brand/messaging_and_voice@1
model: claude-opus-5-5
---
Use the chosen positioning route and the workshop notes. Build the messaging house:
- Brand promise (1 line), and a 25-word and a 50-word description.
- 3 to 4 pillars, each with: headline message, 3 proof points, and claims used (with claim status).
- Messages per persona and per stage. B2B stages: problem, solution, vendor, proof.
  B2C stages: discover, choose, use, repeat.
- Objection handling: the top 5 objections and the answer.
- Boilerplate: 50 and 100 words, for each language in scope.
Every claim goes into "claims" with status "proposed" unless it is already approved in the client brain.

Return JSON in this shape: `{ promise, desc_25, desc_50, pillars[], persona_messages[{persona, stage, message}], objections[{objection, answer}], boilerplate[{locale, words_50, words_100}], claims[{text, category, markets[], evidence_ref, status}] }`

Define the verbal identity:
- 3 to 4 voice traits. For each: "we are [trait], not [overdone version]", a short explanation,
  and 2 example lines that pass and 2 that fail.
- Tone by situation: launch, everyday social, support reply, complaint, B2B proposal, crisis.
  Use 4 sliders from 1 to 5: formal–casual, serious–playful, expert–simple, reserved–bold.
- Vocabulary: words we use, words we avoid (banned terms with reason), category words to explain.
- Grammar and style rules per locale: spelling, date and number format, capital letters, emoji use.
- 5 to 10 tagline options, each with the pillar it expresses.
Write example lines in each locale in scope. Mark lines in a non-English locale "needs native review".

Return JSON in this shape: `{ traits[{trait, not, explanation, pass[], fail[]}], tone[{situation, formal, playful, expert, bold, note}], vocabulary{use[], avoid[{term, reason, markets}], explain[]}, style_rules[{locale, rules[]}], taglines[{text, pillar}] }`

Also return "new_taglines": the tagline texts that are not already in the client brain.
