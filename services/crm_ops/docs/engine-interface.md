# crm_ops and the shared engine (contract v0.1.0)

Version 1 · 21 Oct 2026. Engine files: `/mnt/project-files/engine/`. Service code: `crm_ops` (service 9).

## 1. Who owns what

| Data | Record of truth | Notes |
|---|---|---|
| Consent per contact, channel, purpose | **Engine** data layer (`consents`) | The CRM keeps a mirror. Every change goes through `PUT .../contacts/{id}/consents`. |
| Suppression, erasure | **Engine** | `engine/contact.suppressed`, `engine/contact.erased`. The CRM mirrors them. |
| Contact and company profile | **CRM**, synced to the engine | crm_ops upserts to `POST /clients/{id}/contacts` after W2. |
| Lifecycle stage, lead score, grade, owner, SLA fields | **CRM** (crm_ops) | Copied to the engine contact (`lifecycle_stage`, `attributes.lead_score`, `attributes.lead_grade`). |
| Deals, pipeline stages | **CRM** | Closed-won goes to `POST /conversions`. |
| Brand voice, approved claims | **Engine** client brain | Agents read `GET /clients/{id}/brain?market=`. |

## 2. Calls crm_ops makes

| Call | Used in |
|---|---|
| `GET /clients/{id}/brain` | Every agent step (default) |
| `POST /clients/{id}/contacts` (max 1,000 per call) | W1, W2, imports, migration |
| `PUT /clients/{id}/contacts/{contact_id}/consents` | W1 (form consent), W9 (changes made in the CRM) |
| `DELETE /clients/{id}/contacts/{contact_id}` | DSR erasure after G-DSR |
| `POST /audiences/resolve` | Only for the after-hours auto-reply in W6. Nurture recipients are resolved by the email service. |
| `POST /compliance/check` | Before the W6 auto-reply |
| `POST /approvals` (through `gate` steps) | G1, G1b, G2, G3, G-IMP, G-MERGE, G-DSR, G-SUPPRESS |
| `POST /conversions` | `kind` = `mql`, `sql`, `opportunity`, `closed_won` |
| `POST /learnings` | `crm_ops/learn@1` |
| `engine/metric.recorded` | Daily KPI values (`07-approvals-and-kpis.md`) |

## 3. Events

**crm_ops listens to:** `engine/contact.upserted` (score and route contacts that other services create, for example event badge scans), `engine/consent.changed`, `engine/contact.suppressed`, `engine/contact.erased`, `engine/approval.decided`, `engine/conversion.recorded` (purchases for B2C RFM).

**crm_ops sends** (service-owned names):

| Event | Payload | Who listens |
|---|---|---|
| `svc.crm_ops/lead.captured` | `{client_id, contact_ref, capture_channel, source}` | crm_ops.lead_capture |
| `svc.crm_ops/contact.ready` | `{client_id, contact_id}` | crm_ops.score_route |
| `svc.crm_ops/score.requested` / `score.updated` | `{client_id, contact_id, fit, engagement, grade, model_version}` | crm_ops, abm (8) |
| `svc.crm_ops/lead.routed` | `{client_id, contact_id, owner_id, grade, sla_due_at, in_business_hours, sla_escalate_1, sla_escalate_2}` | crm_ops.sla_watch, abm (8) |
| `svc.crm_ops/lead.touched` | `{client_id, contact_id, at, kind}` | crm_ops.sla_watch |
| `svc.crm_ops/lead.sla_breached` | `{client_id, contact_id, grade, minutes}` | Ops lead, analytics (12) |
| `svc.crm_ops/lead.rejected` | `{client_id, contact_id, reason}` | crm_ops.recycle |
| `svc.crm_ops/nurture.eligible` | `{client_id, contact_id, track_hint}` | crm_ops.nurture_enrol → `email.nurture_flow` |
| `svc.crm_ops/import.requested` / `import.completed` | `{client_id, file_ref, rows}` | crm_ops.list_import |
| `svc.crm_ops/art14.notice_due` | `{client_id, contact_ids[], due_by}` | email (1) sends the notice |
| `svc.crm_ops/dsr.received` / `dsr.completed` | `{client_id, contact_id, kind, deadline}` | crm_ops.dsr |
| `svc.crm_ops/setup.live` | `{client_id, platform, build_version}` | All services |

## 4. What other services get from crm_ops

| Service | Gets |
|---|---|
| Email (1) | Lifecycle stage and grade as segment fields; nurture track briefs; `nurture.eligible` hand-off; `art14.notice_due` |
| ABM (8) | Fit score, `account_engagement_score`, `lead.routed` for tier-1 accounts; ABM intent feeds the engagement score (+10) |
| Messaging (10) | Lifecycle triggers (at_risk, first_purchase) and the working week per market |
| Paid social (11) | Lifecycle segments for audience rules (the list itself still comes from `/audiences/resolve`) |
| Analytics (12) | MQL, SQL, opportunity and closed-won conversions; source fields; crm_ops KPIs |
| Events (16) | Badge scans go into W1; the +8 / +10 points in the score |

## 5. Change requests to the engine (all shipped in v0.1.0 on 21 Oct 2026, see engine CHANGELOG)

1. **`lifecycle_stages`:** add `sal`, `nurture`, `disqualified`. Reason: the plan's B2B funnel and recycle flow need them; other services segment on them. Fallback in use: `sal` → `mql`, `nurture` and `disqualified` → `other`.
2. **`approval_kinds`:** add `data_change` (default role `ops_lead`, SLA 72 h, never skippable except the ≤ 500-row first-party import rule). Used for list imports, fuzzy merges, data subject requests and bulk suppression. Fallback: `go_live`.
3. **`conversions.kind`:** the engine lists `mql`, `sal`, `sql`, `opportunity`, `closed_won`, `closed_lost`. crm_ops sends all 6.
4. **KPIs:** none needed. crm_ops uses shared codes plus `crm_ops.*` service-only codes.
