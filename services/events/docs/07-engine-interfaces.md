# Service 16: Events and webinars — Engine interfaces

Version 1, 21 Oct 2026. Built against shared engine contract v0.1.0 (`/mnt/project-files/engine/`). This service does not fork any engine contract.

## 1. What this service reads

| Need | Engine call |
|---|---|
| Client voice, approved claims, banned words, personas, past event lessons | `GET /clients/{client_id}/brain`, `/brain/search` |
| Who to invite (email, SMS, WhatsApp) | `POST /clients/{client_id}/audiences/resolve` with `channel`, `purpose=marketing`, `country`. Only contacts with valid consent come back. |
| Registrant follow-up | `POST /audiences/resolve` with `purpose=service` for the recording and slides, and `purpose=marketing` for offers and nurture |
| Rights to reuse speaker likeness in clips | `GET /clients/{client_id}/rights` (rights grants from the speaker agreement) |
| KPI values for reports | `GET /metrics` |

## 2. What this service writes

| What | Engine call or event |
|---|---|
| Every draft (pages, emails, reminders, slides, answers, briefs) | `POST /artifacts`, then `POST /compliance/check`. A `block` stops the step. |
| Every human decision | `POST /approvals` (gate step). Kinds: `plan`, `budget`, `contract`, `claim`, `copy`, `go_live`, `template`, `creative`, `shortlist`, `report`, `escalation`. |
| Registration, attendance, no-show | `engine/outbound.recorded` with `service=events`, `channel=webinar` or `in_person_event`, `type=registered`, `attended` or `no_show` |
| Follow-up sends | Through Service 1 (email) and Service 10 (SMS, WhatsApp). They send `type=sent`. |
| Daily KPIs | `engine/metric.recorded` with the codes in `06-kpis.md` |
| New leads and SQLs | `engine/conversion.recorded` with `kind=lead` or `sql` |
| New speaker as a party, and speaker consent | `POST /parties`, `POST /clients/{client_id}/rights` |
| Live-session complaint, press or legal question | `engine/escalation.raised` with `channel=webinar`, SLA 1 hour |
| Lessons | `POST /clients/{client_id}/learnings` → `engine/learning.recorded` |

## 3. Service events (owned by this service)

| Event | Sent when | Payload |
|---|---|---|
| `svc.events/event.created` | Intake form submitted | `{client_id, event_id, type, markets[]}` |
| `svc.events/session.started` | Live session starts | `{client_id, event_id, session_id, market}` |
| `svc.events/session.ended` | Live session ends (this is E) | `{client_id, event_id, session_id, ended_at}` |
| `svc.events/attendance.synced` | Platform data is in | `{client_id, event_id, session_id, records}` |
| `svc.events/leads.scored` | Scoring done | `{client_id, event_id, hot, engaged, no_show}` |
| `svc.events/booth.synced` | Nightly lead app sync | `{client_id, event_id, day, leads}` |

## 4. Subflows this service calls

| Service | Workflow (expected id) | Used for |
|---|---|---|
| 17 CRO | `cro.landing_page` | Registration page |
| 1 Email | `email.campaign_send` | Invites, reminders, follow-up |
| 4 Social | `social.post_set` | Organic promotion |
| 11 Paid social | `paid_social.boost` | Paid promotion (budget gate in that flow) |
| 8 ABM | `abm.invite_sequence` | Invites to target accounts |
| 10 Messaging | `messaging.reminder` | T−10min SMS or WhatsApp |
| 3 Video | `video.clip_set` | Clips from the recording |
| 7 Content | `content.repurpose` | Blog post, one-pager |

The workflow ids are this service's best guess. Each owning thread confirms its id. The calls do not change if the id changes; only the name does.

## 5. Guardrails (engine `specs/workflow.md` §5)

| Action | Tool risk | Rule |
|---|---|---|
| Book a platform add-on, a venue or a booth | `sign` | Contract gate first |
| Start paid promotion | `spend` | Budget gate first (in Service 11) |
| Pay a speaker | `pay` | Budget gate and contract gate first |
| Share registrants with a co-host | `write_external` | Only contacts with consent for that partner; a person approves the export |
| Post a live answer | none | The agent never posts; the moderator does |

## 6. Roles

The engine has no `events_lead` role. This build uses `account_lead` for Pith events gates. If the engine adds `events_lead`, change the `required_roles` in the 2 workflow files.
