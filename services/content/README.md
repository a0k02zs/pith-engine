# @pith/content — content marketing service (service 7)

Blogs, whitepapers, ebooks and case studies for Pith M clients in the UK, Singapore, North America, the GCC and the EU.
It builds against the shared engine contracts v0.1.0 (service code `content`).

## What is here

| Path | What it is |
|---|---|
| `workflows/` | `content.plan`, `content.piece`, `content.refresh` as engine workflow definitions |
| `prompts/` | 7 agent prompts (`content/<agent>@1`) and the shared preamble |
| `schemas/` | JSON Schemas for each agent output and human task output (`content/<name>@1`) |
| `config/market-rules.json` | Content rules for each market (language, currency, weekend, sensitive topics, AI labels) |
| `src/` | Registry (load workflows, prompts, schemas; validate agent output), market rules, prompt builder, rule functions |
| `test/` | Workflow, schema and rule tests |
| `docs/` | Playbook, market rules, templates, agent prompt notes, engine integration |
| `vendor/engine-v0.1.0/` | Copy of the engine workflow schema and enums that the tests check against. Replace with the engine package when it is in this repo. |

## Run

```bash
cd services/content
npm install
npm test          # 44 tests
npm run typecheck
```

## Rules the tests hold

- Every workflow validates against the engine schema, and every prompt and schema it names exists.
- Gates use only shared approval kinds and roles. Only copy-type gates may skip.
- A compliance check runs right before publish. The claim gate comes before the copy gate. Final copy needs the editor and the subject expert.
- A case study is published only after the customer release and a `case_study_release` rights grant.

Market rules are a planning summary, not legal advice. A local lawyer confirms each market before launch.
