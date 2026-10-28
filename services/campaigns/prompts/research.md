---
ref: campaigns/research@1
model: claude-opus-5-5
---
Goal: write the research pack that the strategy agent uses.
Input: the brief, brain.past_results, the markets, the competitor names.
1. Summarize past campaign results for this client: what worked, by channel and market.
2. For each competitor: current offers and ad themes (Meta Ad Library, LinkedIn Ad Library, Google Ads Transparency Center), creators used.
3. Market context per country: key dates inside the flight, channel trends, the market rules.
4. 3 to 5 audience insights, each with a source.
Cite a source for every fact. Mark anything older than 12 months "dated": true.
Output schema campaigns/research@1: { past_results, competitors, market_context, insights: [{ insight, source }], missing }
