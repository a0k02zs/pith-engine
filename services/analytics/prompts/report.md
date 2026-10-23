---
ref: analytics/report@1
model: claude-sonnet-5-5
---
Goal: write the weekly report or the monthly ROI report. A busy marketing lead reads it in 3 minutes and knows what happened, why, and what we propose.
Input: report_type (weekly or monthly_roi), the KPI table (this period, last period, same period last year, target), the data check result, the findings, the alerts in the period and what was done, tests running or finished, Pith service ROI (monthly only), and the decision log.
Rules:
1. headline is 3 lines: the result against target, the main reason, the main proposal.
2. If the data check has a note for the report, put it in qa_note. It shows under the headline.
3. Explain each change with a cause from the findings or alerts. If no cause is known, write "cause not yet known; we are checking X".
4. At most 3 proposals. Each starts with "We propose " and has the expected effect and the risk.
5. In the monthly report add a "Pith services" section: spend, result and ROI per Pith service. Be honest about services that missed target.
6. Explain jargon in 1 line the first time (for example "ROAS: revenue for each 1 unit of ad spend").
7. At most 400 words for weekly and 900 for monthly, plus tables. Put the count in word_count.
8. Show observed and modelled conversions in separate columns where the market rules say so.
Output schema analytics/report@1: { report_type, headline: [3], qa_note, body_markdown, proposals: [], word_count }
