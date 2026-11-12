# pith-engine

The code for Pith Marketing: 18 marketing services that run as agent workflows on 1 shared engine, and the Command Centre web app that operates them.

## Layout

| Path | What it holds |
|------|---------------|
| `engine/` | The shared engine contracts (v0.1.1): `contracts/` (enums, JSON Schemas, OpenAPI), `specs/` (workflow, approval inbox, compliance, service integration), `db/` (SQL) and `scripts/`. The engine runtime is not built yet. |
| `services/<name>/` | 1 folder for each service: workflows (`workflows/*.json`), prompts, schemas, rules code and tests. |
| `apps/command-centre/` | The operations web app (React UI and Hono API). It runs on test data. Live at https://pithaimarketing.vercel.app. |
| `packages/` | The 120 sellable packages (5 regions x 8 industries x 3 tiers). Prices are indicative. |

## Services

| No. | Service | Folder | No. | Service | Folder |
|-----|---------|--------|-----|---------|--------|
| 1 | Email marketing | `email` | 10 | SMS, WhatsApp and push | `messaging` |
| 2 | Multi-channel campaigns | `campaigns` | 11 | Performance and paid social | `paid-social` |
| 3 | Video production | `video` | 12 | Analytics and attribution | `analytics` |
| 4 | Social media | `social` | 13 | Brand strategy and design | `brand` |
| 5 | SEO, SEM and GEO | `search` | 14 | PR and thought leadership | `pr-thought-leadership` |
| 6 | Influencer marketing | `influencer` | 15 | Affiliate and partner | `affiliate` |
| 7 | Content marketing | `content` | 16 | Events and webinars | `events` |
| 8 | Account-based marketing | `abm` | 17 | CRO and landing pages | `cro` |
| 9 | Marketing automation and CRM ops | `crm_ops` | 18 | Community and UGC | `community` |

## Checks

Run these from the repo root before you open a pull request. CI runs the same checks.

```bash
python3 engine/scripts/validate_contracts.py     # contracts and every workflow match the JSON Schemas
node engine/scripts/lint_workflows.mjs           # references resolve and the guardrails hold in all services
node engine/scripts/sync_vendor.mjs --check      # each service has the current copy of the engine contracts
```

For 1 service or the app:

```bash
cd services/email        # or apps/command-centre
npm ci
npm run typecheck
npm test
```

## Rules for a change

1. A workflow is data. Write it in `services/<name>/workflows/` and follow `engine/specs/workflow.md`.
2. When you change `engine/contracts/`, add a line to `engine/CHANGELOG.md` and run `node engine/scripts/sync_vendor.mjs`.
3. A service that takes campaign budget must have `<service>.campaign_assets`. Steps that publish or send after launch go in `<service>.campaign_go_live` (see `engine/specs/service-integration.md`, item 9).
4. Do not put secrets in the repo. Server keys go in the host's environment settings.
