# Multi-channel Campaigns: Strategy Playbook

Service 2 of the Pith M Automation Plan. Owner: Head of Growth. Status: v1, 21 Oct 2026.

## 1. What this service is

A campaign is 1 idea, 1 brief, 1 budget and 1 report across many channels. The campaign service does not make channel assets itself. It is the orchestrator. It sends 1 master brief to each channel service and joins the results.

| Channel service | What it gives the campaign |
|---|---|
| 1 Email | Launch sends, nurture flow, post-campaign follow-up |
| 3 Video | Hero video, 9:16 / 1:1 / 16:9 cut-downs, hooks for test |
| 4 Social | Organic posts, community replies during the push |
| 5 SEO / SEM / GEO | Paid search, landing-page SEO, AI-answer content |
| 6 Influencer | Creator posts, codes, whitelisted creator ads |
| 8 ABM (B2B) | Tier 1 and tier 2 account plays |
| 10 SMS / WhatsApp | Reminders, offer drops, two-way chat |
| 11 Paid social | Meta, LinkedIn, TikTok, Snapchat ads |
| 17 CRO | Campaign landing page and A/B tests |
| 12 Analytics | Tracking plan, holdout, dashboards |

The shared engine (client brain, data layer, orchestrator, approval inbox, compliance gate, measurement) is built by the "Shared marketing engine" thread. This service only calls it. See `workflows/contracts.md`.

## 2. Campaign types

| Type | Typical length | B2B / B2C | Main goal | Default channel mix (share of paid budget) |
|---|---|---|---|---|
| Product launch | 4 to 8 weeks | Both | Awareness then sales | Paid social 40%, search 25%, video ads 20%, influencer 15% |
| Seasonal / promo push | 1 to 3 weeks | B2C | Sales | Paid social 45%, search 30%, influencer 15%, SMS/retarget 10% |
| Demand generation | 6 to 12 weeks | B2B | Pipeline | LinkedIn 50%, search 30%, content syndication 20% |
| Event-led | 4 to 6 weeks | B2B | Registrations, then meetings | LinkedIn 45%, email (no spend), search 25%, retargeting 30% |
| Brand awareness | 6 to 12 weeks | Both | Reach and recall | Video 50%, paid social 35%, influencer 15% |
| Market entry | 8 to 12 weeks | Both | First customers in a new market | Search 35%, paid social 35%, influencer or events 30% |

These splits are starting points. The strategy agent changes them from the client's past results and market rules (section 6). They are planning estimates, not measured data.

## 3. Budget rules

1. **70 / 20 / 10.** 70% of paid budget goes to proven channels, 20% to promising channels, 10% to tests.
2. **Test reserve.** Hold 15% of the budget for the first 7 days. Release it to winners on day 8.
3. **Minimum per channel.** Do not open a paid channel with less than 15% of the budget or less than about 50 expected conversions in the flight. Below that, the channel cannot learn.
4. **Holdout.** Keep a 10% geographic or audience holdout on campaigns over 20,000 USD (or local equivalent) to measure incremental lift.
5. **Agent limits.** The optimizer agent can move up to 20% of a channel's daily budget per day. It cannot raise the total budget. A move over 20%, a new channel, or a new country needs a person (gate G5).
6. **Auto-pause.** Pause an ad set when CPA is 50% over target for 3 days in a row, or when daily spend is 2 times the plan.

## 4. Lifecycle (9 stages, 7 gates)

| # | Stage | Who does it | Gate | Target time |
|---|---|---|---|---|
| 1 | Brief intake | Client form, intake agent checks gaps | G1 Brief accepted | Day 0 to 1 |
| 2 | Research | Research agent | none | Day 1 to 2 |
| 3 | Strategy and concepts | Strategy agent writes 3 concepts | G2 Concept and budget | Day 2 to 4 |
| 4 | Master brief and channel briefs | Brief agent splits the master brief | none | Day 4 |
| 5 | Asset build | Each channel service | G3 Creative and claims (inside each channel) | Day 4 to 8 |
| 6 | Tracking set-up | Tracking agent with Service 12 | none | Day 6 to 8 |
| 7 | Launch check | QA agent, then a person | G4 Go-live | Day 9 to 10 |
| 8 | Run and optimize | Optimizer agent, daily | G5 Budget change; G6 Crisis | Flight |
| 9 | Report and learn | Report agent | G7 Final report review | Flight end + 5 days |

Target: 10 working days from brief to launch. Full gate detail is in `approvals.md`.

## 5. Phased flight

Each campaign runs in 3 phases:

1. **Tease (about 20% of flight).** Organic social, email to warm lists, influencer seeding, ABM warm-up. Little paid spend.
2. **Launch (about 40%).** All channels live. Paid reaches full budget. Creator posts go live in the first 72 hours.
3. **Sustain and close (about 40%).** Budget follows winners. Retargeting, reminders, SMS/WhatsApp last-chance messages, sales follow-up.

## 6. Market rules (summary)

Full rules are in `markets.md`. The compliance gate applies the rules for the country of each contact and each ad target.

| Market | Lead channels | Must-do before launch |
|---|---|---|
| United Kingdom (launch 1st) | B2B: LinkedIn, email, Google. B2C: Instagram, TikTok, Meta, Google Shopping | PECR consent or soft opt-in, "Ad" label on creator posts, cookie consent |
| Singapore (2nd) | LinkedIn, Instagram, Facebook, TikTok, WhatsApp, Shopee/Lazada | DNC Registry check for SMS, "<ADV>" label for bulk email, PDPA notice |
| North America (3rd) | LinkedIn, Google, Microsoft Ads, Meta, TikTok (check status), Pinterest, Reddit | CAN-SPAM postal address, TCPA consent for SMS, CASL consent in Canada, French for Quebec |
| GCC (4th, UAE and Saudi first) | WhatsApp, Instagram, Snapchat, TikTok, X (Saudi, Kuwait), LinkedIn, events | Arabic versions, creator licences (UAE permit, Saudi Mawthooq), Ramadan calendar, Saudi data-transfer check |
| EU (5th, 1 or 2 lead countries) | LinkedIn, Google, Meta, Instagram, WhatsApp; XING in DACH | GDPR lawful basis, opt-in, cookie consent, AI Act Art. 50 labels, DSA ad transparency |

This summary is not legal advice. A local lawyer confirms each market before the first launch there.

## 7. Multi-market campaigns

1. Launch in 1 market first. Add 1 market at a time after 7 days of clean data.
2. Each market gets its own budget line, its own KPI targets and its own holdout.
3. Localize, do not translate. A native editor checks each language. Quebec French and Gulf Arabic need native writers.
4. Use local key dates (see `markets.md`). Do not launch in the GCC in the last 10 days of Ramadan unless the campaign is for Eid.

## 8. What the agents never do alone

From the plan's governance section, applied to campaigns:

- Raise the total budget, start a new paid channel or open a new country.
- Publish a new claim, price, or health, finance or legal statement.
- Sign a creator contract or pay a creator.
- Reply to a complaint, journalist or regulator.
- Send to a contact with no consent record for their country.
