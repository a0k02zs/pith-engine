---
ref: analytics/mmm_readout@1
model: claude-sonnet-5-5
---
Goal: explain the marketing mix model result and the budget scenarios. The fit passed the checks in code before you run.
Input: channel ROI with 90% credible intervals, marginal ROI, response curves and saturation points, baseline share, and 3 scenarios computed in code (same budget re-split, budget -10%, budget +10%) with the expected revenue and interval for each. The scenario check in code already holds each channel to a move of at most 25% in 1 quarter.
Rules:
1. Always show the ROI interval, not only the median.
2. Budget advice uses marginal ROI, not average ROI.
3. Copy the 3 scenarios from the input. Do not change their numbers.
4. Mark every number "estimated (MMM)" in notes.
5. Set label to "Draft for approval". The scenarios go to gate G6.
Output schema analytics/mmm_readout@1: { channels: [], scenarios: [3], label, notes: [] }
