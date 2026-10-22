# Content marketing — engine integration

Engine contracts: v0.1.0 (`/mnt/project-files/engine/`). Checked on 2026-10-21 against `specs/service-integration.md`, `specs/workflow.md`, `specs/approval-inbox.md`, `contracts/enums.json` and `contracts/schemas/workflow-definition.json`.

## Codes this service uses

| Item | Value |
|---|---|
| Service code | `content` (service 7) |
| Workflows | `content.plan`, `content.piece`, `content.refresh` (files in `workflows/`, valid against `workflow-definition.json`) |
| Artifact kinds | `blog`, `whitepaper`, `ebook`, `case_study`, `brief`, `plan` |
| Channel | `web_page` (gated forms: `landing_page`) |
| Brain fields read | `voice`, `personas`, `products`, `approved_claims`, `banned_terms`, `required_disclaimers`, `sensitive_topics`, `competitors`, `locales`, `past_results` |
| Experts | `parties` with `kind=expert` |
| Brand score | `POST /artifacts/{id}/brand-score`, range 0 to 100; workflows use `min_brand_score: 80` |

## Approval gates (all `service=content`)

| Gate | Kind | Roles |
|---|---|---|
| Approve plan | `plan` | `content_lead` + `client_marketing_lead` (2) |
| New claim | `claim` | `client_approver` or `client_legal` |
| Final copy | `copy` | `editor` + `subject_expert` (2) |
| Case study release | `copy` | `external_contact` (signed document in `edits.evidence_ref`) |
| Refresh list | `plan` | `content_lead` |

## Events

Service events: `svc.content/plan.approved`, `svc.content/piece.requested`, `svc.content/asset.published`, `svc.content/asset.ready`, `svc.content/refresh.due`, `svc.content/refresh.flagged`.
Engine events: `engine/outbound.recorded` (type `posted` on publish), `engine/metric.recorded`.

| Event | Who listens |
|---|---|
| `svc.content/asset.ready` | Email (1), Social (4), Video (3), ABM (8) |
| `svc.content/asset.published` | Search (5), Analytics (12) |

## KPIs

Shared: `organic_sessions_nonbrand`, `conversions`, `leads`, `ai_citation_share`, `pipeline_value`, `win_rate`.
Service-only: `content.downloads`, `content.signups`, `content.sales_sends`, `content.cost_per_piece`, `content.cycle_days`, `content.factcheck_fail_rate`, `content.pieces_published`.

## Guardrails that apply

- G3: a claim not in `approved_claims` blocks at the compliance check until the `claim` gate approves it.
- G6: `publish` (risk `write_external`) has a compliance check before it.
- G9 does not apply to a new blog page. If a piece needs a site template, redirect or canonical change, add a `go_live` gate.

## Engine decisions

Both answered on 2026-10-21:
1. Case study release: a `copy` gate with `external_contact` approves the text (signed document in `edits.evidence_ref`). Then a `rights_grants` row with scope `case_study_release` holds usage rights, markets and expiry, so takedowns run when it expires.
2. Human work (interview, localization) uses the `task` step type.
