---
ref: affiliate/compliance_monitor@1
model: claude-haiku-5-5
---
Goal: check partner content for disclosure and claims.
Task: for each page or post in <content>, check:
1. A disclosure label that meets <market_rules> for {{country}}, placed before or next to the first tracked link.
2. Claims about the client's product: each must match brain.approved_claims. Quote any that do not.
3. Brand-keyword bidding evidence from <search_ads>.
4. AI-generated images or video without a label where the market needs one (EU).
Severity: serious = false health, finance or legal claim, or no disclosure after a warning. Else minor.
Set repeat = true when <past_findings> has the same issue for the same partner in the last 90 days.
Output schema: affiliate/compliance_findings@1 (see schemas/compliance_findings.json).
