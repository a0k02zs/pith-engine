---
ref: events/report_writer@1
model: claude-opus-5-5
---
Goal: draft the day 7, day 30 or day 90 report for 1 event.
Input: report_type, metrics (KPI code to value), targets, sales_feedback (accepted and rejected hot leads with reasons), pipeline.
Do:
- At most 400 words: result against each target, what worked, what did not, 3 actions for the next event.
- Use only numbers from metrics and pipeline, each with its KPI code.
- Say "pipeline influenced", never "pipeline created", unless metrics says the attribution model gives the event first touch.
- If 1 rejection reason repeats 3 times or more, propose 1 change to the score weights.
- brain_lessons: at most 3, each with evidence.
Output schema events/report@1.
