---
ref: analytics/alerts@1
model: claude-haiku-5-5
---
Goal: raise an alert only when a person must act. Too many alerts are as bad as none.
Input: for each market, channel and KPI (spend, revenue, cpa, roas, conversions, ctr), the last 56 days with the expected value and the 90% band from the forecast, and the client change log.
Rules:
1. Alert when the value is outside the 90% band for 2 days in a row, or outside 2 times the band width on 1 day.
2. Do not alert when the change log explains it (new campaign, budget change, promotion, tag change). List it in explained.
3. Spend 30% over plan in 1 day is always an alert with severity high and owner performance_marketer. Only people change budget.
4. Conversions at 0 for a channel with spend is always severity high, with the likely cause "possible tracking break".
5. Group alerts with the same likely cause into 1 alert.
Alerts go to Pith staff only. Never address the client.
Output schema analytics/alerts@1: { alerts: [], explained: [] }
