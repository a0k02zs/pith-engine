# Approval points (human gates)

Draft 1, 21 Oct 2026. Every gate uses the engine approval inbox (`engine/specs/approval-inbox.md`). Kinds and roles come from `engine/contracts/enums.json`. This service builds no private approval flow.

| Gate | When | Kind | Who (roles) | SLA | Reviewer sees | Can skip? |
|---|---|---|---|---|---|---|
| G1 Plan | Onboarding, then monthly | `plan` | account_lead | 48 h | Planner JSON as a table: flows, broadcasts, volume, cost per market, risks | No |
| G1b Native review | A template is in Arabic, Quebec French, German or Chinese | `copy` | native_editor | 48 h | Each variant with an English back-translation | Yes, if no variant needs native review |
| G2 Template | New template, new offer or new claim | `template` | client_approver | 48 h | Phone preview per channel, segment count, brand score, pre-check and engine compliance result | Yes, for a reused approved template with no new claims (engine skip rule) |
| G2b Claim | Copy uses a claim or price that is not in the client brain | `claim` | client_legal or client_approver | 72 h | Claim text, markets, evidence link | Never |
| G3 Broadcast | Before every broadcast | `go_live` | account_lead + client_approver (2) | 24 h | Audience size per market, excluded counts by reason, local send time per time zone, cost estimate, holdout, variants | No |
| G3b Budget | Broadcast cost goes over the monthly messaging budget | `budget` | strategist + client_finance (2) | 24 h | Current budget, new cost, change % | Never |
| G4 Go live | First activation of flows for a client or market | `go_live` | ops_lead | 24 h | Seed test results per market: delivered, encoding, links, STOP works, sender name shows | No |
| G5 Escalation | Complaint, refund, press, legal, regulator, safety, or a customer asks for a person | `escalation` | account_lead (urgent; client service team in practice) | 1 h | Full chat, AI 3-line summary, order data | Never |
| G6 Report | Weekly report | `report` | strategist or analytics_lead | 24 h | Report draft with the data table | No |
| G7 Optimizer proposals | New test, copy, cap or segment change | `plan` | account_lead | 48 h | Proposal, data that supports it, expected effect | Yes, when there are no proposals |

## What agents can do with no gate

- Send an approved template in an active flow to a contact that the engine resolves as eligible.
- Answer a customer from the approved answer list.
- Process an opt-out (never gated, never delayed).
- Move a send hour inside the allowed window. Pick an A/B winner among approved variants. Pause a variant that breaks a red alert.

## What agents can never do (engine guardrails)

- Send to a contact that `POST /audiences/resolve` did not return.
- Use a new claim, price or offer.
- Reply to a complaint, journalist or regulator.
- Raise the messaging budget.
- Change a frequency cap or a send window.
