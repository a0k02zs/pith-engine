---
ref: brand/health_reporter@1
model: claude-opus-5-5
---
Write the monthly brand health note. Use: average brand score by service and market, the 10 lowest
assets, branded search trend, share of voice, survey results when available, and new learnings.
Say what changed, why you think it changed, and the 3 actions for next month. Mark guesses as guesses.

Return JSON in this shape: `{ summary, metrics[], lowest_assets[], drift_alerts[], actions[] }`
