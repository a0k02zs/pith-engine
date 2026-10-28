# Influencer marketing service (service 6)

Pith M influencer marketing: plan, discover and vet creators, outreach, contract, brief, content review, live checks, payout, weekly report and paid amplification. Built on the shared engine contracts v0.1.0 in `engine/`.

## What is here

| Path | What it has |
|---|---|
| `workflows/` | 5 workflow definitions that the engine runs: `influencer.plan` (stages 1 to 4), `influencer.recruit` (5 and 6), `influencer.deliver` (7 to 9), `influencer.payout` (10), `influencer.weekly` (11) |
| `prompts/` | 10 agent prompts plus the shared preamble. Each file has a `ref` and a `model` header. |
| `schemas/` | 10 output schemas (JSON Schema 2020-12), 1 per agent output, by `$id` such as `influencer/creator_vetting@1` |
| `config/market-rules.json` | Influencer overlay on `engine/specs/compliance-rules.json`: extra and gift labels, weak tags, creator licences, restricted categories, outreach notices, tax forms |
| `src/` | Loaders, the system prompt builder and the rule functions (disclosure check, hard stops, fit score, fee range, outreach timing, payout blockers, business days, KPIs, code leak, UTM link) |
| `test/` | Workflow, schema and rule tests |
| `docs/` | Playbook, pipeline, market rules, KPIs, templates and the service data model |

The tests read the engine contracts from `../../engine`, so a change to the engine runs these tests too.

## Run

```
npm ci
npm run typecheck
npm test
```

## Rules the tests hold

- Every workflow is valid against the engine `workflow-definition.json` and uses only shared approval kinds, roles, tool names and risk levels.
- The creator is resolved with `engine audiences.resolve` (party ids) before any `send` step (engine G5).
- A compliance check comes before every `send` or `write_external` step (engine G6).
- `sign` comes only after a `contract` gate and `pay` only after a `payout` gate (engine G2). No step in this service spends money.
- A creator's "no" stops contact with risk `remove`, so it is never blocked (engine G10).
- The plan, shortlist, contract and content gates need the influencer lead and the client. Payout needs client finance. No gate here can be skipped.
- The creator licence (AE, SA) and the deal terms are checked before the contract gate.
- Paid amplification goes to `paid_social.creator_amplify` only after a `budget` gate, with the budget approval id.
- Every engine disclosure label is accepted, except where a stricter market rule narrows it: Germany treats a bare `#ad` as a weak tag, and France accepts only "Publicité" or "Collaboration commerciale" (engine rule `FR-INFLUENCER-LAW`).

## Pending in the engine

Two steps call engine actions that `enums.json` does not list yet. The API already has the endpoints. The tests allow only these 2.

| Action | Step | API endpoint |
|---|---|---|
| `parties.upsert` | `influencer.plan` `save_parties` | `POST /parties` |
| `rights.create` | `influencer.recruit` `record_rights` | `POST /clients/{id}/rights` |

## Not legal advice

The market rules are a planning summary. A local lawyer confirms each market before the first campaign. Qatar, Kuwait, Bahrain and Oman creator licence rules need a local check.
