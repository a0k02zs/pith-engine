# Service 13 · Brand strategy and design · Engine interfaces

Version 1 · 21 Oct 2026. Built against engine contracts **v0.1.0** (`/mnt/project-files/engine/`).
Service code: `brand`.

This service is special: it is the main **writer** of the client brain. All other services only read it.

## 1. What this service writes

| What | Engine call or table | When | Notes |
|---|---|---|---|
| Brand profile draft | `PUT /clients/{id}/brain` → `brand_profiles` (status `draft`) | Stage 16 | Must validate against `brand-profile.json` (additionalProperties false) |
| Brand profile approval | Gate `approval_kind=design` → engine sets status `approved`, old version `superseded` | Stage 17 | Agents never write `approved` |
| New claims | `POST /clients/{id}/claims` (opens a `claim` approval) | Stage 8 | Agents cannot approve claims |
| Banned terms | Inside the profile `banned_terms[]` (mirrored to the `banned_terms` table) | Stage 16 | Each term has a reason and markets |
| Guideline chunks | `brand_chunks` with `source=guideline`, 1 topic each, with `locale` | Stage 16 | Long-form guideline text for search; structured blocks go in the profile (see §4) |
| Learnings | `POST /clients/{id}/learnings` | End of build; monthly | `service=brand` |
| Metrics | `engine/metric.recorded` | Gates, go-live, monthly | Shared codes plus `brand.*` service-only codes (`06-kpis.md`) |
| Brand scorer rubric | Rubric and calibration set per client (prompt `brand/brand_scorer@1`) | Stage 16 | The engine owns `POST /artifacts/{id}/brand-score`; dimensions match the engine: voice, terminology, claims, banned_terms, visual, locale |

## 2. What this service reads

| What | Engine call | Why |
|---|---|---|
| Current brain (if any) | `GET /clients/{id}/brain` | Audit and refresh start from it |
| Brain search | `POST /clients/{id}/brain/search` | Past assets and learnings for the audit |
| Brand scores across services | Warehouse query of `artifacts.brand_score` | Monthly brand health and drift |
| Interview recruits | `POST /audiences/resolve` (purpose `service`, channel `email`) | Only consented contacts are invited |
| Compliance | `POST /compliance/check` | Before public launch assets (taglines with claims, launch kit) |

## 3. Events

| Event | Direction | Payload |
|---|---|---|
| `svc.brand/intake.submitted` | in (starts `brand.build`) | `{client_id, intake_form_id}` |
| `svc.brand/interviews.uploaded` | in (strategist) | `{client_id, transcript_ids[]}` |
| `svc.brand/identity.delivered` | in (designer) | `{client_id, figma_file, file_urls[]}` |
| `svc.brand/brain.live` | out | `{client_id, version}`. Other services may start client work after this |
| `svc.brand/drift.detected` | out | `{client_id, months, lowest_services[]}` |
| `engine/brand.updated` | from engine, on approval | All services refresh caches |

## 4. Brand blocks in the profile (added by the engine on 21 Oct 2026)

On request from this service, the engine added 8 optional fields to `brand-profile.json`. The brain compiler fills them:

| Field | Contents | Who reads it |
|---|---|---|
| `messaging` | `promise`, `pillars[{name, message, proof_points[]}]`, `persona_messages[{persona_id, stage, message}]`, `objections[{objection, answer}]` | Content, email, ABM, paid, CRO |
| `boilerplate` | `[{locale, words_50, words_100}]` | PR, events, email footers |
| `taglines` | `[{text, locale, markets[], status}]` | All creative services |
| `voice.tone_by_situation` | `[{situation, formal, playful, expert, bold, note}]` (1 to 5) | Social replies, messaging, PR crisis |
| `voice.style_rules` | `{locale: [rules]}` | All writers |
| `visual.logo_rules` | clear space, minimum size, misuse list | Video, social, paid |
| `visual.templates` | `[{channel, tool, id_or_url}]` | Social, paid, video, email |
| `visual.color_roles` | colour name → role and accessible text pairs | All design steps |

`examples/brand-profile.example.json` uses all 8 fields and validates against the schema.

## 5. Rule for other services

1. Do not start client work until `svc.brand/brain.live` has fired at least once for that client (Package A minimum).
2. Do not edit the brain directly. Propose claims through `POST /claims`. Send other changes as a learning; the brand team folds them into the next profile version.
