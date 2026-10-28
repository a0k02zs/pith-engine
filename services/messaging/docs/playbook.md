# Messaging strategy playbook (SMS, WhatsApp, push)

Draft 1, 21 Oct 2026. Not legal advice.

## 1. What the client buys

Pith M runs short, timely messages on the customer's phone. The service has 3 parts:

1. **Flows.** Automatic messages that an event starts, for example an abandoned cart or a booking reminder.
2. **Broadcasts.** Planned offers and news to a segment, for example a Ramadan sale.
3. **Two-way chat.** An AI agent answers replies on WhatsApp and SMS. A person takes complex items.

## 2. Channel roles

Use each channel for the job that it does best. Do not send the same message on all 3 channels.

| Channel | Best for | Do not use for | Cost | Lead markets |
|---|---|---|---|---|
| WhatsApp | Rich, two-way messages: order updates, offers with images, booking, sales follow-up, service | Long content, cold outreach (Meta bans it) | Per template message, by category and country | GCC (main channel), Singapore, UK, EU |
| SMS | Urgent, short, must-reach messages: one-time codes, reminders, flash offers, delivery alerts | Rich content, long chat | Per segment (160 GSM-7 chars or 70 Unicode chars) | US and Canada (main channel), UK, all markets as fallback |
| Push (app) | Free, high-volume nudges to app users: price drops, back in stock, streaks, content | Users without the app, legal notices | Near zero | Any client with an app |
| Web push | Re-engagement for site visitors with no app | Core flows (low opt-in on iOS Safari) | Near zero | B2C e-commerce, media |

### Channel choice rule (the "waterfall")

For each message, the orchestrator picks 1 channel in this order:

1. Push, if the contact has the app, push is on, and the message is not critical.
2. WhatsApp, if the contact has WhatsApp consent and the market is GCC, Singapore, UK or EU.
3. SMS, if the contact has SMS consent.
4. Email (Service 1), if there is no valid phone channel.

Critical messages (security codes, delivery failure) skip push and go to SMS or WhatsApp at once. If WhatsApp is not delivered in 10 minutes, send SMS as a fallback, for utility messages only.

## 3. Use cases

### B2C

| Use case | Channel | Trigger | Category |
|---|---|---|---|
| Welcome and opt-in confirm | SMS / WhatsApp | Opt-in event | Utility (confirm), then marketing |
| Abandoned cart (1 message, 1 reminder) | WhatsApp / SMS / push | `cart_abandoned` + 1 h | Marketing |
| Browse abandon | Push | `product_viewed` 2 times, no cart, 24 h | Marketing |
| Order and delivery updates | WhatsApp / SMS | `order_placed`, `order_shipped`, `out_for_delivery` | Utility |
| Back in stock / price drop | Push / WhatsApp | `stock_changed`, `price_changed` on a saved item | Marketing |
| Booking and appointment reminder | WhatsApp / SMS | Booking - 24 h and - 2 h | Utility |
| Review request | WhatsApp | `order_delivered` + 5 days | Marketing |
| Replenish | SMS / WhatsApp | Last order + product use time | Marketing |
| Win-back | SMS / WhatsApp | No order in 90 days | Marketing |
| Seasonal broadcast | Per market | Calendar (Ramadan, 11.11, Black Friday) | Marketing |

### B2B

B2B buyers do not want marketing SMS. Use these channels for service and sales speed.

| Use case | Channel | Trigger | Category |
|---|---|---|---|
| Demo and meeting reminders | SMS / WhatsApp | Meeting - 24 h and - 1 h | Utility |
| Webinar reminder and join link | SMS / WhatsApp | Event - 1 h | Utility |
| Speed to lead: "we got your request" | WhatsApp (GCC, Singapore), SMS (US) | `form_submitted`, high score | Utility |
| Sales follow-up by a named rep | WhatsApp | Rep starts it, inside a 24 h window or with a template | Marketing |
| Trial and onboarding nudges | Push / in-app | Product usage events | Marketing |
| Renewal and invoice reminders | WhatsApp / SMS | Renewal - 30 days | Utility |

## 4. Flow library

Each flow has an ID. The planner agent picks flows by ID. Workflow `03-triggered-send.yaml` runs them.

| ID | Flow | Steps | Exit when |
|---|---|---|---|
| F01 | Welcome | Confirm opt-in now. Offer or value message at + 1 day | Opt-out |
| F02 | Cart recovery | + 1 h message, + 23 h reminder (no new discount in step 2 unless approved) | Purchase, opt-out |
| F03 | Browse abandon | + 24 h push only | Cart, purchase |
| F04 | Order updates | 1 message per status change | Delivered |
| F05 | Booking reminder | - 24 h with confirm or change buttons, - 2 h | Cancelled, attended |
| F06 | Review request | + 5 days after delivery | Review left |
| F07 | Replenish | At expected run-out minus 5 days | Purchase |
| F08 | Win-back | + 90 days, + 120 days | Purchase, opt-out |
| F09 | Back in stock / price drop | On event, max 1 per item per week | Purchase |
| F10 | Speed to lead | Within 60 seconds of form submit | Rep reply |
| F11 | Meeting and webinar reminders | - 24 h, - 1 h | Event start |
| F12 | Renewal reminder | - 30, - 7, - 1 days | Renewed |
| F13 | Re-permission | Once, before consent expires or after 12 months of no clicks | Re-opt-in or sunset |

## 5. Frequency and timing rules

These are Pith defaults. A stricter rule in `market-rules.yaml` always wins.

- **Marketing SMS:** max 4 per contact per 30 days. Max 1 per day.
- **Marketing WhatsApp:** max 4 per contact per 30 days. Max 1 per day. Meta can also limit marketing messages per user.
- **Marketing push:** max 1 per day, max 5 per week.
- **Utility messages** do not count to the caps, but they must stay utility. Do not add an offer to an order update.
- **Send window:** the contact's local time, from `market-rules.yaml`. If the time zone is not known, use the time zone of the phone number country. For US and Canada numbers with no time zone, use the area code. If still not known, use the most western time zone of that country.
- **Quiet days:** follow the market rule (for example, no marketing SMS on Sundays and public holidays in France).
- **Ramadan (GCC):** move marketing sends to after Iftar (about 20:00 to 23:00 local) where the market rule allows it. Never send during prayer times for broadcasts in Saudi Arabia. Confirm the send window with the aggregator, because some telecom rules stop marketing SMS after 21:00.
- **Best time:** the optimizer agent learns the best hour per segment. It can move a send only inside the window.

## 6. Message rules

1. Name the brand at the start of every SMS. Example: "Pith Coffee: ...".
2. Every marketing SMS has an opt-out line, for example "Reply STOP to opt out". Use the local words from `market-rules.yaml`.
3. Use 1 clear call to action and 1 link. Use a branded short link domain (for example `go.clientbrand.com`). Public shorteners such as bit.ly increase carrier filtering.
4. Keep marketing SMS to 1 segment (160 GSM-7 characters) when possible. An emoji or an Arabic letter changes the encoding to Unicode, and the limit falls to 70 characters per segment.
5. Use only claims, prices and offers from the client brain approved list.
6. Personalise with first name and the product only. Never put sensitive data (health, finance, account numbers) in a message.
7. WhatsApp: write in the language of the contact. Use buttons (quick reply or URL) and not "reply 1, 2, 3" where possible.
8. Push: title max 40 characters, body max 120 characters, so iOS and Android do not cut the text.

## 7. Client onboarding (what we set up)

| Step | Owner | Time |
|---|---|---|
| Pick the provider stack (see section 8) | Pith messaging lead | Day 1 |
| Collect consent sources and check the consent records | Pith + client | Days 1 to 5 |
| Register senders: US 10DLC brand and campaign, toll-free verification, Singapore SSIR sender ID, GCC sender IDs, UK and EU alphanumeric sender IDs | Pith ops | 1 to 4 weeks, by market |
| WhatsApp Business Account, display name approval, business verification | Pith ops + client | 1 to 2 weeks |
| Load the client brain: voice, approved offers, FAQ answer list | Pith + client | Week 1 |
| Build the first 4 flows (F01, F02 or F10, F04, F13) | Agents + Pith | Week 2 |
| Test sends to seed phones in each market | Pith QA | Week 2 |
| Go live (gate G4) | Messaging lead | Week 2 to 4 |

Sender registration is the slowest step. Start it on day 1.

## 8. Provider stack

| Need | Default | Alternatives | Note |
|---|---|---|---|
| SMS and WhatsApp API | Twilio | Infobip (strong in GCC), MessageBird (Bird), Vonage | Use 1 provider per client where possible, so opt-outs stay in 1 place |
| GCC SMS | Local aggregator through Infobip or Unifonic | Twilio | GCC sender IDs need local registration. A local aggregator is often faster |
| Push and in-app | OneSignal (SMB) | Braze (enterprise), Firebase Cloud Messaging direct | Braze also does SMS and WhatsApp for enterprise clients |
| E-commerce SMS (US) | Klaviyo SMS or Attentive | Postscript (Shopify) | Use when the client already runs Klaviyo for email |
| Chat inbox for people | Twilio Flex, Respond.io or Zendesk | Intercom | Must show the full chat and the AI summary |
| Short links | Branded domain on the provider | Bitly with a custom domain | Track clicks per message |

## 9. Rollout by market

The plan puts messaging in Phase 3 (weeks 10 to 16), first in the GCC and Singapore. Inside the phase:

1. **Singapore:** WhatsApp + SMS. SSIR registration and DNC checks first.
2. **UAE, then Saudi Arabia:** WhatsApp first, SMS second (sender ID registration takes time). Arabic templates.
3. **UK:** WhatsApp for service, SMS for e-commerce flows.
4. **US and Canada:** SMS first (10DLC). Check the current Meta rule on WhatsApp marketing messages to US numbers before you plan US WhatsApp marketing.
5. **EU (Netherlands first):** WhatsApp and SMS with explicit opt-in. Germany needs double opt-in.
