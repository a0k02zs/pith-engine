# Brand strategy and design service (service 13)

This service builds the client brain. The client brain is the engine `brand-profile.json`. Every other service reads it. Package A (brand-to-brain) runs for every new client.

The service builds on the shared engine contracts in `../../engine/contracts`. It reads those files directly. It does not keep a copy.

## Contents

| Path | What it holds |
|---|---|
| `docs/` | The playbook, the 18-stage pipeline, agent prompts, templates, market rules, KPIs and engine interfaces. |
| `workflows/` | 4 workflow definitions: `brand.build`, `brand.research`, `brand.market_adaptation` and `brand.monitor`. Each one validates against the engine `workflow-definition.json`. |
| `prompts/` | 16 agent prompts and a shared preamble. Each file has a `ref` and a `model` in its frontmatter. |
| `schemas/` | 15 output schemas, with ids `brand/<name>@1`. Each agent step names one of them. |
| `examples/` | An example client brain (Ledgerly) that is valid against the engine schema. |
| `src/` | The service code. |
| `test/` | Vitest tests. |

## Code

- `registry.ts` loads workflows, prompts and schemas, and validates agent outputs.
- `packages.ts` holds the 18 stages and the stages that each package (A, B, C) runs.
- `compile.ts` turns the brain bundle from the brain compiler agent into a draft brand profile. It forces status `draft`. Only the go-live gate (approval kind `design`) approves a profile.
- `scorer.ts` holds the brand-score rubric. The engine owns `POST /artifacts/{id}/brand-score`. This service owns the weights and the calibration rule (18 of 20 samples on each side).
- `guardrails.ts` blocks trademark clearance language, personal names in interview quotes and AI-only final logos.
- `drift.ts` finds brand drift: a monthly average under 70 for 2 months in a row.
- `prompt.ts` builds the system prompt for an agent from the preamble and the client context.

## Rules the code enforces

1. An agent never approves a brand profile or a claim.
2. A claim is approved only with an `approval_id` from a `claim` gate.
3. Every banned term has a reason.
4. Every brain chunk has 200 to 400 words.
5. The name screen always says "Linguistic screen only. Not a trademark search."
6. Every adapted locale needs a native review.
7. No workflow tool step sends, spends, signs or pays.

## Run

```sh
npm ci
npm run typecheck
npm test
```
