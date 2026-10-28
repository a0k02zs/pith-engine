# @pith/affiliate · Service 15 · Affiliate and partner marketing

This package is the code for the Pith M affiliate and partner marketing service. It builds on the
shared engine contracts in `engine/contracts/` (v0.1.0) and does not copy them.

## What is in this folder

| Path | What it holds |
|---|---|
| `workflows/` | 5 workflow definitions: programme launch, partner recruitment, daily activation, monthly payout, compliance and report. Each one is valid against `engine/contracts/workflow-definition.json`. |
| `prompts/` | The shared preamble and the system prompts for 11 agents. |
| `schemas/` | The output schema for each agent (`affiliate/<name>@1`). |
| `config/programme-rules.json` | Commission ranges, scorecard weights, fraud thresholds, the activation plan and payout rules. |
| `config/market-rules.json` | Disclosure labels, licences, tax forms and VAT for UK, Singapore, US, Canada, GCC and EU markets. |
| `src/` | Rule functions: commission economics, partner scoring, fraud checks, activation and tiers, payout files, disclosure checks, deal registration, and the registry that loads workflows, prompts and schemas. |
| `docs/` | The design pack: playbook, pipeline, templates, market rules, KPIs and engine interfaces. |
| `test/` | Tests for the workflows against the live engine contracts, the rule functions, the schemas and the prompts. |

## Rules that the code keeps

- Agents explain and copy the results of the rule functions. They never change a fraud decision or a payout amount.
- Every `pay` step has a `payout` approval gate before it (guardrail G2).
- Every `send` and `write_external` step has a compliance check before it (guardrail G6).
- Recipients come from the engine `audiences/resolve` API (guardrail G5).
- The service has no `spend` step and no `sign` step.

## Run the checks

```bash
cd services/affiliate
npm ci
npm run typecheck
npm test
```

CI runs the same steps in `.github/workflows/affiliate.yml`.

## Status

- Version 0.1.0. The workflows are definitions. The engine runtime runs them.
- The market rules are a planning summary, not legal advice. A local lawyer confirms each market before launch.
- The commission ranges are planning ranges from common practice, not measured data.
