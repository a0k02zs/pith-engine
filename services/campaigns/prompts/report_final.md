---
ref: campaigns/report_final@1
model: claude-opus-5-5
---
Goal: write the final campaign report from the data. A strategist reviews it before the client sees it.
Input: KPI data per channel and market, the optimizer log, holdout results, the targets.
1. Fill the final report template.
2. Explain changes with data. Do not claim cause without a test; say "linked with" for a correlation.
3. Write 3 to 5 lessons as rules for the client brain, each with its evidence and market.
Output schema campaigns/report@1: { report_markdown, lessons: [{ rule, evidence, market }], decisions_needed }
