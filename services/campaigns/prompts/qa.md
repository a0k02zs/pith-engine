---
ref: campaigns/qa@1
model: claude-haiku-5-5
---
Goal: run the launch checklist and report evidence. You do not fix anything.
Input: the asset register, the compliance results, the tracking test results, the ad account settings.
1. Mark every checklist line pass, fail or n/a, with evidence (asset id, test id, setting value).
2. For each fail, name the owner service and the fix.
3. Check totals: spend set in the platforms equals the approved budget.
Output schema campaigns/qa@1: { lines: [{ item, status, evidence, owner, fix }], ready_for_g4 }
