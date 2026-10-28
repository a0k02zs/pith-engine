# Service 11: Performance and paid social

Always-on paid ads on Meta, LinkedIn, TikTok and Snapchat for B2B and B2C clients in the UK, Singapore, the US and Canada, the GCC and the EU. Built against engine contracts 0.1.0 (`engine/contracts`, `engine/specs`).

## What is here

| Path | What it holds |
|---|---|
| `docs/` | Playbook, market rules, approvals and guardrails, KPIs, templates (from the design pack) |
| `config/market-rules.json` | Rules per market as data: platforms, currency, weekend, consent, special ad categories, creator licences, engine compliance rule ids |
| `prompts/` | Shared preamble and 8 agent prompts (`paid_social/<name>@1`) |
| `schemas/` | 8 output schemas, 1 per agent (`paid_social/<name>@1`) |
| `workflows/` | 22 workflow definitions. 6 are written by hand; 16 come from `workflows/templates/` |
| `src/` | Rule code: targets, guardrails, test statistics, naming, KPI events, rights, market rules, registry and prompt builder |
| `test/` | Workflow, schema and rule tests |

## Commands

```sh
npm ci
npm run typecheck
npm test
npm run generate   # after a change in workflows/templates/
```

## Workflows

The engine registry has 1 tool per ad platform (`ads_meta`, `ads_linkedin`, `ads_tiktok`, `ads_snapchat`). So the workflows that act on 1 platform are templates, and `npm run generate` writes 1 file per platform. A test fails when a generated file is out of date.

| Workflow | Trigger | Gates |
|---|---|---|
| `paid_social.onboard` | `svc.paid_social/client.onboarded` | `budget` (client finance and performance marketer), `go_live` |
| `paid_social.monthly_plan` | 25th of the month, 09:00 | `budget` (client finance and performance marketer) |
| `paid_social.creative_test_<platform>` | Tuesday 09:00, manual | `creative` (may skip for a reused approved ad), `claim` (only when a variant has a new claim), `go_live` |
| `paid_social.daily_optimize_<platform>` | Daily 07:00 | `budget_change` for moves over 20% or a higher total |
| `paid_social.creative_refresh` → `_<platform>` | `svc.paid_social/creative.fatigued` | `creative` (may skip for a reused approved ad) |
| `paid_social.creator_amplify` → `creator_launch_<platform>` | Subflow from the influencer service | `budget`, `go_live` |
| `paid_social.weekly_report` | Monday 06:00 | `report` |
| `paid_social.rights_pause` | `engine/rights.changed` | none (pauses use risk `remove`) |

Spend steps without a gate in the same run: `creative_test_*.launch` (fixed test budget from the approved plan) and `daily_optimize_*.apply_small` (moves of 20% or less inside the total). Both rely on the client's `spend_policies` row (engine guardrail G1).

## Rule code

- `targets.ts`: target CPA = AOV × margin ÷ 1.5; break-even ROAS = 1 ÷ margin; target ROAS = 1.3 × break-even; cost per SQL = deal value × SQL-to-won rate × 0.2; daily cap = monthly ÷ days × 1.3; pacing 95% to 105%.
- `guardrails.ts`: classify budget moves (over 20% per campaign per day, or a higher total, needs a person); CPA auto-pause (1.5 × target for 3 days, spend ≥ 2 × target CPA); kill rule (0 conversions after 3 × target CPA); spend spike (1.3 × plan); silent tracking; fatigue (2 of 3 signals).
- `stats.ts`: P(variant beats control) with a Beta-Binomial model and a Beta(1,1) prior, as an exact sum, and the test verdict rules.
- `naming.ts`: campaign, ad set and ad names.
- `metrics.ts`: `engine/metric.recorded` payloads; the test checks them against `metric-event.json`.
- `rights.ts`: which ad type the rights grants allow, the latest end date (2 days before the earliest expiry), and which live ads to pause.

## Changes from the design pack v0.2

1. Tool names follow `enums.tool_registry`: `ads_<platform>`, `analytics` and `engine` (the pack used placeholders).
2. Only copy, creative, content and template gates may skip (`engine/specs/approval-inbox.md` §4). So the `go_live` gate never skips, the `claim` gate is reached by a branch only when a variant has a new claim, and the creator ad `budget` gate runs in every creator ad run.
3. `paid_social.creator_amplify` now needs `platform` in its input.
4. The test statistics use an exact sum, not 10,000 samples.

## Open items

- The engine has no tool for service code. The steps `engine` `paid_social.guardrails`, `paid_social.classify_moves`, `paid_social.check_creator_plan` and `paid_social.ads_by_grant` call the code in `src/` and need an engine runner for it.
- A per-platform workflow should run only for clients with an account on that platform. The engine needs a way to enable a workflow per client.
- X (Saudi Arabia and Kuwait) has no tool in the registry yet.
- A local lawyer confirms each market's rules before launch.
