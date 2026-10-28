# Email marketing service (service 1)

Pith M email marketing: lifecycle flows, campaigns, newsletters and B2B outbound, built on the shared engine contracts v0.1.0.
Approved by the project owner on 22 Oct 2026 (strategy, flows, templates, prompts, workflows, gates, KPIs, market rules).

## What is here

| Path | What it has |
|---|---|
| `workflows/` | 9 workflow definitions that the engine runs (`email.audience_sync`, `email.consent_change`, `email.flow_build`, `email.monthly_calendar`, `email.campaign_send`, `email.deliverability_monitor`, `email.outbound_sequence`, `email.reply_triage`, `email.weekly_report`) |
| `prompts/` | 12 agent prompts plus the shared preamble. Each file has a `ref` and a `model` header. |
| `schemas/` | 11 output schemas (JSON Schema 2020-12), 1 per agent output, by `$id` such as `email/drafts@1` |
| `config/market-rules.json` | Email rules per market. The engine `compliance-rules.json` links to it as the email channel overlay. |
| `src/` | Loaders, the system prompt builder and the rule functions (consent re-check, footers, `<ADV>` subjects, work days, send times, frequency cap, deliverability levels, A/B winner, reply routing, sunset) |
| `test/` | Workflow, schema and rule tests |
| `vendor/engine-v0.1.0/` | The engine files the tests check against |
| `docs/` | The approved playbook, market rules, flow library, approvals and KPIs, agent prompts and copy templates |

## Run

```
npm ci
npm run typecheck
npm test
```

## Rules the tests hold

- Every workflow is valid against the engine `workflow-definition.json` v0.1.0 and uses only shared approval kinds, roles, tool names and risk levels.
- Recipients come from `engine audiences.resolve` before any `send` step (engine G5).
- A compliance check comes before every `send` or `write_external` step (engine G6).
- Suppression, pause and stop-contact use risk `remove`, so an opt-out is never blocked (engine G10).
- Only a reused template with no new claims can skip the copy gate. Escalation gates never skip.
- Complaints, legal, press and regulator replies escalate and get no automatic reply (engine G4).

## Not legal advice

The market rules are a planning summary. A local lawyer confirms each market before the first send.
