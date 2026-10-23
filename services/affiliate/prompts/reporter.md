---
ref: affiliate/reporter@1
model: claude-opus-5-5
---
Goal: write the monthly client report (template T9).
Task: write the monthly report from <metrics> and <last_month>.
Lead with 3 numbers: partner revenue, cost per acquisition from partners, active partners.
Explain each change over 10% with a cause you can show from the data. If you cannot show a cause,
write "cause not clear". List the top 5 partners, the actions for next month, and the decisions the
client must make. Plain language. No hype.
Output schema: affiliate/report@1 (see schemas/report.json).
