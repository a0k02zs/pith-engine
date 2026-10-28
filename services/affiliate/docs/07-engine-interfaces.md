# Service 15 · Affiliate and partner marketing · Engine interfaces

Version 1 · 21 Oct 2026. Built against engine contracts v0.1.0 (`/mnt/project-files/engine/`).
Service code: `affiliate` (15). Channel: `affiliate_link`.

## What this service reads

| Engine API or object | Used for | Step |
|---|---|---|
| `GET /clients/{id}/brain` | Voice, products, personas, approved claims, banned words, FAQ | Every agent |
| `GET /clients/{id}/claims` | Claims partners may use; creative pack | A7, D1 |
| `GET/POST /parties` (`party.json`, kind `affiliate` or `partner`) | Prospective and active partners; GCC licences (`uae_media_council`, `mawthooq`) | B1–B8, D1 |
| `POST /clients/{id}/audiences/resolve` | Lawful recipients for recruitment and partner email (rule G5) | B4 |
| `POST /compliance/check` | Outreach, creative, onboarding, statements, partner content | A7, B5, B8, C8, D1 |
| `engine/claim.retired` | Pull retired claims from the creative library and warn partners that use them | listener |
| `engine/contact.erased` | Delete the person from the affiliate platform and referral tool | listener |
| `engine/approval.decided` | Resume a run at a gate | all gates |

## What this service writes or sends

| Event or API | When | Notes |
|---|---|---|
| `POST /approvals` (through gate steps) | Every gate in `02-pipeline.md` | Kinds: `budget`, `contract`, `creative`, `go_live`, `shortlist`, `budget_change`, `escalation`, `payout`, `report` |
| `engine/outbound.recorded` | Outreach `sent` / `replied`; partner `clicked`; payout `payout_sent`; deal `registered` | `service=affiliate`, `channel=affiliate_link` (or `email` for outreach) |
| `engine/conversion.recorded` | Each approved partner conversion | Only after the fraud check approves it |
| `engine/metric.recorded` | Daily KPI values from `06-kpis.md` | Existing KPI codes only |
| `engine/escalation.raised` | Partner complaint, legal question, terms question | Rule G4 |
| `engine/learning.recorded` | Monthly: what worked (partner types, offers, creative) | From the Reporter agent |
| `svc.affiliate/programme.requested`, `programme.live`, `programme.blocked`, `partner.joined`, `reply.received`, `activation.completed`, `payout.over_cap`, `sweep.completed` | Service-owned events | Names follow `events.md` |

## Engine changes made for this service

The engine thread added all 4 requests on 21 Oct 2026 (`engine/CHANGELOG.md`, "Affiliate (15)"):

1. `payout` approval detail for a batch: `{lines[{party_id, amount, currency, period, proof_url}], totals_by_currency}`. The `approve_payout` gate sends this payload.
2. `POST /clients/{id}/audiences/resolve` accepts `party_ids[]`, and consents can belong to a party. The `resolve_recipients` step sends the shortlisted party ids.
3. KPI codes `activation_rate`, `reversal_rate`, `payout_amount`, `partner_revenue_concentration`, `epc` (see `06-kpis.md`).
4. `payout_sent` and `registered` are in `enums.json` `outbound_event_types`.

## Guardrails this service relies on

| Engine rule | How the affiliate workflows meet it |
|---|---|
| G1 spend | No `spend` step. Commission is paid through `pay` steps only. |
| G2 sign and pay | The `pay` step in `payout-monthly.json` has a `payout` gate before it. No `sign` step; agreements are click-through terms approved at the `contract` gates. |
| G3 claims | Creative and partner content go through the compliance check against `approved_claims`. |
| G4 replies | `route_replies` sends complaints and terms questions to `engine/escalation.raised`. |
| G5 consent | `resolve_recipients` runs before `send_outreach`. |
| G6 compliance before live | Every `send` and `write_external` step has a compliance check before it. Checked by a script on 21 Oct 2026. |
| Skip rules | Only the `creative` gate has `skip_if`, as `approval-inbox.md` §4 allows. |
