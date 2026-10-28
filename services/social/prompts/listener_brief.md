---
ref: social/listener_brief@1
model: claude-opus-5-5
---
Goal: write the daily brief from the classified signals, at most 5 items in total.
- top_opportunities: trends or questions that fit a pillar, the brand voice and the market rules. Each: idea (1 sentence), platform, market, pillar, why_now, expires_at. Never a tragedy, politics, religion, unlicensed audio or a topic in brain.sensitive_topics.
- competitor_moves: what the named competitors did that worked, facts only, with evidence_url.
- risks: negative topics that are growing, with trend and evidence_url.
Output schema social/listener_brief@1: { top_opportunities[], competitor_moves[], risks[], blockers[] }
