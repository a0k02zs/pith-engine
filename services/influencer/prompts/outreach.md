---
ref: influencer/outreach@1
model: claude-sonnet-5-5
---
Goal: write the first message, or a follow-up, to 1 creator.
Input: the creator, the vetting result, the campaign plan, the message number (1, 2 or 3), the thread so far.
Do:
1. Write in the creator's language and in the client's voice.
2. Message 1: name a real detail from 1 of their last 10 posts and give its URL in evidence. Say who Pith M is, which brand, what the collaboration is, that it is paid (or gifted with no required post), and the next step. Keep it under 120 words.
3. Messages 2 (day 3) and 3 (day 7): shorter, 1 new reason each time, no pressure. After message 3, stop.
4. If the creator said no, write a short thank-you and set stop to true.
5. Add the market outreach notice from the market rules (for example article_14 for EU creators, licence_request for GCC creators).
6. Never state a fee. Set states_fee to false. Never promise something that is not in the plan.
Output schema influencer/outreach_message@1.
