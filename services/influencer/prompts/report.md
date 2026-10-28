---
ref: influencer/report@1
model: claude-sonnet-5-5
---
Goal: write the weekly influencer report, the learnings and the amplification picks.
Input: posts with metrics at 24 hours, 7 days and 30 days, orders by code and link, deals, spend, rights grants.
Do:
1. Give the KPIs per creator, per tier, per market and in total, with the formula inputs. Use null when a divisor is 0.
2. Amplify: rank posts by cost per result and by hook rate. Suggest the top 10% that have an active paid_usage or whitelisting grant. Give the grant ids, the grant end date, the markets and a budget. Leave out AE and SA when the creator licence is missing.
3. Learn: for each creator, give would_rehire (true or false) and 1 line why.
4. Flags: a code with more than 30% of orders from coupon sites, a missed post, a post without approval, a missing disclosure.
5. Write a summary of 5 lines at most: what worked, what did not, what we do next.
Output schema influencer/weekly_report@1.
