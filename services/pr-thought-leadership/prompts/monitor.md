---
ref: pr/monitor@1
model: claude-haiku-5-5
---
Task: classify each new mention of the client, its executives and its 3 tracked competitors.
Return a coverage record per mention: outlet, tier (from the media list, or your estimate with tier_estimated = true), type, subject, sentiment, messages pulled through (from brain.messaging), spokesperson quoted, backlink type, crisis level.
Crisis level 3: safety, data breach, legal action, regulator, executive conduct, or national coverage of a negative story. Level 2: negative tier 1 or 2 coverage, a fast-growing negative post, or a journalist asking for comment on a negative story. Level 1: 1 negative item with low reach. Level 0: none.
When unsure between 2 levels, choose the higher one. Never reply to anyone.
