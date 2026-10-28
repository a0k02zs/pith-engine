# crm_ops: marketing automation and CRM operations (service 9)

Code for the Pith M CRM operations service, built on engine contracts v0.1.0 (`engine/`). Design docs: `docs/` (copied from the service design pack).

## What is here

| Path | What it is |
|---|---|
| `src/score.ts` | B2B lead score from `config/lead-scoring.json`: fit (0 to 50, exclusive groups, disqualify rules), engagement (0 to 50, caps per 30 days, 25% decay per 30 days, hard-bounce reset), grades A to D, account roll-up, monthly tuning advice. |
| `src/routing.ts` | Business time per market (local working week, working hours, holidays, time zones), SLA timers (hot 5/15/60 minutes, warm 4/8/16 business hours) and routing in rule order: account owner, ABM tier 1, Quebec, GCC, enterprise, regional round-robin. |
| `src/lifecycle.ts` | Recycle rules by rejection reason (W8), stage moves, conversion kinds, B2C RFM segments, data quality score, import gate skip rule. |
| `src/markets.ts` | Market overlay (`config/market-overlay.json`): inheritance, Quebec subdivision, EU default, follow-up language, DSR deadline, Saudi data transfer check. |
| `src/tools.ts` | Actions of the service-local tool `crm_ops` (`score.calculate`, `score_model.publish_version`). |
| `src/registry.ts`, `src/prompt.ts` | Workflow, prompt and output schema loading; system prompt build. |
| `workflows/` | 11 workflow definitions (engine `workflow-definition.json`). |
| `prompts/`, `schemas/` | 12 agent prompts and 11 output schemas. |
| `config/` | Score model, market overlay, CRM field list (HubSpot and Salesforce names). |
| `vendor/engine-v0.1.0/` | Copies of the engine enums and workflow schema that the tests check against. |

## Run

```
npm ci
npm run typecheck
npm test
```

## Contract notes

- Tool names: `enrichment` replaces Clay; internal alerts use the CRM owner notification (`crm` `owner.notify`) and the daily digest is an engine report artifact, because `slack` is not in the engine tool registry. `crm_ops` is a service-local tool (pure functions in this package); it needs an entry in the engine `tool_registry`.
- The after-hours auto-reply in `crm_ops.sla_watch` now gets its recipient from `audiences.resolve` (G5) and passes a compliance check (G6). It is the only `send` step in the service. Nurture emails go through `email.nurture_flow`.
- Consent mirror, suppression and DSR execution use risk `remove` (G10).
- Code defaults not fixed in the design: working hours 09:00 to 17:00 local, and a hand-raise counts for grade A for 90 days. Both are confirmed per client at gate G1.
