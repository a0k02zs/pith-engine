# PR and thought leadership: requests to the engine thread

Service 14 (`pr`). 21 Oct 2026. Sent to the "Shared marketing engine" thread.
All are minor additions under contract v0.1.0. Nothing here breaks another service.

| # | Request | Why |
|---|---|---|
| R1 | Add the 8 compliance checks in `06-market-rules.md` §7 to `specs/compliance-rules.json` for channel `press_pitch` (and `social_post` where listed). | `press_pitch` has no rules in `compliance-rules.json` today. |
| R2 | Let `POST /compliance/check` take a `party_id` recipient (kind `journalist`) and read `attributes.consent_basis` and `attributes.do_not_pitch`. | Journalists are parties, not contacts, so `/audiences/resolve` does not cover them. |
| R3 | A global `do_not_pitch` on journalist parties with `client_id` null, set by a `svc.pr/pitch.replied` with `reply_class = opt_out`. | An opt-out must apply to every Pith client. |
| R4 | Engine tool action `client.pause_scheduled` (risk `write_internal`): pause scheduled sends, posts, pitches and ad sets for 1 client in every service; `client.resume_scheduled` to undo. | WF-8 crisis level 3. |
| R5 | Engine tool action `service.search.citation_targets` (read): Service 5's link and citation targets and GEO prompts for a client. | WF-2 angle planning. Service 5 already lists "Link and citation targets" as an output to PR. |
| R6 | A `client.listed` boolean and `client.exchange` on the client record, usable in CEL. | WF-3 and WF-6 branch on it. |
| R7 | Make `pr` a default listener of `engine/escalation.raised` with reason `press` or `crisis` (already in `events.md`), and add `pr_lead` to the default roles for `escalation`. | Today the default is `account_lead` only. |
| R8 | Note the service-only KPIs in `05-approvals-and-kpis.md` §3 (`pr.*`). Promote `pr.media_mentions` and `pr.backlinks_earned` to shared codes if Service 5 also uses them. | Kpi naming rule. |

## Added with the service code (23 Oct 2026)

| # | Request | Why |
|---|---|---|
| R9 | Add `mailbox` (action `drafts.create`, risk `write_internal`) to `tool_registry`. | Pitches go to the sender's own mailbox as drafts. A person sends them. |
| R10 | Add `parties.upsert` and `metrics.query` to `engine_actions`, or confirm that services use the `/parties` and `/metrics` endpoints. | WF-1 saves journalists as parties. WF-9 reads KPIs. |
| R11 | Point `service_overlays.pr` to `services/pr-thought-leadership/config/compliance-overlay.json`. | The overlay now lives in the service folder. |
