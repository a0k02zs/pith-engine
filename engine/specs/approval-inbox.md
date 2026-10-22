# Approval inbox — spec v0.1.0

1 queue for client and Pith staff (plan, "Approval inbox"). Each item shows the draft, the brand score and the compliance result.

## 1. Item

Schema: `contracts/schemas/approval-item.json`. An item has a `service` and a `kind`. Kinds are shared across services, so do not prefix them. Content marketing "final copy" is `service=content, kind=copy`.

## 2. Kinds and default reviewers

| Kind | Used for | Default roles (any one, unless `required_count` > 1) | Default SLA |
|------|----------|------|------|
| `plan`, `calendar` | Monthly or quarterly plans, content calendars, roadmaps, test plans | account_lead, strategist, or the service lead | 48 h |
| `copy` | New email, post, page, ad copy | client_approver | 48 h |
| `creative` / `content` | Graphics, ad creative, creator posts before posting | creative_lead, client_approver | 48 h |
| `script` | Video scripts | creative_lead + client_approver (`required_count` 2) | 48 h |
| `shortlist` | Creator, partner or account lists | influencer_lead / account_lead + client_approver | 72 h |
| `contract` | Creator, partner, talent contracts | influencer_lead + client_legal or client_approver | 72 h |
| `budget` | New budget or new paid spend | strategist + client_finance or client_approver (2) | 24 h |
| `budget_change` | Change over 20% or outside caps | performance_marketer or strategist | 8 h |
| `payout` | Creator and affiliate payouts | client_finance | 72 h |
| `claim` | New product claim, price, health, finance or legal statement | client_legal or client_approver | 72 h |
| `go_live` | CRM go-live, launch check | ops_lead / strategist | 24 h |
| `report` | Weekly report before the client sees it | strategist / analytics_lead | 24 h |
| `escalation` | Complaints, press, legal, crisis | account_lead; pr_lead for reason press or crisis (urgent) | 1 h |
| `data_change` | List imports over 500 rows or from third parties, fuzzy merges, data subject requests, bulk suppression | ops_lead | 72 h |
| `handoff` | Sales accepts a sales-ready ABM account (creates a CRM opportunity) | client_sales | 48 h |
| `template` | WhatsApp and SMS templates | client_approver | 48 h |
| `design` | Brand identity, guidelines, brand profile version | client_executive | 5 days |
| `test_winner` | Ship the winner of an A/B test (CRO) | cro_lead | 24 h |

## 3. Roles

Roles are in `contracts/enums.json`. Pith roles have no prefix (`content_lead`). Client roles start with `client_`. Extra roles added in v0.1.0 at service requests: `native_editor`, `client_marketing_lead`, `external_contact` (a named outside person, such as a customer who signs a case study release; they get a one-time link and their decision carries a signed document in `edits.evidence_ref`).

## 4. Skip rules

A gate can skip when `gate.skip_if` is true. The engine only allows skip rules for `copy`, `creative`, `content` and `template` kinds, plus one rule for `data_change` (a first-party import of 500 rows or fewer). Every skip is logged. The standard rule (plan, service 1): a repeat send with a reused, already-approved template and no new claims skips the copy gate. Budget, contract, payout, claim and escalation gates can never be skipped.

## 5. Notifications and SLAs

- New item: portal badge plus a Slack message to the assignees (or everyone with the role for the client).
- At the SLA: `engine/approval.overdue` and a message to the account lead.
- Urgent items (escalations) also go to the account lead's phone.
- Bulk actions: a reviewer can approve many items of the same kind in one action. Each item still gets its own decision row.

## 6. Decisions

`approved`, `rejected` or `changes_requested`. Changes requested carries a comment and optional inline `edits`; the run returns to `gate.on_changes`. Only users can decide; service tokens get HTTP 403.
