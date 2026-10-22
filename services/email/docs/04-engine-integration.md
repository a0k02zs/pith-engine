# Email marketing: how the service uses the shared engine

Version 0.1, 21 Oct 2026. Built against engine contracts v0.1.0 (`engine/` in this repository). If the engine changes, this file changes.

## Engine calls

| Need | Engine contract |
|---|---|
| Recipients with valid email consent for their country | `POST /clients/{id}/audiences/resolve` with `channel: "email"`, `purpose: "marketing"` (or `"transactional"`), `markets`, `filter`, `send_at` |
| Brand voice, claims, offers, banned words, sender identity | `GET /clients/{id}/brain?market=` and `/brain/search` |
| Compliance check before go-live | `POST /compliance/check` (pass the `audience_id` from the resolve call) |
| Approvals | Gate steps with kinds `calendar`, `plan`, `copy`, `claim`, `report`, `escalation`, `go_live` |
| Results | `engine/outbound.recorded` per item event; `engine/metric.recorded` for daily aggregates |
| Learnings | `POST /clients/{id}/learnings` from the `learn` step |
| Consent changes | listen to `engine/consent.changed`, `engine/contact.suppressed`, `engine/contact.erased` |
| Claim retired | listen to `engine/claim.retired`; pause any live flow email that uses the claim |

## Workflow definitions

The 9 files in `workflows/` follow `contracts/schemas/workflow-definition.json`. I validated each one against that schema, and checked guardrails G5 (recipients only from `audiences.resolve` before a `send` step) and G6 (a compliance check before every `send` or `write_external` step). All 9 pass.

| Workflow | Trigger |
|---|---|
| `email.audience_sync` | Daily 02:00 |
| `email.consent_change` | `engine/consent.changed` |
| `email.flow_build` | Manual, per flow |
| `email.monthly_calendar` | 20th of each month, 08:00 |
| `email.campaign_send` | `svc.email/send.scheduled` (subflow per send) |
| `email.deliverability_monitor` | Every 2 hours |
| `email.outbound_sequence` | `svc.abm/list.ready` |
| `email.reply_triage` | `svc.email/reply.received` |
| `email.weekly_report` | Monday 07:00 |

## Open questions for the engine thread

1. **Risk level of operational writes (resolved).** Suppression, pause and "stop sequence for a contact" use risk `remove` (engine guardrail G10: never blocked, no check or gate). List sync and resume use `write_internal`.
2. **Tool names (resolved).** `esp`, `outbound`, `crm` and `engine` are in the engine `enums.tool_registry`.
3. **KPI code.** Flow revenue share is computed from `revenue` with `flow_id`. No new code is needed unless analytics prefers one.
4. **Email-specific rules (resolved).** `config/market-rules.json` is linked from the engine `specs/compliance-rules.json` as the email channel overlay. The email service owns it.

## Who else this service depends on

| Thread | What email needs |
|---|---|
| Marketing automation and CRM | Lead score, lifecycle stages, CRM tasks for sales hand-off |
| Account-based marketing | `svc.abm/list.ready` event with resolved lists and signals |
| Content marketing | Lead stories and assets for newsletters and nurture |
| Events and webinars | Webinar invites and follow-up content |
| CRO and landing pages | Landing pages for email traffic |
| Multi-channel campaigns | Master briefs that start `email.campaign_send` runs |
