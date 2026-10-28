# Account-based marketing service (service 8)

Pith M account-based marketing (ABM): B2B campaigns for named target accounts, with 1 account list for sales and marketing. It is built on the shared engine contracts v0.1.0 in `engine/`.

## What is here

| Path | What it has |
|---|---|
| `workflows/` | 6 workflow definitions that the engine runs: `abm.account_list`, `abm.intent_daily`, `abm.account_activation`, `abm.play_run`, `abm.sales_handoff`, `abm.weekly_report` |
| `prompts/` | 8 agent prompts plus the shared preamble. Each file has a `ref` and a `model` header. |
| `schemas/` | 8 output schemas (JSON Schema 2020-12), 1 per agent, by `$id` such as `abm/sales_handoff@1` |
| `markets/rules.json` | ABM rules per market (email basis, gift limits, weekends, send windows, languages, play order). The engine `compliance-rules.json` reads it as `service_overlays.abm`. |
| `src/` | Scores (fit, intent, engagement), tier proposal, hand-off check, touch rules, market rules, gift decisions, loaders and the system prompt builder |
| `test/` | Workflow, schema, prompt and rule tests |
| `docs/` | Playbook, approvals (gates G1 to G6), KPIs, market rules, pipeline spec and templates |

## Run

```
npm ci
npm run typecheck
npm test
```

## Rules the tests hold

- Every workflow is valid against the engine `workflow-definition.json` and uses only shared approval kinds, roles, tool names, risk levels and engine actions.
- A budget gate comes before every `spend` step (engine G1). Gate G4 needs the account lead and client finance.
- Recipients come from `engine audiences.resolve` before any `send` step (engine G5).
- A compliance check comes before every `send` or `write_external` step (engine G6).
- Only copy and template gates can skip. Gates G1 (plan), G4 (budget), G5 (hand-off) and G6 (report) never skip.
- A step never waits on 2 alternative paths. Each `needs` list has 1 step at most.
- Hand-off needs intent 70, engagement 40 and 2 engaged people in 14 days. An open opportunity or a pending hand-off blocks it.
- Touch caps: 2 a week per contact in Tier 1, 1 in Tiers 2 and 3. Local weekends, send windows and Ramadan rules apply.

## Open items for the engine thread

- The engine has no action to write the company fields `tier`, `fit_score`, `intent_score` and `engagement_score`. The workflows use `crm company.update_abm_fields` (risk `write_internal`) until an engine action exists.
- The weekly report is published with `engine artifacts.create`.

## Not legal advice

The market rules are a planning summary. A local lawyer confirms each market before launch.
