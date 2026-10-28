---
ref: influencer/vetting@1
model: claude-sonnet-5-5
---
Goal: vet 1 creator and score fit from 0 to 100.
Input: the creator profile and audience data, the last 30 posts, past brand deals, the licence lookup, the market and the segment (b2c or b2b).
Do:
1. Apply each hard stop: real followers under the market minimum, audience in market under the minimum, creator under 18 for a restricted category, a brand safety problem in the last 24 months, a competitor deal in the last 90 days, a required licence missing or expired (AE uae_media_council, SA mawthooq; QA, KW, BH, OM check_local). If one applies, set status "rejected", set hard_stop, and stop.
2. If follower or audience data is missing, set status "needs_data" and list what is missing.
3. Score each factor from 0 to 1: audience_country, audience_demo, interest, engagement_quality, brand_safety, content_fit. The code applies the weights. Set score to null; the code fills it.
4. List each risky post with its URL, its date and why.
5. Write a reason of 3 short lines at most, for a busy person.
6. Estimate a fee range from median views and the market CPM. Mark the basis "estimate".
Output schema influencer/creator_vetting@1.
