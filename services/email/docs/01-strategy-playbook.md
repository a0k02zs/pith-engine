# Email marketing: strategy playbook

Service 1 of the Pith M plan. Version 0.1, 21 Oct 2026. Owner: the "Email marketing" thread.
Source: [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67), section "Service 1 · Email marketing".
Engine: builds on the shared engine contracts v0.1.0 in `engine/` in this repository (codes from `contracts/enums.json`).

## 1. What the client buys

Email marketing grows revenue per contact with flows that run without daily work.

| Client type | Main job | What we ship |
|---|---|---|
| B2C (e-commerce, subscriptions, consumer services) | Lifecycle revenue and promotions | 7 lifecycle flows, a monthly campaign calendar, a newsletter |
| B2B (SaaS, services, industrial) | Nurture leads and hand them to sales | 5 nurture flows, outbound sequences, a newsletter |
| Both | List health and deliverability | Sunset flow, re-permission flow, domain setup, monthly health report |

## 2. Service packages

These are planning packages. Pith sets the prices.

| Package | Scope | Flows at launch | Campaign sends per month | Markets |
|---|---|---|---|---|
| Starter | 1 brand, 1 email platform | 4 core flows | Up to 4 | 1 |
| Growth | 1 brand, flows plus campaigns, A/B tests | All core flows for the client type | Up to 12 | Up to 2 |
| Scale | Multi-brand or multi-market, B2B outbound included | All flows, plus custom flows | Up to 30 | Up to 5 |

## 3. Strategy in 6 rules

1. **Flows first, campaigns second.** Flows earn money every day with no new work. We build the flows in the first 30 days. Campaigns start after the welcome and abandon flows are live.
2. **Consent decides who gets an email.** The engine `POST /audiences/resolve` returns only contacts with a valid email consent for their country. The service never reads contacts directly from a CRM.
3. **Measure clicks and revenue, not opens.** Apple Mail Privacy Protection makes opens unreliable. We use opens only as a deliverability signal, never as a test winner.
4. **Protect the sender reputation.** One bad send can damage every flow. Each send stays under the complaint and bounce limits in section 7, or the workflow stops.
5. **Write for one person.** Every email has 1 reader persona, 1 goal and 1 main call to action.
6. **Learn from every send.** The result of each test goes back to the client brain. The next draft uses the result.

## 4. The pipeline

This is the pipeline from the plan, with engine calls added. Steps marked GATE stop and wait for a person.

| # | Step | Who does it | Engine call |
|---|---|---|---|
| 1 | Ingest: sync contacts, events and consent | Engine data layer | `POST /audiences/resolve` (channel `email`) |
| 2 | Segment by lifecycle stage, value and intent | Segment agent | Reads events; writes segment definitions |
| 3 | Plan the monthly calendar and flow changes | Planner agent | `GET /clients/{id}/brain` |
| 4 | GATE: approve the plan | Account lead (Pith) | Approval kind `calendar` |
| 5 | Write 3 subject lines and 2 bodies per send | Copywriter agent | `GET /clients/{id}/brain` |
| 6 | Check: brand score, spam score, links, compliance | QA agent and engine | `POST /compliance/check` |
| 7 | GATE: approve copy (new templates and new claims only) | Client | Approval kind `copy` |
| 8 | Send the A/B test, then the winner at the best local time | Send workflow | Email platform API |
| 9 | Learn: write results back to the client brain | Reporter agent | `engine/metric.recorded` events |

The full gate list is in `05-approvals-and-kpis.md`.

## 5. Segments we build for every client

The segment agent builds these on day 1. It can propose more.

| Segment | Rule (default) | B2C | B2B |
|---|---|---|---|
| New | Joined in the last 30 days, no purchase or no meeting | Yes | Yes |
| Engaged | Clicked in the last 90 days | Yes | Yes |
| Customers, 1 order | 1 purchase | Yes | No |
| Repeat customers | 2 or more purchases | Yes | No |
| VIP | Top 10% by 12-month revenue | Yes | No |
| At risk | Customer with no purchase in 1.5 times their normal buy cycle | Yes | No |
| Lapsed | No click and no purchase in 180 days | Yes | Yes |
| Marketing-qualified lead (MQL) | Lead score at or above the client threshold | No | Yes |
| Open opportunity | Has an open deal in the CRM | No | Yes (suppress from promotions) |
| Customer accounts | Company is a paying customer | No | Yes |
| By market | Country from the contact record | Yes | Yes |
| By language | Language from the contact record | Yes | Yes |

The marketing automation and CRM thread owns lead scoring. This service reads the score. It does not calculate it.

## 6. Flow library

The full specs (trigger, timing, exit rules) are in `03-flow-library.md`. The copy skeletons are in `templates/`.

**B2C flows:** welcome, browse abandon, cart abandon, post-purchase, win-back, replenish, birthday.
**B2B flows:** lead magnet nurture, demo no-show, trial onboarding, closed-lost re-engage, account-based sequence.
**Both:** newsletter, sunset of inactive contacts, re-permission.
**B2B outbound:** a cold sequence of 4 steps, only in markets where the rules allow it (see `02-market-rules.md`).

### Flow build order

1. Welcome (B2C) or lead magnet nurture (B2B).
2. Cart abandon and browse abandon (B2C) or demo no-show (B2B).
3. Post-purchase (B2C) or trial onboarding (B2B).
4. Sunset and re-permission (both). This protects the sender reputation before campaign volume grows.
5. Win-back, replenish, birthday (B2C) or closed-lost re-engage (B2B).
6. Account-based sequences, with the ABM thread.

## 7. Deliverability standard

Every client domain meets this standard before the first send. The send workflow checks it every day.

**Domain setup (before go-live):**
- SPF, DKIM and DMARC on the sending domain. Start DMARC at `p=none` with reports, then move to `p=quarantine` after 30 clean days.
- A sending subdomain for marketing (for example `mail.client.com`), separate from the domain staff use for daily mail.
- One-click unsubscribe with the `List-Unsubscribe` and `List-Unsubscribe-Post` headers (RFC 8058). Gmail and Yahoo require this for bulk senders.
- A real reply-to address that a person reads.
- For B2B outbound: separate domains for cold email, never the main brand domain.

**Warm-up for a new domain or IP:** start with the most engaged contacts. Grow volume by about 50% per day while the complaint rate stays under 0.1%.

**Hard limits (the workflow stops the send when a limit is crossed):**

| Metric | Target | Stop the send at |
|---|---|---|
| Spam complaint rate | Under 0.1% | 0.3% (Gmail limit for bulk senders) |
| Hard bounce rate | Under 1% | 2% |
| Unsubscribe rate per send | Under 0.3% | 1% |
| Unsubscribe processing | Within 1 day | 2 days (Gmail and Yahoo rule) |

These limits come from the Gmail and Yahoo bulk sender rules of February 2024 and the plan. A stopped send goes to a person through approval kind `escalation`.

## 8. Testing rules

- Test 1 variable at a time: subject line, offer, call to action, send time or layout.
- A test needs at least 1,000 recipients per variant, or the agent runs it across several sends and pools the results.
- The winner metric is click rate for content tests and revenue per recipient for offer tests. Never open rate.
- The agent picks a winner only at 95% confidence. If no variant wins, the control stays.
- Every result goes to the client brain as a "learning" with the date, segment, market and size.

## 9. Send time and frequency

- Send at the best local time of each contact. Default before data exists: 10:00 local time on a weekday for B2B, 19:00 local time for B2C.
- GCC: use the local work week. The weekend is Saturday and Sunday in the UAE, and Friday and Saturday in Saudi Arabia, Qatar, Kuwait, Bahrain and Oman. In Ramadan, B2C sends move to after iftar (evening).
- Frequency cap (default): 1 campaign email per contact per day and 4 per week. Flow emails count toward the weekly cap, except order and service emails.
- A contact in an active flow does not get a promotional campaign on the same day.

## 10. What the service needs from other threads

| Need | From |
|---|---|
| Contacts with consent, brand store, approvals, compliance gate, metrics | Shared marketing engine |
| Lead score, lifecycle stages, CRM sync | Marketing automation and CRM |
| Long-form content to repurpose in emails and newsletters | Content marketing |
| Target account lists and buying committee contacts | Account-based marketing |
| Landing pages for email traffic | CRO and landing pages |
| Webinar follow-up content | Events and webinars |
| Campaign master briefs | Multi-channel campaigns |

## 11. Not legal advice

The market rules in this folder are a planning summary from the plan. A local lawyer confirms each market before launch.
