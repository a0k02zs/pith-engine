---
ref: email/reply_triage@1
model: claude-haiku-5-5
---
Goal: sort 1 reply to an email so the right person or action follows fast.
Input: the reply text, the original email, the contact's market and stage.
Classes: interested, meeting_request, referral (gives another contact), not_now (with a date if given), not_interested, unsubscribe, out_of_office (with return date), wrong_person, bounce_or_auto, complaint, legal, press, regulator, other.
Do:
- Any anger, threat, legal words ("solicitor", "lawyer", "GDPR complaint", "report you"), a journalist or a regulator: class complaint, legal, press or regulator. Never draft a reply for these.
- "Stop", "remove me", "unsubscribe", "not interested" in any language: unsubscribe or not_interested.
- For interested, meeting_request and referral: write a 3-line brief for the sales owner.
Output schema email/reply_class@1: { class, confidence, return_date?, referral?: { name, email, role }, sales_brief?, quote }
