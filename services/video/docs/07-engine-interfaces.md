# 07 · Interfaces with the shared engine (contract v0.1.0)

Video builds against the engine contracts in `/mnt/project-files/engine/`. This file maps each
video need to the contract. Video does not fork any contract; changes go through the engine thread.

## 1. Client brain → `GET /clients/{id}/brain` (`brand-profile.json`)

| Video needs | Brand profile field |
|---|---|
| Voice and market tone | `voice`, `voice.by_market` |
| Personas, products, offers | `personas`, `products`, `offers` |
| Approved claims | `approved_claims[]` (`id` is a UUID; scripts carry these IDs as `claim_ids`) |
| Banned words, disclaimers | `banned_terms[]`, `required_disclaimers[]` (filter `channel = video`) |
| Brand kit | `visual` (colours, fonts, logo URLs, Canva brand kit, Figma file) |
| Music sources, talent rules, AI avatar and voice clone allowed | `media_rules` |
| Sensitive topics | `sensitive_topics` |
| Past winning hooks | `past_results[]` and `/clients/{id}/learnings` filtered by `service = video` |

Video writes learnings with `POST /clients/{id}/learnings` (weekly analyst).

## 2. Consent for likeness and voice → `rights-grant.json`, `/clients/{id}/rights`

The T4 consent record maps to a rights grant:

| T4 field | Rights grant field |
|---|---|
| Person | `party_id` (creator or talent in `party.json`) or `contact_id` (customer, employee) |
| Scope: filming and use of image | `likeness` |
| Scope: AI avatar | `avatar` |
| Scope: AI voice clone | `voice_clone` |
| Paid usage | `paid_usage`; creator whitelisting `whitelisting` |
| Creator footage reuse | `ugc_reuse` |
| Markets, channels | `markets[]`, `channels[]` |
| Term | `starts_at`, `expires_at` |
| Revoked | `revoked_at` |
| Signed form | `evidence_ref` |
| Music and stock licences (T5) | Grants with scope `music` or `stock` |

Engine guardrail G8 blocks any media with `people[]` that has no active grant with the right scope
and market. Video listens to `engine/rights.changed` to start take-downs when a grant is revoked or expires.

| Voice languages | `voice_languages[]` |
| Edit scope (standard edits, translation, dub) | `edit_scope` |
| Fee | `fee` |
| Guardian consent (minors) | `guardian_evidence_ref` |

**Rights pattern (engine, second round):** the job first looks up active grants with
`GET /clients/{id}/rights?party_id=…&active_on=`. Only for missing grants does it send forms and wait on
`engine/rights.changed` (timeout 21 days). The compliance check then enforces guardrail G8.

## 3. Approval inbox → `approval-item.json`, gate steps

| Video gate | `approval_kind` | `required_roles` | Count | SLA | Skip |
|---|---|---|---|---|---|
| G1 Approve script | `script` | creative_lead, client_approver | 2 | 48 h | Never |
| G2 Approve spend | `budget` | strategist, client_approver | 2 | 24 h | Never (only opens when cost is over the limit, a shoot, or a new fee) |
| G3a Contract | `contract` | creative_lead, client_legal or client_approver | 2 | 72 h | Never |
| G3b Rights confirmed | `check` step (compliance, guardrail G8) | – | – | – | – |
| Native language review | `creative` | native_editor | 1 | 24 h | Skips for English-only jobs |
| G4 Final review (editor) | `creative` | editor | 1 | 24 h | Never |
| G4 Final review (client) | `creative` | creative_lead, client_approver | 2 | 48 h | Skips unless hero, testimonial or new template |
| Variant refresh hooks | `creative` | creative_lead, client_approver | 2 | 48 h | Skips when no new claims, body reused and hook types already approved |
| Weekly report | `report` | strategist or analytics_lead | 1 | 24 h | Never |

## 4. Compliance gate → `POST /compliance/check`

Video sends `service: "video"`, `channel: "video"`, `markets` (ISO codes, `CA-QC` for Quebec),
`content.transcript`, `content.caption`, `content.locale`, `content.labels` (for example `Ad`,
`AI-generated`, `Publicité`, `Image virtuelle`), `content.claim_ids`, and
`media: { ai_generated, ai_manipulated_real_person, people[{party_id|contact_id, uses}], music_licence_ref, stock_licence_refs }`,
plus `paid.is_paid_partnership` and `paid.creator_party_id` for creator content.

Outcomes are `pass`, `warn` (a person reviews and may override with a reason) or `block`.
The engine now holds the video rules `FR-IMAGE-LABEL`, `QC-FRENCH-MASTER`, `AE-FILM-CONSENT` and
`US-FAKE-TESTIMONIAL` in `specs/compliance-rules.json`. The other rules in `05-market-rules.md` are
checked by the `compliance-precheck` agent and the editor.

## 5. Artifacts → `artifact.json`

Each script, cut and export is an artifact with `service: "video"` and `kind` one of
`video_script`, `video_cut`, `video_export`. `file_urls` holds the master and exports.

## 6. Measurement → `engine/metric.recorded`, `engine/outbound.recorded`

Canonical KPI codes video uses: `hook_rate`, `hold_rate`, `completion_rate`, `avg_watch_minutes`,
`ctr`, `cpa`, `cpl`, `cost_per_finished_video`, `days_brief_to_delivery`, `disclosure_compliance`,
`brand_score`, `cost_per_asset`, `incremental_lift`. The publish events (`posted`, `impression`,
`spent`) are sent by the social and paid pipelines with `artifact_id` of the video export.

Video operations and rights KPIs, added by the engine in the second round: `first_pass_approval_rate`,
`revision_rounds`, `gate_sla_met`, `qc_first_pass_rate`, `video_reuse_rate`, `consent_coverage`,
`licence_coverage`, `expired_assets_live`, `takedown_hours`.

## 7. Events

| Direction | Event |
|---|---|
| In (engine) | `engine/approval.decided`, `engine/approval.overdue`, `engine/rights.changed`, `engine/claim.retired`, `engine/brand.updated`, `engine/compliance.checked` |
| In (other services) | `svc.campaigns/*` subflow start, social, paid, content and events requests mapped to `svc.video/brief.submitted` |
| Video-owned | `svc.video/brief.submitted`, `svc.video/footage.uploaded`, `svc.video/asset.delivered`, `svc.video/refresh.requested`, `svc.video/takedown.required` |

## 8. Workflow definitions

`workflow/video.job.json`, `workflow/video.variant_refresh.json` and `workflow/video.weekly_learn.json`
validate against `workflow-definition.json` and pass the engine guardrails G2 and G6 (checked on 21 Oct 2026, after the engine's second round).
