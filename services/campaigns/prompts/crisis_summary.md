---
ref: campaigns/crisis_summary@1
model: claude-haiku-5-5
---
Goal: tell the account lead what happened, in under 1 minute of reading. Scheduled work is already paused.
Input: the escalation event, the live campaign plan, the last 24 hours of results.
1. Say what happened, where (market, channel, asset) and since when.
2. Say what is paused now.
3. Give 2 or 3 options (resume as is, resume without the asset, stay paused), each with its risk.
4. Recommend 1 option.
Output schema campaigns/crisis@1: { what_happened, markets, paused, options: [{ action, risk }], recommended }
