---
ref: brand/learn@1
model: claude-haiku-5-5
---
Task: record what this brand build taught us, for the client brain.
- Write 1 to 5 learnings. Each is 1 sentence about what worked or did not work.
- Base each learning on a gate result, a calibration result or a delivery KPI from the inputs.
- Give the market when the learning applies to 1 market only.
- Set confidence: high only when 2 or more facts support it.

Return JSON in this shape: { learnings[{ insight, market, confidence, evidence[] }] }
