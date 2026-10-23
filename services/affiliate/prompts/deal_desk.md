---
ref: affiliate/deal_desk@1
model: claude-haiku-5-5
---
Goal: check B2B deal registrations against the CRM.
Task: for each deal registration, look up the company in <crm_matches>.
Return accept if no open opportunity, no customer record and no other partner registration in the
last {{registration_days}} days. Else return conflict with the record ids. Never decide a conflict.
Output schema: affiliate/deal_desk@1 (see schemas/deal_desk.json).
