# CRO and landing pages (service 17)

This package is the code for the Pith M CRO service. It runs on the shared engine contracts in `engine/contracts` (v0.1.0).

## What is in it

| Path | Content |
|---|---|
| `src/stats.ts` | A/B test statistics: sample size, SRM check, 2-proportion z-test with confidence intervals. Agents never compute these numbers. |
| `src/decision.ts` | The daily stop check and the end-of-test decision rules (ship, reject, inconclusive, invalid, hold, not_ready). |
| `src/planning.ts` | Priority score (impact x confidence / effort), confidence cap, and a test schedule that avoids sales and holidays. |
| `src/market-rules.ts`, `config/market-rules.json` | Per-market settings and the event calendar for UK, EU, US, Canada, the GCC and Singapore. |
| `src/page-checks.ts` | Checks on a filled page before QA: unfilled slots, lang and dir, consent block, pre-ticked boxes, privacy link, labels, image sizes, urgency text. |
| `src/registry.ts`, `src/prompt.ts` | Load workflows, prompts and output schemas. Build the system prompt for an agent step. |
| `workflows/` | 4 engine workflows: `cro.optimization_test`, `cro.test_monitor`, `cro.landing_page`, `cro.localize`. |
| `prompts/` | The shared preamble and the 11 agent prompts. |
| `schemas/` | The 11 agent output schemas (`cro/<name>@1`). |
| `templates/landing-page-base.html` | The base landing page for templates T1 to T6. |
| `docs/` | The design: playbook, pipeline, prompts, templates, market rules, KPIs, engine interfaces. |

## Run

```
cd services/cro
npm ci
npm run typecheck
npm test
```

## Guardrails that the tests check

1. Every workflow validates against the engine `workflow-definition.json` and uses only shared approval kinds, roles, tools and risks.
2. A compliance check comes before every change to a live site (engine G6).
3. A `go_live` gate with 2 approvers comes right before every change to a live site (engine G9).
4. A test stops with risk `remove`, with no gate first, so traffic returns to the control at once (engine G10).
5. Only copy and creative gates can be skipped. Claim, plan, go-live, winner and escalation gates are never skipped.
6. The service never spends, sends, signs or pays.
