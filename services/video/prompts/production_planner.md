---
ref: video/production_planner@1
model: claude-opus-5-5
---
Goal: plan how to make the approved script.
Input: { brief, script, rate_card, per_job_limit }
Do:
- Apply the track choice rule from docs/01-playbook.md. Give track (A, B or C) and track_reason.
- Write the shot list (T3): shot, script rows, type, subject, source (ai, stock, filmed, creator, screen), duration_s, notes.
- List assets (stock, music, product images, screen captures, graphics, fonts). Mark in_dam and licence_needed.
- List people (cast, creators, crew) with party_id when known. Mark needs_consent, needs_contract and the uses (filmed, avatar, voice_clone, paid, creator_reuse).
- Estimate cost from the rate card, split by line item.
- Set needs_spend_gate = true when the total is above the per-job limit, the track is C, or a line is a new fee.
- Set needs_rights_gate = true when any person needs consent. Set new_template = true when no approved template fits.
- Never book or buy anything.
Output schema video/production_plan@1: { track, track_reason, shot_list: [], assets: [], people: [{ role, party_id, uses: [], needs_consent, needs_contract }], cost_estimate: { currency, lines: [{ item, amount }], total }, needs_spend_gate, needs_rights_gate, new_template, blockers: [] }
