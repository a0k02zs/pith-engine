# How messaging uses the shared engine (contract v0.1.0)

Built against `/mnt/project-files/engine/` as published on 21 Oct 2026. `specs/compliance-rules.json` names `market-rules.yaml` as the channel overlay for sms, whatsapp and push. `/audiences/resolve` returns `send_window`. Contacts carry `whatsapp_window_open_until` and `push_tokens[]`. Client events use `engine/client.event`. Messaging does not fork any engine contract.

## Calls this service makes

| Need | Engine contract | Messaging use |
|---|---|---|
| Brand voice, offers, claims, answers list | `GET /clients/{id}/brain` | Planner, copywriter and chat agent read it before they write |
| Recipients | `POST /clients/{id}/audiences/resolve` with `channel` = `sms`, `whatsapp` or `push` | The only source of recipients, for flows and broadcasts |
| Consent change | `PUT /clients/{id}/contacts/{cid}/consents` | Opt-in capture and every opt-out, with the inbound message id as `evidence_ref` |
| Store drafts | `POST /artifacts` with kind `sms`, `whatsapp_template`, `push` | Every template variant |
| Compliance | `POST /compliance/check` | Before every send. `content.body_text`, `content.locale`, `sender.sender_id`, `audience.audience_id`, `send_at` |
| Approvals | `/approvals` with kinds `plan`, `copy`, `template`, `claim`, `go_live`, `budget`, `escalation`, `report` | Gates G1 to G7 in `approvals.md` |
| Results | `engine/outbound.recorded`, `engine/metric.recorded` | See `kpis.md` |
| Escalations | `engine/escalation.raised` | Chat agent and classifier |

## Engine events this service listens to

| Event | Action |
|---|---|
| `engine/consent.changed` | Cancel queued sends when status is `withdrawn` or `expired` |
| `engine/contact.suppressed` | Suppress in every messaging provider |
| `engine/contact.erased` | Delete the phone number and chat logs in every provider |
| `engine/claim.retired` | Pause every template that uses the claim and send it back to the template lifecycle |
| `engine/brand.updated` | Refresh cached voice rules and answers list |
| `engine/approval.decided` | Resume the waiting run |

## Service events (owned by messaging)

`svc.messaging/client.onboarding.requested`, `svc.messaging/sender.registered`, `svc.messaging/template.requested`, `svc.messaging/template.published`, `svc.messaging/whatsapp.template.status`, `svc.messaging/broadcast.requested`, `svc.messaging/inbound.received`, `svc.messaging/optout.received`, `svc.messaging/flow.step.completed`, `svc.messaging/flows.activated`, `svc.messaging/test.ready`, `svc.messaging/daily.completed`.

Campaigns (Service 2): its assumed contract uses `channel/{service}.brief.created` and `channel/{service}.assets.ready`. Messaging maps `channel/messaging.brief.created` to `svc.messaging/broadcast.requested` and answers with `channel/messaging.assets.ready`. When the campaigns thread moves to the `svc.*` naming, only this mapping changes.

## Requests to the engine thread (all accepted 21 Oct 2026, see engine CHANGELOG.md "Messaging (10)")

| # | Request | Why |
|---|---|---|
| R1 | Done as new risk `remove` (guardrail G10, never blocked). Used by `06-opt-out.yaml` | An opt-out sync to a provider must never wait for or fail on a compliance check |
| R2 | Add the SMS, WhatsApp and push rules in `market-rules.yaml` to `specs/compliance-rules.json` (send windows, quiet days, sender registration, DNC freshness, US state rules, prayer pause, opt-out words) | The engine gate owns the final decision. `compliance-rules.json` was not published yet |
| R3 | Return `send_window` per market from `audiences/resolve` too, not only from `/compliance/check` | The triggered-send hot path needs it per contact |
| R4 | Add contact fields `whatsapp_window_open_until` and `push_tokens[]` (or allow them in `attributes`) | Channel waterfall and the WhatsApp 24 h rule |
| R5 | Accept client event `engine/client.event` name (or confirm the event name for `POST /clients/{id}/events`) | Trigger for flows F02 to F12 |
