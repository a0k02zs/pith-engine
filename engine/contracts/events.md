# Event catalog — contract v0.1.0

The engine and the services talk through Inngest events. Names use `<owner>/<noun>.<verb>`.

- `engine/*` events belong to the engine. Only the engine sends them.
- `svc.<service>/*` events belong to one service. Example: `svc.email/flow.published`, `svc.campaigns/brief.submitted`. A service owns its own names; list them in its own spec.
- Every payload has `client_id` and, when a run is involved, `run_id`. Payload schemas are in `schemas/`.
- Every event has an idempotency key: `<event name>:<object id>:<version or attempt>`.

## Engine events

| Event | Sent when | Payload | Main listeners |
|-------|-----------|---------|----------------|
| `engine/brand.updated` | A new brand profile version is approved | `{client_id, version, changed_sections[]}` | All services (refresh caches), brand (13) |
| `engine/claim.approved` | A new claim is approved | `{client_id, claim_id, markets[]}` | All writers |
| `engine/claim.retired` | A claim is retired or expires | `{client_id, claim_id}` | All services (pull live items that use it) |
| `engine/learning.recorded` | A result is written to the brain | `{client_id, learning_id, service, market}` | Strategy agents |
| `engine/contact.upserted` | A contact is created or changed | `{client_id, contact_id, changed_fields[]}` | crm_ops (9), abm (8) |
| `engine/consent.changed` | Any consent changes status | `{client_id, contact_id, channel, purpose, status, basis, at}` | email (1), messaging (10), paid_social (11, audience sync) |
| `engine/contact.suppressed` | Hard bounce, complaint, erasure, DNC hit | `{client_id, contact_id, reason}` | All senders |
| `engine/contact.erased` | Right to erasure done | `{client_id, contact_id}` | All services (delete copies in tools) |
| `engine/rights.changed` | A rights grant is added, expires or is revoked | `{client_id, grant_id, party_id?, contact_id?, scope[], status}` | video (3), influencer (6), community (18), paid_social (11) |
| `engine/run.started` | A workflow run starts | `{client_id, run_id, workflow_id, service, markets[]}` | Portal |
| `engine/run.step.completed` | A step ends | `{client_id, run_id, step_id, status}` | Portal |
| `engine/run.finished` | A run ends | `{client_id, run_id, status, output?}` | Parent runs (campaigns) |
| `engine/approval.requested` | An inbox item opens | `approval-item.json` | Portal, Slack notifier |
| `engine/approval.decided` | An inbox item closes | `{client_id, approval_id, run_id?, step_id?, kind, decision, decided_by[], comment?, edits?}` | The waiting run (gate step) |
| `engine/approval.overdue` | SLA passes with no decision | `{client_id, approval_id, kind, sla_due_at}` | Escalation (account lead) |
| `engine/compliance.checked` | A check finishes | `{client_id, check_id, artifact_id?, outcome, rule_ids[]}` | Portal, audit |
| `engine/escalation.raised` | An agent meets a "never alone" case: complaint, press, regulator, crisis, legal | `{client_id, service, channel, reason, source_ref, urgency}` | Account lead, PR (14). SLA 1 hour |
| `engine/guardrail.blocked` | The workflow layer stops a forbidden action | `{client_id, run_id, step_id, action, guardrail}` | Ops lead |
| `engine/spend.alert` | Spend spikes, cap is near, or CPA rule fires | `{client_id, platform, kind, value, threshold}` | performance (11), campaigns (2) |
| `engine/outbound.recorded` | One item had one event (sent, clicked, posted, spent, payout_sent, registered, ...) | `metric-event.json` with `kind=outbound` | analytics (12) |
| `engine/metric.recorded` | An aggregate KPI value for a day | `metric-event.json` with `kind=kpi` | analytics (12) |
| `engine/client.event` | A behavioural event arrives at `POST /clients/{id}/events` (page_view, cart_add, booking, delivery, inbound_message, ...) | `{client_id, contact_id?, anonymous_id?, name, props, occurred_at}` | Trigger flows: email (1), messaging (10), crm_ops (9) |
| `engine/conversion.recorded` | A purchase, lead, MQL, SQL, opportunity or closed-won | `{client_id, conversion_id, kind, value, currency, contact_id?, anonymous_id?}` | analytics (12), crm_ops (9) |

## How a service sends results

Services do not write to the measurement tables. They send `engine/outbound.recorded` (one per item event) or `engine/metric.recorded` (daily aggregates). The engine writes the rows.

Example: the email service sends a message.

```json
{
  "name": "engine/outbound.recorded",
  "data": {
    "client_id": "…", "service": "email", "kind": "outbound", "type": "sent",
    "channel": "email", "platform": "klaviyo", "market": "GB",
    "contact_id": "…", "artifact_id": "…", "campaign_id": "bf-2026", "flow_id": "welcome", "variant_id": "B",
    "occurred_at": "2026-10-21T09:00:00Z", "source": "klaviyo"
  }
}
```

Service-specific event names such as `email.sent` in a service spec map to `engine/outbound.recorded` with `service=email, type=sent`.

## Gate pattern (how a run waits for a person)

```ts
const approval = await step.run("request-approval", () => engine.approvals.create({...}));
const decided = await step.waitForEvent("wait-approval", {
  event: "engine/approval.decided",
  if: `async.data.approval_id == "${approval.id}"`,
  timeout: "14d",
});
```

A timeout sends `engine/approval.overdue` first (at the SLA), and the run ends as `cancelled` only at the hard timeout.
