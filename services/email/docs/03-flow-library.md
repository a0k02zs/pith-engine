# Email marketing: flow library

Version 0.1, 21 Oct 2026. Each flow has a code, a trigger, the emails with timing, exit rules and a goal KPI.
The copy skeletons for each email are in `templates/`. The workflow `workflows/email.flow_build.json` builds and publishes each flow.

**Rules for every flow:**
1. Entry: the contact passes `POST /audiences/resolve` for channel `email`, purpose `marketing`, and the contact's country. Order and service emails use purpose `transactional`.
2. Exit: the contact unsubscribes, complains, hard-bounces, or meets the flow goal.
3. A contact is in at most 1 promotional flow at a time. Priority order: cart abandon, browse abandon, welcome, post-purchase, win-back, others.
4. Every email checks the consent again just before the send. Consent can change while a contact waits in a flow.
5. Times are in the contact's local time zone. B2B steps move to the next local work day.

KPI codes are from the engine `contracts/enums.json`.

## B2C flows

### B2C-01 Welcome
- **Trigger:** `contact.subscribed` (new email consent) with no purchase.
- **Goal:** first purchase. KPI: `cvr`, `revenue_per_recipient`.
- **Emails:**
  1. At once: welcome, brand story in 3 lines, the promised offer if any.
  2. Day 2: best sellers or top 3 products for the persona.
  3. Day 4: social proof (reviews, UGC from the community thread).
  4. Day 7: objection handling (shipping, returns, guarantee).
  5. Day 10: offer reminder with an end date, only if the welcome offer exists.
- **Exit:** first purchase. Then go to B2C-04 Post-purchase.

### B2C-02 Browse abandon
- **Trigger:** `product.viewed` 2 or more times, or 1 view over 60 seconds, with no add to cart in 4 hours.
- **Goal:** add to cart. KPI: `ctr`, `revenue_per_recipient`.
- **Emails:**
  1. 4 hours: "Still looking?" with the viewed product and 2 related products.
  2. Day 2: reviews of the viewed product.
- **Exit:** add to cart (go to B2C-03) or purchase.
- **Limit:** 1 browse abandon flow per contact per 7 days.

### B2C-03 Cart abandon
- **Trigger:** `cart.updated` with items and no `order.placed` in 1 hour.
- **Goal:** purchase. KPI: `cvr`, `revenue`.
- **Emails:**
  1. 1 hour: cart reminder with item images and a direct link to the cart.
  2. Hour 24: reviews and answers to common questions.
  3. Hour 72: incentive, only if the client brain allows one for this margin level. No incentive for contacts who used one in the last 90 days.
- **Exit:** purchase.

### B2C-04 Post-purchase
- **Trigger:** `order.placed` (first or repeat).
- **Goal:** second purchase and a review. KPI: `revenue_per_recipient`, `review_count`.
- **Emails:**
  1. Day 1: thank you and what happens next (not the order receipt; the platform sends that).
  2. Delivery + 3 days: how to get the best use of the product.
  3. Delivery + 10 days: review request (through the community and UGC thread's review rules: no gating).
  4. Day 30: cross-sell for the next product.
- **Exit:** next purchase starts a new post-purchase flow.

### B2C-05 Win-back
- **Trigger:** customer enters segment "At risk" (no purchase in 1.5 times their normal buy cycle; default 90 days).
- **Goal:** return purchase. KPI: `cvr`, `revenue`.
- **Emails:**
  1. Day 0: "What is new" since the last purchase.
  2. Day 7: personal recommendation.
  3. Day 14: offer, if the client brain allows one.
- **Exit:** purchase. No purchase and no click in 30 days: go to SHARED-02 Sunset.

### B2C-06 Replenish
- **Trigger:** product with a known use period (from the client brain), at 80% of the period after delivery.
- **Goal:** re-order. KPI: `cvr`.
- **Emails:**
  1. At 80% of the use period: "Time to re-order" with a 1-click re-order link.
  2. At 100% of the use period: reminder.
- **Exit:** re-order.

### B2C-07 Birthday
- **Trigger:** 7 days before the birthday field, if the contact gave it.
- **Goal:** purchase. KPI: `cvr`.
- **Emails:**
  1. Day -7: birthday gift or offer.
  2. Day -1: reminder, only if no click.

## B2B flows

### B2B-01 Lead magnet nurture
- **Trigger:** `form.submitted` for a gated asset (whitepaper, report, guide).
- **Goal:** MQL, then meeting booked. KPI: `mqls`, `meetings_booked`.
- **Emails:**
  1. At once: deliver the asset and 1 line on why it matters.
  2. Day 3: 1 key insight from the asset, plus a related case study.
  3. Day 7: a problem-to-solution email for the persona.
  4. Day 12: proof (customer result with numbers).
  5. Day 18: soft call to action: book a short call, or a webinar invite from the events thread.
- **Exit:** lead score crosses the MQL threshold (the CRM thread owns the score), a meeting is booked, or the contact replies. A reply goes to sales and stops the flow.

### B2B-02 Demo no-show
- **Trigger:** `meeting.no_show` for a demo.
- **Goal:** rebooked demo. KPI: `meetings_booked`.
- **Emails:**
  1. 1 hour: "Sorry we missed you" with a booking link.
  2. Day 2: 2-minute recorded demo video and a booking link.
  3. Day 7: last note from the sales rep (plain text, from the rep's name).
- **Exit:** a new meeting is booked, or a reply.

### B2B-03 Trial onboarding
- **Trigger:** `trial.started`.
- **Goal:** activation event, then paid conversion. KPI: `cvr`, `conversions`.
- **Emails:**
  1. At once: welcome and the 1 first step to value.
  2. Day 1: how to do the activation event, if it has not happened.
  3. Day 3: use case for the persona.
  4. Day 7: customer story.
  5. 3 days before trial end: what you lose, and the plan options.
  6. Trial end day: last reminder, and a sales contact.
- **Branch:** if the activation event happens, skip email 2 and send the next step instead.
- **Exit:** paid conversion.

### B2B-04 Closed-lost re-engage
- **Trigger:** deal stage changes to `closed_lost`, then wait 90 days.
- **Goal:** new opportunity. KPI: `opportunities`.
- **Emails:**
  1. Day 90: what is new in the product that relates to the loss reason in the CRM.
  2. Day 120: industry insight or report.
  3. Day 150: invite to a short call.
- **Exit:** a new opportunity, or a reply.
- **Rule:** the account owner can stop this flow for any account.

### B2B-05 Account-based sequence
- **Trigger:** the ABM thread adds the account to a tier 1 or tier 2 list.
- **Goal:** engaged account, then opportunity. KPI: `opportunities`, `pipeline_value`.
- **Emails:** 3 to 5 personal emails per contact in the buying committee, in time with LinkedIn ads and sales touches from the ABM plan.
- **Rule:** the account owner approves every tier 1 email (approval kind `copy`).

## Shared flows (B2C and B2B)

### SHARED-01 Newsletter
- **Cadence:** weekly or every 2 weeks, set in the monthly plan.
- **Content:** 1 lead story from the content thread, 2 or 3 short items, 1 offer or call to action.
- **KPI:** `ctr`, `revenue_per_recipient`, `opt_out_rate`.

### SHARED-02 Sunset
- **Trigger:** no click in 180 days (B2C) or 270 days (B2B), and no purchase or meeting in that time.
- **Emails:**
  1. Day 0: "Do you still want to hear from us?" with a 1-click "Yes, keep me" button.
  2. Day 7: last email.
- **Exit and action:** a click on "Yes" resets the timer. No click: the contact gets the `suppressed_inactive` flag. The contact is not deleted. Deletion follows the engine data retention rules.

### SHARED-03 Re-permission
- **Trigger:** a list import or migration where the consent record is missing or old, or a market change (for example the EU) that needs fresh consent.
- **Rule:** this flow sends only where the law allows 1 request email. In Canada and the EU, no email goes to a contact with no valid basis. Use other channels there.
- **Emails:**
  1. Day 0: ask for consent, with the benefits and a clear opt-in button.
  2. Day 5: reminder.
- **Exit:** opt-in sets consent `granted` with basis `consent` (or `double_opt_in` after confirmation). No opt-in: suppress.

## B2B outbound

### OUT-01 Cold sequence
- **Who:** contacts from the ABM thread or from Apollo, in markets where `cold_outbound_allowed` is `true` in `config/market-rules.json`.
- **Domains:** separate outbound domains, never the brand domain. Maximum 50 sends per mailbox per day.
- **Steps:**
  1. Day 0: short personal email (under 100 words) with 1 relevant reason to talk.
  2. Day 3: a new point of value (insight, short case result).
  3. Day 7: a different angle for a different pain.
  4. Day 14: a polite last note.
- **Stop at once:** any reply, unsubscribe, bounce, or "not interested". The reply triage agent sorts each reply.
- **Approval:** the list and the sequence get approval kind `plan` before the first send. In the UK, the legitimate interest assessment is attached to the approval.
- **KPI:** `reply_rate`, `meetings_booked`, `bounce_rate`, `opt_out_rate`.
