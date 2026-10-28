# Performance and paid social: approval points and guardrails

Version 0.1, 21 Oct 2026. All gates use the engine approval inbox (`/approvals`, schema `approval-item.json`). This service builds no private approval flow.

## 1. Approval gates

| Gate | Engine approval kind | What is approved | Approver | When | Inbox SLA | Can it skip? |
|---|---|---|---|---|---|---|
| G1 Budget and plan | `budget` | Monthly budget per platform and market, targets (CPA or ROAS), test budget | Client budget owner, then Pith performance marketer | Onboarding, then monthly | 2 working days | Never |
| G2 Creative and claims | `creative` (and `claim` for a new claim) | Each new batch of ad variants: copy, visuals, claims, offers, AI labels, creator rights | Pith creative lead; client for new claims, new offers and first batch | Every test cycle (2 weeks) | 1 working day | The `creative` gate: yes, for a resize or a translation of an approved ad with no new claim. The `claim` gate never skips; the workflow goes to it only when a variant has a new claim. The compliance gate still runs. |
| G3 Launch check | `go_live` | Tracking, consent, naming, audiences, special categories, daily caps | Pith performance marketer | Before the first launch in each account and each new market | 1 working day | Never. The engine lets only copy, creative, content and template gates skip (`engine/specs/approval-inbox.md` §4), so a person signs every launch. |
| G4 Budget change | `budget_change` | Any move over 20% on 1 campaign in 1 day; any rise in total spend; any new paid spend; a new platform or market | Pith performance marketer; client if total spend rises | When the optimizer proposes it | 4 working hours | Never |
| G5 Pause override | `budget_change` | Restart of an ad set that the guardrail paused | Pith performance marketer | When needed | 4 working hours | Never |
| G6 Weekly report | `report` | The weekly report before the client sees it | Pith performance marketer | Every Monday | Same day | Never |
| G7 Escalation | `escalation` | Ad account warning or ban, policy rejection on appeal, negative comments with press or legal risk | Pith head of growth | At once | 1 hour in business hours | Never |

The agent writes each inbox item with: the draft or the proposed change, the reason, the expected effect with numbers, the brand score, and the compliance result.

## 2. What agents do without approval

- Read results from the platform APIs.
- Move budget between ad sets and campaigns inside the approved total, at most 20% per campaign per day.
- Pause an ad, an ad set or a campaign. A pause is always allowed.
- Raise alerts.
- Draft creative, test cards and reports.
- Upload approved creative to the test campaign after G2 and G3.

## 3. What agents can never do

These come from the master plan, "Governance and risk". The workflow layer blocks them in code.

1. Raise a budget or start new paid spend.
2. Restart an ad set that a guardrail paused.
3. Publish an ad with a new claim, price, or health, finance or legal statement.
4. Reply to a complaint, a journalist or a regulator in ad comments or messages.
5. Upload a contact that `POST /audiences/resolve` did not return as eligible for `paid_ad` in their country.
6. Accept a platform policy change, a new ad account, or new payment details.
7. Appeal a platform policy rejection. A person writes the appeal.

## 4. Automatic guardrails

| Guardrail | Trigger | Action |
|---|---|---|
| Daily cap | Account spend reaches monthly budget ÷ days × 1.3 | Platform account spend limit stops spend. Set by a person at G3. |
| CPA auto-pause | Ad set CPA ≥ 1.5 × target for 3 days in a row, with spend ≥ 2 × target CPA | Pause the ad set. Inbox item G5. |
| Zero conversion | Ad spends 3 × target CPA with 0 conversions | Pause the ad. |
| Spend spike | Daily spend ≥ 1.3 × plan | Alert to the performance marketer. |
| Silent tracking | 0 conversions recorded on an account for 24 hours, when the 28-day average is 5 a day or more | Alert. Check pixel and server events before any budget move. The optimizer stops budget moves until a person clears the alert. |
| Month pacing | Month-to-date spend over 105% of plan | Reduce daily budgets to land on plan. |
| Policy | Ad rejected or account warning | Pause related ads. Inbox item G7. |
| Frequency | Prospect frequency > 3.0, or retarget > 6.0, over 7 days | Ask for new creative (fatigue workflow). |

## 5. Who is who

| Role (engine role code) | In this service |
|---|---|
| `client_finance` | Signs the monthly budget and targets (G1, and G4 when total spend rises) |
| `client_approver` | Approves new claims, new offers and the first creative batch (G2) |
| `performance_marketer` | Owns the accounts, G1 check, G3 to G6 |
| `creative_lead` | G2 |
| `head_of_growth` | G7 and disputes |

Role and approval kind codes come from `engine/contracts/enums.json` (contract 0.1.0). The engine also enforces the spend rules in code (`engine/specs/workflow.md` §5, rules G1 and G7) and sends `engine/spend.alert` for spikes, caps and the CPA rule. The gate names G1 to G7 in this file are local to this service; they are not the engine rule numbers.
