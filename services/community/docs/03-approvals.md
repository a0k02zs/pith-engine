# Community and UGC: Approval points

Service 18. v1, 21 Oct 2026. Every gate is an item in the engine approval inbox (`/engine/specs/approval-inbox.md`). No private approval flow.

| Gate | When | Approval kind | Who approves | SLA | Can skip? | Workflow |
|---|---|---|---|---|---|---|
| G1 Programme plan | Onboarding, then each quarter | `plan` | account_lead + client_approver (2) | 48 h | No | `community.onboard` |
| G2 Templates | First use of each review request, rights form, community guideline, WhatsApp template; every change | `template` | client_approver | 48 h | Repeat use of an approved template with no new claims (engine skip rule) | `community.onboard` |
| G3a Mixed review reply | 3-star or amber-risk reply | `copy` | account_lead or client_approver | 12 h | No | `community.review_reply` |
| G3b Negative or sensitive review | 1 to 2 star, red risk, or suspected policy break. Engine guardrail G4: the agent may not reply; it attaches a suggested draft | `escalation` | account_lead (client_legal if legal or safety) | 1 h | Never | `community.review_reply` |
| Auto-post | 4 to 5 star, green risk, after the 30-day trial (every reply approved, edit rate under 10%) | none (brand score 85+ and compliance pass) | — | — | — | `community.review_reply` |
| UGC selection | Weekly candidate list and rights level | `shortlist` | social_lead + client_approver | 72 h | No | `community.ugc_rights` |
| G4a Paid rights deal | Any R3 request or any payment for UGC | `contract` | social_lead + client_legal (2) | 72 h | Never | `community.ugc_rights` |
| G4b Payout | Payment to a UGC owner | `payout` | client_finance | 72 h | Never | `community.ugc_rights` |
| G4c UGC in ads | Before any UGC is used in a paid ad, or any amber item is reused | `creative` | creative_lead or client_approver | 48 h | Only for green, non-ad use | `community.ugc_reuse` |
| G5 Escalation | Red community post, complaint, press, regulator, safety, legal | `escalation` | account_lead | 1 h | Never | `community.moderate`, `community.host` |
| Amber queue | Amber community posts | `content` | social_lead | 24 h | No | `community.moderate` |
| G6 Report | Monthly report before the client sees it | `report` | strategist or analytics_lead | 24 h | No | `community.weekly_report` |
| Champion list | Quarterly champion invitations | `shortlist` | social_lead | 72 h | No | `community.host` (manual) |

## Things an agent never does alone in this service

1. Reply to a 1 or 2 star review, a complaint, a journalist or a regulator.
2. Offer or pay money for UGC rights, or send a paid rights contract.
3. Put UGC into a paid ad.
4. Report a review to a platform as fake or abusive.
5. Post a review, rating or testimonial of any kind for a customer.
6. Change an incentive, or ask only happy customers for reviews.
