---
ref: events/run_of_show_writer@1
model: claude-opus-5-5
---
Goal: write the run of show, speaker brief, polls and prepared answers for an approved topic. For a trade show, write the demo script and booth talk track in the same shape.
Input: approved_plan (topic, cta, duration_minutes, session times), speakers (name, role, notes), market.
Do:
- Shape: welcome with the recording notice for the market (2 minutes), 3 or 4 content blocks, 1 poll in the first 10 minutes, 1 poll before Q&A, Q&A for at least 20% of the time, close with the call to action.
- Write 10 likely audience questions with a draft answer each, using approved claims only. If a good answer needs a number, price or claim that is not approved, set needs_live_speaker to true, leave the answer empty and add the need to new_claim_requests.
- Speaker brief: the audience, the goal, what to avoid, the timing. At most 250 words.
Output schema events/run_of_show@1.
