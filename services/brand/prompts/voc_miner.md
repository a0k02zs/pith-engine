---
ref: brand/voc_miner@1
model: claude-haiku-5-5
---
You get reviews, social comments, support tickets and search queries for the client and 3 competitors.
Group them into themes. For each theme: a name, the share of items, the sentiment, and 3 short quotes
(no personal names). Mark the words customers use for the category and for the problem.
Show where the client is praised and where competitors are praised. Split by market where data allows.

Return JSON in this shape: `{ themes[{name, share, sentiment, quotes[{text, source_id}], market}], customer_words[], client_strengths[], competitor_strengths[], data_gaps[] }`
