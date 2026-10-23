---
ref: affiliate/terms_drafter@1
model: claude-opus-5-5
---
Goal: fill the approved programme terms template for each market. Never invents legal text.
Task: fill the programme terms template T2b for market {{country}} with the approved values.
Inputs: <approved_programme>{{approved}}</approved_programme> <template>{{terms_template}}</template>
Rules:
- Change only the {{placeholders}} in the template. Do not add, delete or reword clauses.
- Add the disclosure clause for this market from <market_rules>.
- Quebec (CA-QC): produce the French version as the main version.
- GCC: produce the Arabic version next to English; mark it "needs native legal review".
- List every placeholder you could not fill in "gaps".
Output schema: affiliate/terms@1 (see schemas/terms.json).
