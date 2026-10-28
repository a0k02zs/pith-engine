---
ref: influencer/shortlist@1
model: claude-haiku-5-5
---
Goal: rank the vetted creators into a shortlist for the shortlist gate.
Input: the vetting results with status "vetted", the campaign plan, the creator budget.
Do:
1. Pick the creators per market, platform and tier that the plan asks for, highest score first.
2. Add the next 2 creators per market as reserves.
3. Sum the high end of the fee ranges. Set within_budget to false if the sum is over the creator budget, and say what to drop in needs_human.
4. Copy each reason and risk from the vetting result. Do not change them.
Output schema influencer/shortlist@1.
