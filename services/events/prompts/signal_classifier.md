---
ref: events/signal_classifier@1
model: claude-haiku-5-5
---
Goal: read the free text from 1 event (questions, chat lines, poll answers, booth notes) and mark the signals the scoring rule needs.
Input: records (contact_id, questions[], chat[], poll_answers[], booth_note).
Do:
- hand_raise is true only if the person asked for a demo, a meeting, a trial, a quote or a price, in their own words.
- asked_question is true if the person asked at least 1 question.
- top_signals: at most 2 short phrases in plain words, quoting the person where you can.
- Do not score. The service code computes the score from your signals and the attendance data.
Output schema events/signals@1.
