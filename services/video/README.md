# Video production service (service 3)

Code for the Pith M video production service. It builds on the shared engine contracts in `../../engine/`
and reads them from the repo, so a contract change runs these tests too.

| Folder | What it holds |
|---|---|
| `workflows/` | 4 engine workflow definitions: `video.job`, `video.variant_refresh`, `video.weekly_learn`, `video.campaign_assets` |
| `prompts/` | Shared preamble and 10 agent prompts (`video/<agent>@1`) |
| `schemas/` | 12 output schemas (`video/<name>@1`), 10 for agents and 2 for human task results |
| `config/market-rules.json` | Labels, languages, consent and review rules per market (UK, SG, US, CA and CA-QC, GCC, EU) |
| `src/` | Loaders (`registry.ts`, `prompt.ts`, `market-rules.ts`) and pure rule functions (`rules.ts`) |
| `test/` | Workflow, schema and rule tests |
| `docs/` | The service design: playbook, pipeline, prompts, templates, market rules, KPIs, engine interfaces |

## How a job runs

`video.job` starts on `svc.video/brief.submitted`. Agents check the brief, write 5 hooks per ad and the scripts.
The creative lead and the client approve the script (G1). The planner picks track A (AI-made), B (creator UGC)
or C (filmed shoot). A budget gate (G2) and a contract gate (G3a) open only when the plan needs them. Rights are
looked up first with `engine rights.check`; releases are collected only for missing grants, and a compliance
check (engine guardrail G8) runs before any production. After edit, localization, native review, export and QC,
the editor approves every job (G4). The client also approves hero, testimonial and new-template jobs. The files
are stored, registered as engine artifacts, and handed to social and paid with `svc.video/asset.delivered`.

Video never sends, spends or pays. Social and paid publish the exports. For campaigns, `video.campaign_assets`
runs the full job as a subflow, and the channels publish only after `svc.campaigns/market.launched`.

## Rule functions (`src/rules.ts`)

- `chooseTrack`, `needsSpendGate`: the playbook track rule and the G2 trigger.
- `rightsGaps`, `grantActive`: the scopes that no active rights grant covers, per person and market.
- `requiredLabels`, `missingLabels`, `needsFrenchMaster`, `needsNativeReview`: market labels and language rules.
- `spokenSeconds`, `overlongRows`, `captionProblems`, `captionDriftOk`, `loudnessOk`, `exportFileName`: script and QC checks.
- `hookRate`, `holdRate`, `completionRate`, `costPerFinishedVideo`, `fatigued`, `rankable`, `workingDaysBetween`,
  `deliveryOnTime`, `takedownOverdue`: KPI math from `docs/06-kpis.md`.

## Run

```
npm ci
npm run typecheck
npm test
```

The market rules are a planning summary, not legal advice. A local lawyer confirms each market before launch.
