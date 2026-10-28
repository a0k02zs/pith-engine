# Community and UGC service (service 18)

This folder holds the Pith M community and UGC service. It covers review requests, review replies, UGC rights, moderation, the community host agent and the weekly report. The markets are UK, EU, North America (US and Canada), GCC and Singapore.

The service builds on the shared engine contracts in `/engine/contracts` (v0.1.0). It does not copy them. The tests read the contracts from the repo, so a change to the engine runs this service's CI too.

## Layout

| Path | What it holds |
|---|---|
| `workflows/` | 10 workflow definitions. Each one validates against `engine/contracts/workflow-definition.json`. |
| `prompts/` | `_preamble.md` and 8 agent prompts (`ref: community/<name>@1`). |
| `schemas/` | The output schema for each agent (`$id: community/<name>@1`). |
| `config/market-rules.json` | Rules per engine market code. GCC markets inherit from `AE`. Other EU countries fall back to `EU_DEFAULT`. |
| `src/rules.ts` | Rule functions: request skips, quiet hours, reply routes, rights gaps, expiry, moderation, AI disclosure. |
| `src/registry.ts` | Loads workflows and prompts, and validates agent output. |
| `docs/` | Playbook, market rules, approvals, KPIs and templates from the design pack. |

## Workflows

| Workflow | Purpose |
|---|---|
| `community.onboard` | Audit a new client and agree the 90-day programme (plan and template gates). |
| `community.review_request` | Ask for a review after an order or visit, with one reminder. |
| `community.review_reply` | Draft a reply. Negative or risky reviews escalate (guardrail G4). |
| `community.ugc_rights` | Weekly: find customer content and ask for rights. Paid rights need contract and payout gates (guardrail G2). |
| `community.ugc_reuse` | Before any service uses customer content: check every grant (G8), moderate, and gate ad use. |
| `community.rights_expiry` | Daily check. Warn 30 days before expiry. Take content down at expiry (G10). |
| `community.moderate` | Label posts and comments. Hide red items, then escalate. |
| `community.host` | The community AI host. It says that it is an AI in its first message. |
| `community.campaign_assets` | Campaign child run: supply rights-cleared customer content for a campaign brief. |
| `community.weekly_report` | Weekly insights. The strategist reviews the report before the client sees it. |

## Run the tests

```bash
cd services/community
npm ci
npm run typecheck
npm test
```

The market rules are a planning summary, not legal advice. A local lawyer must confirm each market before launch.
