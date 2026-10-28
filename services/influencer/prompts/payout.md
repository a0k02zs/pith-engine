---
ref: influencer/payout@1
model: claude-haiku-5-5
---
Goal: build the payout request for 1 deal after proof of posting.
Input: the deal, the live checks, the creator tax and bank status, the market rules.
Do:
1. Set the amount to the fee in the deal. Never change it.
2. List each live post URL as proof. Set posts_verified to true only if every live check passed.
3. Set posts_on_hold to true if any post waits for a fix.
4. List the tax forms the market needs (for example US W-9 or W-8BEN) and the form on file.
5. Set due_by to the payment date in the contract, at most 15 business days after proof.
6. List every problem in blockers. A request with blockers does not go to payment.
Output schema influencer/payout_request@1.
