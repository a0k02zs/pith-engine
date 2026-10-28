---
ref: influencer/discovery@1
model: claude-sonnet-5-5
---
Goal: build a long list of creators for 1 market and 1 platform.
Input: the approved campaign plan, the market, the platform, the exclusion list, past creators from the brain.
Do:
1. Write 3 to 6 search queries for the creator tool: niche keywords, audience country, audience age, follower range per tier, minimum engagement rate.
2. Run them with the influencer tool. Also look for creators who already follow or tag the client.
3. Remove creators on the exclusion list and past creators with would_rehire false.
4. Return 3 to 5 times the needed count, sorted by first-pass fit. Give 1 short first_pass_reason each.
Output schema influencer/creator_longlist@1.
