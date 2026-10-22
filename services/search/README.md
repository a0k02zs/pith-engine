# Search service (SEO, SEM and GEO)

Service 5 of Pith Marketing, engine code `search`. It builds on the shared engine contracts v0.1.0 in `engine/`.

## What is here

| Folder | What it holds |
|---|---|
| `workflows/` | 10 workflow definitions that the engine runs (onboarding, cluster research, technical fixes, content clusters, GEO monitor, SEM launch and daily optimization, monthly report, content refresh, campaign assets) |
| `prompts/` | 13 agent prompts and the shared preamble |
| `schemas/` | 14 output schemas, one per agent output (`search/<name>@1`) |
| `config/market-rules.json` | Rules for UK, SG, US, CA, the GCC and the EU: locales, engines, ad week, ad categories, compliance rules |
| `src/` | Deterministic rules: SEM spend policy, pause rules and ad checks, GEO metrics, robots.txt and hreflang checks, roadmap order, brief checks, prompt assembly |
| `docs/` | The service design: playbook, templates, prompts, workflows, approvals, KPIs, engine contract notes |
| `vendor/engine-v0.1.0/` | Copies of the engine enums and the workflow-definition schema that the tests use |

## Guardrails the code keeps

- An agent never decides which SEM change is safe. `splitChanges` applies pauses and negatives at once (risk `remove`), applies a budget move only when it stays inside 20% and does not raise the approved total, and sends everything else to the `budget_change` gate (engine G1, G10).
- Every live site change goes through a `go_live` gate for the client developer, with no skip (engine G9).
- Every page gets the subject expert gate. A draft with new claims goes to the claim gate first.
- Campaign assets go live only after `svc.campaigns/market.launched` for the same campaign and market (service-integration item 9).
- A compliance check runs before every external write (engine G6).

## Run the tests

```sh
cd services/search
npm ci
npm run typecheck
npm test
```

## Open points

- The engine tool registry has no `geo` key, so GEO prompt runs use the `seo` tool for now.
- Developer tickets use a `task` step, because the registry has no project-management tool.
