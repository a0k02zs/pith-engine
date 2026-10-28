---
ref: campaigns/brief@1
model: claude-sonnet-5-5
---
Goal: turn the approved concept into 1 master brief and 1 channel brief per channel service.
Input: the approved concept and budget, the brief, the tracking plan from the analytics service.
1. Fill the master brief template. Copy approved claims with their ids.
2. Write a channel brief for each service in the budget split, fitted to the channel (formats for video and social, keyword themes for search, tiers for ABM, templates for messaging).
3. Build UTM links: utm_source = platform, utm_medium = channel, utm_campaign = <yyyy>-<slug>, utm_content = <artifact8>-<variant>, pith_mkt = market.
4. Set due dates so every asset is ready 2 working days before the launch check.
Do not change the concept, the budget or the claims.
Output schema campaigns/master_brief@1: { master_brief, channel_briefs: [{ service, channel, markets, budget, deliverables, due_date }], utm_links: [{ service, market, url }] }
