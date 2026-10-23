# ABM approval points (human gates)

All gates are items in the engine approval inbox (`/approvals`). Roles and kinds use the codes in `engine/contracts/enums.json`. Each item shows the draft, the brand score and the compliance result.

| Gate | What is approved | Approval kind | Required roles | Time limit | Skip rule |
|------|------------------|---------------|----------------|------------|-----------|
| G1 | ICP, account list and tiers | `plan` | `account_lead` and `client_sales` (both) | 72 hours | Monthly tier review with no tier changes |
| G2 | Every Tier 1 asset (email, LinkedIn message, ad, page brief, note card) | `copy` | `account_lead`; add `client_executive` when the executive is the sender | 48 hours | Never skipped. A changed asset needs G2 again |
| G3 | Tier 2 cluster templates and Tier 3 dynamic templates | `template` | `account_lead` | 72 hours | Template already approved and not changed |
| G4 | New ad spend on the account list; gifts over the market limit; any gift to a public-sector or government-linked account | `budget` (gifts in `payload`) | `account_lead` and `client_finance` (both) | 48 hours | No new spend, and all gifts within the limit and private sector |
| G5 | Sales hand-off of a sales-ready account | `handoff` (new kind, requested from the engine) | `client_sales` | 24 hours, then escalate to the client sales head | Never skipped |
| G6 | Weekly report and proposed tier, weight or threshold changes | `report` | `account_lead` | 24 hours | Never skipped |

## What the reviewer sees

- G1: the ICP rules with evidence, the scored list sorted by fit, the proposed tier per account, clusters, and accounts that changed tier.
- G2 and G3: the rendered asset, the brief facts it uses (with sources), the claims and references it uses, brand score, compliance result, market labels.
- G4: platform, currency, current and proposed budget, change in percent; for each gift: item, value, market limit, public-sector flag.
- G5: the sales hand-off brief (`templates/sales-handoff-brief.md`). A return needs a reason. The reason goes back to the scoring model.
- G6: the report and each proposed change with its evidence.

## What agents never do alone (from the plan)

Raise a budget or start new spend; send a gift over the limit; publish a new claim or a named customer reference; reply to a complaint, legal or press question; email a contact with no consent record for their country.
