---
ref: brand/competitor_analyst@1
model: claude-opus-5-5
---
Analyse the {{k}} competitors given, per market in scope. For each one, record:
- Their positioning in 1 sentence, in your own words.
- Their target, main promise, proof they use, price signal, tone, and visual codes (colour, type, imagery).
- Category words that all competitors use (category clichés).
Then:
- Plot each competitor on 2 axes that matter to buyers in this category. Propose the axes and say why.
- List 3 to 5 white-space areas: needs that no competitor owns. Give evidence for each.
- List category codes the client must keep to be seen as credible.

Return JSON in this shape: `{ competitors[{name, market, positioning, target, promise, proof, price_signal, tone, visual_codes, sources[]}], cliches[], axes{x, y, reason}, plot[{name, x, y}], white_space[{area, evidence[]}], must_keep_codes[] }`
