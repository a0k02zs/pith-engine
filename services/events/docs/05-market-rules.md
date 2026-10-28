# Service 16: Events and webinars — Market rules

Version 1, 21 Oct 2026. Markets and launch order come from the plan: UK, Singapore, North America (US and Canada), GCC (UAE and Saudi Arabia first), EU (1 or 2 lead countries, for example the Netherlands).

**This is a planning summary, not legal advice.** A local lawyer confirms each market before launch, as the plan says. The engine compliance gate (`engine/specs/compliance-rules.json`) is the rule that runs. This file adds only the rules that are special to events.

## 1. Session times

Run 1 session for each region. Tuesday to Thursday is best in all markets except the GCC (see below). Times are local.

| Market | Best slots | Notes |
|---|---|---|
| UK | 10:00 or 14:00 UK time | 14:00 UK also works for the EU (15:00 CET). |
| Singapore | 10:00 or 15:00 SGT (UTC+8) | 15:00 SGT also reaches India, Malaysia, Hong Kong and Australia (east coast is evening). |
| US | 11:00 ET (08:00 PT) or 13:00 ET (10:00 PT) | 1 session covers all 6 US and Canadian time zones. Hawaii and Alaska are early. |
| Canada | Same as US | Quebec: a French session or French captions and French emails. |
| GCC | 11:00 Gulf time (UTC+4) = 10:00 Riyadh, Doha, Kuwait, Bahrain (UTC+3) | Use Monday to Thursday. The UAE weekend is Saturday and Sunday; the other 5 countries have Friday and Saturday. Avoid prayer times. In Ramadan, work hours are shorter: run sessions mid-morning or after iftar (about 21:00 local). |
| EU | 10:00 or 14:00 CET | Lead country language first (for example Dutch-market sessions can be in English for B2B). German, French and Spanish B2C sessions need native speakers. |

A session that serves UK and EU together: 14:00 UK / 15:00 CET. A session that serves UK and US East together: 16:00 UK / 11:00 ET. Do not try to serve Singapore and the US in 1 live session; use the replay.

## 2. Consent and data rules for events

| Market | Registration form | Follow-up after the event | Badge scans at a trade show | Sharing data with a co-host or sponsor | SMS or WhatsApp reminders |
|---|---|---|---|---|---|
| UK | Privacy notice. Marketing consent box not ticked. "Recorded" notice. | Event emails (recording, slides) are part of the service. Marketing to a personal address needs consent or soft opt-in. Corporate addresses: identity and opt-out (PECR). | A scan is not consent. B2B follow-up to a corporate address can use legitimate interest, with a privacy notice at the booth. | Name the partner on the form. Separate box, not ticked. | Consent for the channel. |
| Singapore | PDPA purpose notice. Consent for marketing. | Follow-up for the purpose that was notified. Marketing email in bulk: "<ADV>" label, sender details, unsubscribe (Spam Control Act). | Tell the person the purpose at the scan. | Consent to disclose to the partner. | Check the Do Not Call Registry for Singapore numbers before any marketing SMS or call. |
| US | Privacy notice. For California residents, a notice at collection (CCPA/CPRA). | Email is allowed (CAN-SPAM opt-out): honest subject, postal address, opt-out done within 10 business days. | Follow-up allowed under CAN-SPAM. | Disclose in the privacy notice. Honour opt-outs and Global Privacy Control for "sale or share". | Prior express written consent (TCPA). Registered 10DLC sender. |
| Canada | Ask for express consent on the form (box not ticked). | A registration counts as an inquiry: implied consent under CASL lasts about 6 months. Express consent on the form keeps the contact longer. Sender identity and unsubscribe in every message. Quebec: in French. | Ask the consent question in the lead app. Without consent, follow up only on what the person asked for, inside the implied-consent rules. | Consent to share (PIPEDA; Quebec Law 25). | Express consent (CASL). |
| GCC | Privacy notice under the local PDPL. English and Arabic. | Follow the purpose notified. Use WhatsApp for follow-up where the person gave consent; it is the main channel. | Ask the consent question in the lead app. | Consent to share. Saudi Arabia: check rules before moving personal data out of the country. | Registered sender ID; send-time limits set by each telecom regulator. |
| EU | Privacy notice. Marketing consent box not ticked. Germany: double opt-in. Third-party lists: Article 14 notice. | Event emails are part of the service. Marketing needs opt-in in most countries. | A scan is not consent. Ask the consent question in the lead app, especially in Germany. | Name the partner. Separate box, not ticked. Joint-controller terms with the partner. | Consent for the channel. |

### Rules for all markets

- **Recording.** Tell attendees at registration and at the start that the session is recorded. Attendee cameras and microphones are off by default. Do not publish attendee names, faces or questions with names without consent.
- **AI in the session.** If an AI assistant answers attendees directly, or an AI avatar presents, say so. The EU AI Act Article 50 requires this (applies from 2 August 2026). Label AI-generated clips where the platform or the market requires it.
- **Biometrics.** No face recognition check-in. It needs explicit consent in the EU and UK (special category data) and written consent under laws such as Illinois BIPA.
- **Accessibility.** Live captions on every session. Slides with readable contrast. Replay with captions. The European Accessibility Act and the ADA set the expectations.
- **Gifts and hospitality.** Dinners, gifts and travel for attendees from government or state-linked bodies need a person to check the anti-bribery rules (UK Bribery Act, US FCPA, local laws). This applies a lot in the GCC, where many buyers are government-linked.
- **Prize draws.** A draw for attendees needs terms and conditions that follow local rules. A person approves them.

## 3. Calendar: dates to avoid and key shows

### Dates to avoid for live sessions

| Market | Avoid |
|---|---|
| UK | Late December to 2 January, August (low B2B attendance), bank holidays. |
| Singapore | Chinese New Year week, Hari Raya Puasa, Deepavali, the week of the Formula 1 race (September) for central-city field events. |
| US and Canada | Thanksgiving week (US late November; Canada mid-October), July 4 week, late December. |
| GCC | Eid al-Fitr and Eid al-Adha weeks (dates move each year), national days, summer (July and August, many people travel). Ramadan: change times, not always avoid. |
| EU | August (most of the EU), Christmas to 6 January, national holidays in each lead country. |

### Key trade shows (typical month; verify dates each year)

| Market | Shows |
|---|---|
| UK | London Tech Week (June), Big Data LDN (September), DTX London (October), Retail Technology Show (April) |
| Singapore | Asia Tech x Singapore (May), Singapore FinTech Festival (November), SuperAI (June) |
| US | CES (January, Las Vegas), SaaStr Annual (US, verify date), Dreamforce (San Francisco, autumn), INBOUND (autumn) |
| Canada | Web Summit Vancouver (May), Collision-type tech and industry shows in Toronto (verify) |
| GCC | LEAP (Riyadh, February), Web Summit Qatar (Doha, February), Gulfood (Dubai, February), GITEX Global (Dubai, October), World Health Expo Dubai (formerly Arab Health, January or February) |
| EU | Web Summit (Lisbon, November), VivaTech (Paris, June), DMEXCO (Cologne, September), Slush (Helsinki, November), TNW Conference (Amsterdam, June) |

The plan names GITEX and LEAP (GCC), Web Summit (EU), SaaStr and CES (US). The others are additions from this build. The `ev-trade-show-planner` agent uses only dates and costs from its input, so a person or a research tool confirms each show before the plan gate.

## 4. Localization

| Market | Language and format | Tone in sessions |
|---|---|---|
| UK | British English. Dates DD/MM/YYYY. GBP. | Direct and low-hype. Data and customer stories. |
| Singapore | English. Mandarin, Malay or Tamil for some B2C audiences. DD/MM/YYYY. SGD. | Practical and value-led. Clear outcomes. |
| US | US English. MM/DD/YYYY. USD. | Confident and benefit-first, with proof. |
| Canada | Canadian English. French for Quebec. CAD. | As US, with less hype. |
| GCC | English for most B2B. Gulf Arabic for B2C and government-linked buyers; live Arabic interpretation for flagship events. 6 currencies. | Respectful, premium, relationship-first. Senior speakers matter. Saudi Arabia is more conservative. |
| EU | Lead country language. EUR. DD/MM/YYYY or DD.MM.YYYY. | Factual and precise. No US-style hype. |

## 5. Field events in the GCC

Field events (dinners, majlis-style roundtables, breakfasts) work better than cold email in the GCC (plan, ABM market notes). Rules:

- Check if the venue or the organiser needs an event permit from the local authority (for example Dubai Department of Economy and Tourism, or the Saudi conventions and exhibitions authority). A person does this at the contract gate.
- No alcohol at events for Saudi audiences. Offer halal food and alcohol-free options in all 6 countries.
- Plan breaks for prayer times. In Ramadan, an iftar or suhoor gathering is a strong format.
- Use formal invitations from a senior person at the client. Follow up on WhatsApp where the person gave consent.
