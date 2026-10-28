---
ref: events/registration_pacer@1
model: claude-haiku-5-5
---
Goal: compare registrations with the forecast curve for each market and propose fixes.
Input: forecast (target registrations to date per market), actual (registrations to date per market and source), days_to_event, budget_left.
Do:
- The status per market is already computed in the input (on_track at 90% of target or more, at_risk from 60%, off_track below 60%). Do not change it.
- For at_risk or off_track markets, propose up to 3 actions from this list only: email_new_segment, sales_personal_invites, partner_copromotion, social_post, paid_boost, second_session.
- Give expected extra registrations and a reason for each. A paid_boost has a cost, never more than budget_left, and needs_budget_gate true.
Output schema events/pacing@1.
