# Multi-channel campaigns service (service 2)

Pith M campaigns: plans one campaign across channels and markets, hands each channel service its brief, turns on spend after the go-live gate, moves budget each day inside fixed limits, and writes the final report and lessons. Built on the shared engine contracts v0.1.0.

This service orchestrates the channel services. It never sends or publishes itself. Each channel service builds and publishes its own assets through `<service>.campaign_assets`, and publishes only after `svc.campaigns/market.launched` for that market.

## What is here

| Path | What it has |
|---|---|
| `workflows/` | 3 workflow definitions: `campaigns.launch` (brief to final report), `campaigns.optimize_daily` (daily budget moves with the G5 gate), `campaigns.crisis` (pause first, then the G6 gate) |
| `prompts/` | 8 agent prompts plus the shared preamble. Each file has a `ref` and a `model` header. |
| `schemas/` | 8 output schemas (JSON Schema 2020-12), by `$id` such as `campaigns/concepts@1` |
| `config/playbook.json` | Campaign types and default channel splits, budget rules, optimizer limits, rollout and flight phases |
| `config/markets.json` | Campaign rules per market group: weekends, currencies, Ramadan launch block, lead countries |
| `src/` | Loaders, the system prompt builder and the rule functions (budget plan check, move class, auto-pause, fatigue, off-pace, flight phases, next market, lead countries, launch dates, UTM links) |
| `test/` | Workflow, schema and rule tests |
| `vendor/engine-v0.1.0/` | The engine files the tests check against |
| `docs/` | The playbook, approvals, KPIs, market rules, engine integration notes and templates |

## Run

```
npm ci
npm run typecheck
npm test
```

## Rules the tests hold

- Every workflow is valid against the engine `workflow-definition.json` v0.1.0 and uses only shared approval kinds, roles, tool names, risk levels and engine actions.
- Every `spend` step has a `budget` or `budget_change` gate before it, except the daily within-policy move (engine G1).
- Spend policies are written after the G2b budget gate and before any spend.
- Spend turns on per ad platform only after the G4 go-live gate and the launch compliance check.
- Only optimizer moves outside the limits go to the G5 `budget_change` gate.
- The crisis flow pauses first with risk `remove`, so it is never blocked (engine G10), and resumes only after the G6 escalation gate.
- No workflow has a `send` or `write_external` step. Channel services do that, behind their own gates.

## Open item for the engine

`engine spend_policies.upsert` is not in engine v0.1.0 `engine_actions` yet. The tests list it as pending. When the engine adds it (or names another action), update `PENDING_ENGINE_ACTIONS` in `test/workflows.test.ts`.

## Not legal advice

The market rules are a planning summary. A local lawyer confirms each market before the first launch.
