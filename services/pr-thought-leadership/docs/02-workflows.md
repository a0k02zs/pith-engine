# PR and thought leadership: workflows

Service 14 (`pr`). Version 0.1, 21 Oct 2026.
The 9 workflows are data files in `workflows/`. Each file is valid against `engine/contracts/schemas/workflow-definition.json` (v0.1.0). Checked on 21 Oct 2026 with a JSON Schema validator. Every `needs` and every branch target points to a real step.

## 1. Workflow list

| Id | Trigger | What it does | Gates (approval kind → roles) |
|---|---|---|---|
| `pr.media_list_refresh` (WF-1) | Monthly, or `svc.pr/media_list.requested` | Finds journalists and podcasts, scores tier and fit, upserts them as parties | `shortlist` → pr_lead (only when new tier 1 names appear) |
| `pr.angle_plan` (WF-2) | 25th of each month, or manual | 8 to 12 angle cards (T3) from trends, client news and Service 5 citation targets | `plan` → pr_lead; `plan` → client_approver; `claim` → client_legal or client_approver (only with new claims) |
| `pr.pitch_campaign` (WF-3) | `svc.pr/angle.approved` | Shortlist, 1 pitch per journalist, drafts in the sender's mailbox, human send, 1 follow-up, coverage capture | `copy` → pr_lead (twice: pitches, follow-ups); `claim` → client_legal (listed client, price-sensitive) |
| `pr.reactive_request` (WF-4) | Every 30 minutes | Journalist request feeds; T5 reply with the spokesperson's quote | `copy` → client_executive or subject_expert (2 h); `copy` → pr_lead (1 h) |
| `pr.announcement` (WF-5) | `svc.pr/announcement.requested`, or manual | T8 release per market, briefs, embargo pitches, wire and newsroom | `copy` → native_editor; `copy` → client_approver + client_executive; `claim` → client_legal; `go_live` → pr_lead + client_approver |
| `pr.exec_weekly` (WF-6) | Monday 09:00, per executive | Voice memo → 3 to 4 posts → executive approval → schedule; Friday comment suggestions | `copy` → client_executive (never skipped); `claim` → client_legal (listed client or new claims) |
| `pr.monitor` (WF-7) | Every 15 minutes | Coverage records (T11), sentiment, share of voice; level 2 or 3 starts WF-8 | None |
| `pr.crisis` (WF-8) | `engine/escalation.raised` (any service) and WF-7 | Triage, pause list, holding statement draft | `escalation` → pr_lead or account_lead (15 min); `escalation` → client_legal + client_executive (1 h) |
| `pr.monthly_report` (WF-9) | 2nd of each month | T12 report | `report` → pr_lead or analytics_lead |

## 2. The send rule

The engine's guardrail G4 says an agent never replies to a journalist. This service goes 1 step further: an agent never sends any message to a journalist.

1. The pitch writer makes 1 draft per journalist.
2. After the `copy` gate, a `tool` step with risk `write_internal` creates drafts in the named sender's own mailbox (Gmail or Outlook). It never calls a send action.
3. The sender reads, edits if needed, and presses Send.
4. The mailbox sync sends `svc.pr/pitch.sent` and `svc.pr/pitch.replied`. The workflow waits for these events.
5. Replies from journalists never go to an agent for an answer. They go to the sender's inbox, and the sync logs them.

Because the agent never sends, `POST /audiences/resolve` is not in the send path. Journalists are parties, not contacts. The compliance check still runs on every draft (rules in `06-market-rules.md` §7).

## 3. Executive posts

- WF-6 schedules posts only through LinkedIn's official API with the executive's own authorization (tool action `posts.schedule_member`, risk `write_external`), or hands the approved text to the executive to post by hand.
- No automated likes, comments, connection requests or messages. The Friday step only suggests comments.
- The `copy` gate for executive posts has no `skip_if`. The executive approves every post.

## 4. Service events

Names follow `engine/contracts/events.md`: `svc.pr/<noun>.<verb>`.

| Event | Sent by | Payload |
|---|---|---|
| `svc.pr/media_list.requested` | Portal, WF-3 | `{client_id, markets[], topics[]}` |
| `svc.pr/media_list.refreshed` | WF-1 | `{client_id, run_id, added, removed, tier1_added}` |
| `svc.pr/angle.approved` | WF-2 (1 per angle) | `{client_id, run_id, angle_id, markets[], spokesperson_id}` |
| `svc.pr/angle_plan.approved` | WF-2 | `{client_id, run_id, angle_ids[]}` |
| `svc.pr/pitch.sent` | Mailbox sync | `{client_id, angle_id?, request_id?, party_id, sender_user_id, message_ref, sent_at}` |
| `svc.pr/pitch.replied` | Mailbox sync | `{client_id, angle_id?, party_id, reply_class}` where `reply_class` is interested, declined, opt_out, auto_reply, other |
| `svc.pr/request.skipped` | WF-4 | `{client_id, feed, request_id, reason}` |
| `svc.pr/announcement.requested` | Portal, campaigns (2) | `{client_id, title, date, markets[], embargo_at?}` |
| `svc.pr/announcement.live` | WF-5 | `{client_id, release_id, url, markets[]}`; listened to by social (4), email (1), search (5) |
| `svc.pr/exec_notes.received` | Portal, Slack, voice memo inbox | `{client_id, executive_id, media_ref?, text?}` |
| `svc.pr/exec_week.ended` | Scheduler (Friday 15:00 local) | `{client_id, executive_id, week}` |
| `svc.pr/coverage.found` | WF-7 | T11 record plus `{angle_id?, request_id?}`; listened to by search (5) and social (4) |
| `svc.pr/crisis.closed` | Portal (a person closes it) | `{client_id, crisis_id, summary}` |

An `opt_out` reply sets `do_not_pitch` on the party at once, for every client.

## 5. Results to the engine

| Item | Event | `type` or KPI |
|---|---|---|
| Each pitch sent by a person | `engine/outbound.recorded` | channel `press_pitch`, type `sent` |
| Each journalist reply | `engine/outbound.recorded` | type `replied` |
| Each executive post live | `engine/outbound.recorded` | channel `social_post`, type `posted` |
| Daily aggregates | `engine/metric.recorded` | KPI codes in `05-approvals-and-kpis.md` §3 |
| Lessons | `POST /learnings` | from the `learn` and `review` steps |

## 6. Tool actions used

| Tool | Action | Risk |
|---|---|---|
| Muck Rack (or Cision) | `journalists.search`, `articles.recent` | read |
| Meltwater | `trends.search`, `mentions.search` | read |
| Qwoted, ResponseSource, Featured | `requests.list` | read |
| Gmail or Outlook | `drafts.create` | write_internal |
| Transcription (Whisper or similar) | `audio.transcribe` | read |
| LinkedIn API | `posts.schedule_member` | write_external |
| Business Wire (or PR Newswire, GlobeNewswire) | `release.schedule` | write_external |
| Client CMS | `page.publish` (newsroom) | write_external |
| Engine | `parties.upsert`, `service.search.citation_targets`, `client.pause_scheduled`, `metrics.query` | read or write_internal |

`service.search.citation_targets` and `client.pause_scheduled` are new engine actions. They are listed in `07-engine-requests.md`.
