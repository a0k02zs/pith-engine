# Automation workflow specs (W1 to W10)

Version 1.1 · 21 Oct 2026. Machine format: `workflows.json` (definitions that match engine contract v0.1.0 `workflow-definition.json`, ids `crm_ops.*`).

Each workflow has a trigger, steps, a human gate (if any), error rules and a log event. The shared engine workflow layer runs the agent steps. The CRM runs the native steps. Service events use the engine pattern `svc.crm_ops/<noun>.<verb>`. See `engine-interface.md` for the full map to engine contract v0.1.0.

**Global rules for all workflows**

1. The engine data layer is the record of consent. The CRM keeps a mirror of it. Write every consent change with `PUT /clients/{id}/contacts/{contact_id}/consents`.
2. A send step gets recipients only from `POST /audiences/resolve` (engine guardrail G5). It never reads a list from the CRM.
3. Before any send step, run a `check` step with `compliance` (`POST /compliance/check`). A `block` result stops the step.
4. Retries follow the engine default (3 attempts, exponential backoff). After the last failure, the engine opens an inbox item.
5. The engine logs every step in `step_runs` and every model or tool call in `agent_actions`.
6. Run in the client's sandbox first. A workflow goes live only after gate G2.
7. Opt-out and suppression syncs use tool risk `remove` (engine guardrail G10). They never wait on a check or a gate.

---

## W1 · Lead capture

**Trigger:** a form submit, chat lead, ad lead form (LinkedIn, Meta, TikTok), event badge scan, webinar registration, or approved list import.

| Step | Type | Action |
|---|---|---|
| 1 | Native | Create or update the contact. Match on email (lower case), then on phone in E.164 format. |
| 2 | Native | Write source fields: `original_source`, `latest_source`, `utm_*`, `form_id`, `capture_channel`, `captured_at`. |
| 3 | Native | Write consent fields from the form: `consent_email`, `consent_sms`, `consent_whatsapp`, `consent_basis`, `consent_text_version`, `consent_captured_at`, `consent_source_url`. |
| 4 | Native | Set `country_code` from the form. If empty, use IP country. If both are empty, set `country_unknown = true`. |
| 5 | Agent | If `country_unknown`, hold all marketing sends. Add the contact to the "ask country" task list. |
| 6 | Event | Emit `svc.crm_ops/lead.captured`. W2 starts. |

**Imports:** a list import needs the source of the list and the lawful basis per market. A person approves each import over 500 rows (gate G-IMP). EU and UK imports from third-party data (for example Apollo) need an Article 14 notice task. See `08-market-rules.md`.

## W2 · Deduplicate and normalize

**Trigger:** `svc.crm_ops/lead.captured`, and a nightly batch at 02:00 client time.

| Step | Type | Action |
|---|---|---|
| 1 | Agent | Normalize: email lower case, phone to E.164, country to ISO 3166-1 alpha-2, job title to `job_seniority` and `job_function` picklists. |
| 2 | Agent | Find duplicates: same email; or same phone; or same first name + last name + company domain. |
| 3 | Agent | Exact email match: auto-merge. Keep the oldest record as primary. Keep the most recent non-empty value per field. Keep the **most strict** consent value (an opt-out always wins). |
| 4 | Gate | Fuzzy match (name + company only): do not merge. Open a `data_change` approval. A person merges or rejects. |
| 5 | Native | Company: match on root domain. Create the company if none exists. Associate the contact. |
| 6 | Native | Upsert the contact to the engine (`POST /clients/{id}/contacts`). The engine sends `engine/contact.upserted`. |

Every merge is logged with both record ids and the field values before the merge. A merge can be undone for 30 days.

## W3 · Enrich

**Trigger:** after W2, where the contact is B2B and a fit field is empty.

| Step | Type | Action |
|---|---|---|
| 1 | Agent | Call the enrichment tool (Clay, Apollo or ZoomInfo) with email and domain. |
| 2 | Agent | Fill only empty fields. Never overwrite a value that the person typed. |
| 3 | Agent | Write `enrichment_source` and `enriched_at`. |
| 4 | Rule | EU and UK: enrichment of a personal profile needs a legitimate interest assessment on file for the client (field `lia_on_file = true` on the client config). If it is false, enrich company fields only. |
| 5 | Event | Emit `svc.crm_ops/score.requested`. |

Budget guard: maximum enrichment credits per day is set in the client config. Stop at the cap and alert the ops lead.

## W4 · Score

**Trigger:** any scoring event in `lead-scoring.json`, `svc.crm_ops/score.requested`, and a nightly decay job.

| Step | Type | Action |
|---|---|---|
| 1 | Native or agent | Recalculate fit and engagement with the approved client copy of `lead-scoring.json`. |
| 2 | Native | Write `fit_score`, `engagement_score`, `lead_score`, `lead_grade`, `score_updated_at`, `score_model_version`. |
| 3 | Native | If the grade goes up to A or B and the stage is `lead` or `nurture`: set stage `mql`, set `mql_date`, set `mql_reason`. Post `POST /conversions` with `kind=mql` (the engine sends `engine/conversion.recorded`). |
| 4 | Native | Account: update `account_engagement_score` (sum of top 3 contacts, cap 100). |

B2C clients: replace this workflow with the nightly RFM job (section 4 of `02-lifecycle-and-scoring.md`).

## W5 · Route and assign

**Trigger:** the MQL step in W4.

| Step | Type | Action |
|---|---|---|
| 1 | Native | Apply the routing rules in order (section 5 of `02-lifecycle-and-scoring.md`). |
| 2 | Native | Pick an owner by round-robin among reps who are in working hours for the lead's country and not on leave. |
| 3 | Native | Create a task "Follow up MQL" with the due time from the SLA. |
| 4 | Agent | Write the sales hand-off brief (template T4) and attach it to the contact as a note. |
| 5 | Native | Send the alert: Slack (or Teams) and a CRM notification. Hot leads also get a mobile push. |
| 6 | Event | Emit `svc.crm_ops/lead.routed`. W6 starts. |

## W6 · Speed-to-lead SLA watch

**Trigger:** `svc.crm_ops/lead.routed`.

| Step | Type | Action |
|---|---|---|
| 1 | Native | Start the SLA timer for the grade. |
| 2 | Native | Stop the timer on the first logged call, email or meeting by the owner. Write `first_touch_at` and `response_minutes`. |
| 3 | Native | At escalation 1: alert the team lead. |
| 4 | Native | At escalation 2: reassign to the next rep in the queue. Emit `svc.crm_ops/lead.sla_breached`. |
| 5 | Native | Sales accepts (stage `sal`) or rejects with a reason. Rejection emits `svc.crm_ops/lead.rejected` and starts W8. At SQL, post `POST /conversions` with `kind=sql`. |

Hot leads that arrive outside business hours get an instant auto-reply in the lead's language. The reply gives a booking link (for example HubSpot Meetings or Chili Piper). The SLA starts at the next business hour.

## W7 · Nurture tracks

**Trigger:** contact at grade C, or stage `nurture`, with marketing consent for email.

This service picks the track and the timing. The Email marketing service (1) sends the email: `crm_ops.nurture_enrol` starts the `email.nurture_flow` subflow. The Nurture Writer agent writes the brief and the first draft for each email from template T3. The email service runs its own `copy` gate: the client approves new templates and new claims, and repeat sends of approved templates skip the gate.

**B2B default tracks**

| Track | Entry | Emails | Exit |
|---|---|---|---|
| N1 · Content nurture | Gated content download | 5 emails over 21 days: thank you + asset; related insight; case study; how-to or checklist; soft CTA to a call | MQL, unsubscribe, or end → newsletter |
| N2 · Webinar follow-up | Webinar attended or registered | 3 emails over 7 days, split by attended or not attended | MQL or end → N1 |
| N3 · Trial onboarding | Trial started | 6 emails over 14 days, each tied to 1 product key action | Paid, MQL, or end |
| N4 · Demo no-show | Meeting status `no_show` | 3 emails over 5 days with a rebook link | Rebooked, or end → N1 |
| N5 · Recycle | Stage `nurture` from W8 | Track by rejection reason (see W8) | MQL again, or 180 days → newsletter |

**B2C default tracks**

| Track | Entry | Messages | Exit |
|---|---|---|---|
| C1 · Welcome | New subscriber | 4 emails over 10 days: brand story, best sellers, social proof, first-order offer (offer approved by the client) | First purchase or end |
| C2 · Second purchase | `first_purchase` | 3 emails over 30 days: care or use tips, cross-sell, review ask | Repeat purchase |
| C3 · Win-back | `at_risk` | 3 emails over 21 days: "we miss you", new arrivals, offer | Purchase, or `lapsed` |
| C4 · Sunset | `sunset` | 2 emails: re-permission ask | Click (stays) or suppress |

Cart, browse and post-purchase flows belong to the Email marketing service (1). This service only provides the data and the lifecycle triggers.

**Send rules:** maximum 3 marketing emails per contact per 7 days across all tracks. Local send time from the contact's time zone. No sends on the client's blackout dates. In the GCC, the client chooses if sends pause during Eid holidays.

## W8 · Recycle (rejected and closed-lost)

**Trigger:** sales rejects an MQL, or a deal is closed-lost, or there is no activity for 90 days at MQL or SAL.

| Rejection reason | Action |
|---|---|
| `bad_fit` | Set `disqualified` if fit < 25. Else set `nurture`, newsletter only. Tell the Scoring Analyst (feedback for tuning). |
| `no_budget`, `bad_timing` | Set `nurture`. N5 track. Set `recycle_review_date` = today + 90 days. |
| `no_response` | Set `nurture`. N1 track. Score keeps decaying. |
| `already_customer` | Set `customer`. Send to account management. Flag routing rule failure for review. |
| `competitor` | Set `disqualified`. Suppress from all marketing. |
| `duplicate` | Start W2 merge review. |
| Closed-lost | Set `nurture`. N5 track. Create task for the owner at day 120. |

## W9 · Consent and preference sync

**Trigger:** an unsubscribe, preference change, complaint, or data subject request (DSR) in any channel or tool.

| Step | Type | Action |
|---|---|---|
| 1 | Native | A change made in the CRM (for example a rep marks "do not contact") goes to the engine with `PUT .../consents`. A change made anywhere else reaches the engine first. |
| 2 | Event | The engine sends `engine/consent.changed`. `crm_ops.consent_sync` mirrors it into the CRM within 5 minutes. The most strict value wins. |
| 3 | Native | Suppress the contact in connected tools (Klaviyo, Braze, Twilio, ad audiences) with risk `remove`. |
| 4 | Gate | A DSR (access, delete, correct) opens a `data_change` approval for `client_legal`. The agent prepares the data export or the delete list. A person approves. Erasure uses `DELETE /clients/{id}/contacts/{contact_id}`, which sends `engine/contact.erased`. |
| 5 | Native | Log the request date and the done date. Legal deadlines are in `08-market-rules.md`. |

Unsubscribe deadlines: the CRM applies all opt-outs at once. This is faster than every legal deadline in the 5 markets (for example 10 business days under CAN-SPAM and CASL).

## W10 · Daily data health monitor

**Trigger:** schedule, each day at 06:00 client time.

| Check | Auto-fix allowed | Else |
|---|---|---|
| New exact duplicates | Yes, merge (W2 rules) | — |
| Contacts with no `country_code` | No | List to ops queue |
| Contacts with a marketing send and no consent record | No — **block** the contact at once | Alert the ops lead (severity high) |
| Workflow errors in the last 24 hours | Retry once | Issue in the approval inbox |
| MQLs with no owner | Re-run W5 | Alert if it fails again |
| SLA breaches yesterday | No | Add to daily digest |
| Invalid emails (hard bounce) | Yes, set `invalid_email`, stop sends | — |
| Integration sync lag > 60 minutes | No | Alert the automation engineer |
| Field fill rate under target for a required field | No | Add to weekly report |

Output: a daily digest in Slack with counts and links. A weekly data quality score goes to the client dashboard (see `07-approvals-and-kpis.md`).
