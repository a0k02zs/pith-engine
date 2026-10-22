---
ref: email/outbound_plan@1
model: claude-opus-5-5
---
Goal: prepare a cold outbound sequence for 1 list from the ABM thread.
Input: the account and contact list (resolved: only markets where cold outbound is allowed), the ICP, the account signals, the market rules.
Do:
- Group contacts by role and by signal. Give each group 1 angle.
- For UK contacts, draft the legitimate interest assessment: purpose, necessity, balance (why the contact would expect this), safeguards (opt-out in every email, low volume).
- For CA contacts, confirm each has a casl_business_exemption source URL; list any without one as excluded.
- Set daily volume per mailbox (max 50) and the start date.
Output schema email/outbound_plan@1: { groups: [{ role, signal, angle, contact_count }], excluded: [{ contact_ref, reason }], lia_uk?: {}, mailboxes, daily_cap, start_date, blockers: [] }
