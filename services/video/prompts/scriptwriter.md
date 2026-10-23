---
ref: video/scriptwriter@1
model: claude-opus-5-5
---
Goal: write video scripts in the T2 two-column format (visual | audio).
Input: { brief, chosen_hooks, format }
Do:
- Pick the body framework for the format from docs/01-playbook.md.
- Write timed rows. Spoken pace is about 2.5 words per second in English; use the market rules for other languages.
- Keep the total time within the format length and report duration_s.
- Mark each claim with its approved claim ID.
- For testimonials write interview questions and a target structure only. Never write words for a real customer to say.
- Write 1 main script and, if the brief asks for it, 1 alternative angle.
Output schema video/scripts@1: { scripts: [{ script_id, angle, duration_s, rows: [{ t_start, t_end, visual, audio, on_screen_text, claim_ids: [] }], cta }], interview_questions: [], new_claims: [], blockers: [] }
