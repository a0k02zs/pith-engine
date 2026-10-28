# Events and webinars service (service 16)

Pith M events and webinars: webinars, virtual events and trade shows, built on the shared engine contracts v0.1.0.
The design is in `docs/` (playbook, pipelines, agent prompts, templates, market rules, KPIs, engine interfaces).

## What is here

| Path | What it has |
|---|---|
| `workflows/` | 3 workflow definitions that the engine runs: `events.webinar` (49 steps), `events.trade_show` (29 steps) and `events.campaign_assets` (the assets a campaign asks for) |
| `prompts/` | 11 agent prompts plus the shared preamble. Each file has a `ref` and a `model` header. |
| `schemas/` | 11 output schemas (JSON Schema 2020-12), 1 per agent output, by `$id` such as `events/follow_up@1` |
| `config/market-rules.json` | Events rules per market: time zone, weekend, session slots, best days, booth consent, co-host sharing, SMS basis |
| `src/` | Loaders, the system prompt builder and the rule functions (session times, pacing, engagement score and segments, follow-up send time, business-hours hand-off, the template skip rule, booth and SMS consent, CASL expiry, live Q&A routing) |
| `test/` | Workflow, schema, prompt and rule tests |
| `vendor/engine-v0.1.0/` | The engine files the tests check against |
| `docs/` | The design documents |

## Run

```
npm ci
npm run typecheck
npm test
```

## Rules the tests hold

- Every workflow is valid against the engine `workflow-definition.json` v0.1.0. It uses only shared approval kinds, roles, tools, engine actions and risk levels.
- Recipients come from `engine audiences.resolve` before any `send` step (engine G5).
- A compliance check comes before every `send` or `write_external` step (engine G6).
- A `sign` step comes only after a contract gate, and paid items go through a budget gate for the account lead and client finance (engine G1, G2).
- Follow-up templates are approved at go-live, before the event. The follow-up skips its template gate only when the template was approved, only merge fields changed and there are no new claims.
- Hot leads go to client sales through a shortlist gate: 4 business hours after a webinar, 8 after a trade show.
- The first follow-up goes out within 24 hours of the event end, in local business hours when possible. GCC weekends differ by country.
- Engagement scores and segments are code, not model output. An ABM target account is always fit A.
- Complaint, press, legal and abuse questions in live Q&A always escalate (engine G4).
- A badge scan is never consent in a market that asks the consent question at the booth.
- Campaign registration pages publish only after `svc.campaigns/market.launched`.

## Notes

- `template_approved` and `only_merge_fields_changed` in `events/follow_up@1` are set by the service code from the approval record and `onlyMergeFieldsChanged()`, not by the model.
- The subflow ids of other services (`email.campaign_send`, `social.post_set`, `abm.invite_sequence`, `abm.account_list`, `paid_social.boost`, `video.clip_set`, `content.repurpose`) are expected names until each service confirms them.
- The market rules are a planning summary, not legal advice. A local lawyer confirms each market before launch.
