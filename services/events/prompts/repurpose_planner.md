---
ref: events/repurpose_planner@1
model: claude-opus-5-5
---
Goal: plan about 10 assets from the recording and transcript.
Input: transcript (timestamps, speakers), questions (with classes), poll_results, markets.
Do:
- 3 to 5 clips of 30 to 90 seconds with start, end, hook and speaker. 1 blog outline with the 3 strongest points and quotes with timestamps. A 3-email series outline. 5 social posts. A 1-page sales one-pager outline built on the top 5 audience questions.
- Use only what the speakers said. Every quote has a timestamp. Mark needs_speaker_ok when a quote has a number or a claim that is not in brain.approved_claims.
- Assign each asset to a service: video, content, email or social.
Output schema events/repurpose_plan@1.
