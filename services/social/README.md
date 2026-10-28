# Organic social media service (service 4)

Pith M organic social: listening, a monthly content calendar, posts, the community inbox, escalation and weekly learning. It is built on the shared engine contracts v0.1.0. Paid social and boosting are service 11 and are not here.

Status: draft. The design pack is at `docs/`. The project owner has not yet confirmed the packages (Starter, Growth, Scale) or the starting KPI targets.

## What is here

| Path | What it has |
|---|---|
| `workflows/` | 8 workflow definitions that the engine runs (`social.onboard`, `social.listen_daily`, `social.plan_monthly`, `social.create_post`, `social.reactive_post`, `social.engage_inbox`, `social.escalate`, `social.weekly_report`) |
| `prompts/` | 10 agent prompts plus the shared preamble. Each file has a `ref` and a `model` header. |
| `schemas/` | 10 output schemas (JSON Schema 2020-12), 1 per agent output, by `$id` such as `social/post@1` |
| `config/market-rules.json` | Social rules per market: platforms, paid post labels, work days, no-post windows, native editor languages, caption limits, hashtag ranges |
| `src/` | Loaders, the system prompt builder and the rule functions (post checks, schedule checks, final decision, calendar checks, inbox routing, crisis actions, KPIs) |
| `test/` | Workflow, schema and rule tests |
| `vendor/engine-v0.1.0/` | The engine files the tests check against |
| `docs/` | The design pack: playbook, market rules, agents, approvals and KPIs, crisis protocol, templates |

## Run

```
npm ci
npm run typecheck
npm test
```

## How the design maps to the engine

- Autonomy levels 1, 2 and 3 in the design are the brand profile values `draft_only`, `approved_answers` and `auto_publish_approved_calendar`.
- Tool names: posts, the inbox, listening and platform metrics use `social`. Graphics use `canva`. The crisis pause is `engine client.pause_scheduled`. Learnings use `engine learnings.write`.
- The `check` step in `social.create_post` runs `postProblems`, the engine compliance check and `finalDecision`. Its `decision` is `publish`, `retry`, `gate_b` or `block`.
- Public replies use risk `write_external`, so a compliance check runs before each one.

## Rules the tests hold

- Every workflow is valid against the engine `workflow-definition.json` v0.1.0 and uses only shared approval kinds, roles, tool names, engine actions and risk levels.
- A compliance check comes before every `send` or `write_external` step (engine G6).
- A post with a new claim goes to the `claim` gate, which never skips (engine G3).
- Complaints, press, legal, safety and crisis items escalate, and the agent never replies to them (engine G4). The code holds this whatever the model proposes.
- The crisis pause and spam hiding use risk `remove`, so they are never blocked (engine G10).
- Only a clean post at `auto_publish_approved_calendar`, with no new claims, skips Gate B. Reactive posts and escalations never skip a gate.
- No step spends, signs or pays.

## Not legal advice

The market rules are a planning summary. A local lawyer confirms each market before launch.
