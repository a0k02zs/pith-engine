# Service 16: Events and webinars — Strategy playbook

Owner: events lead (Pith M). Version 1, 21 Oct 2026.
Source: [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67), section "Events and webinars".
Automation target at launch: about 60% of steps (plan estimate, not measured data).

## 1. Goal

Run webinars, virtual events and trade show programmes that create qualified leads. Follow up with every person within 24 hours of the event end. Turn every recording into content for other channels.

The service is mainly a B2B pipeline driver. B2C clients use it for product launches, live shopping, masterclasses and community events.

## 2. What the client buys

| Line | Definition | Main result |
|---|---|---|
| Webinar | 1 live online session, 30 to 60 minutes, 1 to 3 speakers, live Q&A. | Registrations, attendees, sales-qualified leads (SQLs). |
| Webinar series | 3 to 6 webinars on 1 theme, 1 per month, 1 shared registration page. | Repeat attendees, nurtured pipeline. |
| Virtual event | A half-day or full-day online event with several tracks, sponsors and networking. | Leads at scale, sponsor revenue for the client. |
| Trade show programme | Pre-show outreach, booth content, lead capture and post-show follow-up for a show where the client exhibits. Pith does not build booths. | Booked meetings, booth leads, pipeline. |
| Field event | A roundtable, executive dinner or breakfast for 10 to 30 target accounts. | Meetings with buying committees of target accounts. |

## 3. Packages

| Package | For | Scope | Markets |
|---|---|---|---|
| Webinar Starter | Small B2B or B2C | 1 webinar per month, registration page, promotion through email and social, 24-hour follow-up, 3 clips, monthly report | 1 |
| Pipeline Webinars | Mid-size B2B | Webinar series, paid promotion (through Service 11), ABM invites for target accounts (through Service 8), hot-lead hand-off to sales, repurpose into blog and email series, pipeline report at day 30 and day 90 | Up to 2, with a session per region |
| Events Programme | Multi-country | Pipeline Webinars plus 1 virtual event per half-year, 2 to 4 trade shows per year, field events, a session per region in each market, localized follow-up | 3 to 5 |

Pith sets the price per package. The client pays platform licences, booth space, venue and paid media direct to the supplier. Pith never holds client media or venue money. A person signs every venue, booth and speaker contract (governance rule).

## 4. B2B and B2C focus

| Topic | B2B | B2C |
|---|---|---|
| Format | Expert panel, how-to, customer story, product demo, research launch | Live demo, masterclass, launch event, live shopping, community Q&A |
| Promotion | Email to the opted-in base, LinkedIn organic and ads, ABM invites, partner co-promotion, sales personal invites | Instagram, TikTok and YouTube live, creators (through Service 6), email and WhatsApp to opted-in customers |
| Success measure | SQLs, meetings booked, pipeline value, influenced revenue | Live sales, conversion rate, revenue per attendee, new subscribers |
| Follow-up | Sales brief for hot accounts, nurture for the rest | Offer valid for 48 hours, cart reminder, replay link |
| Main platforms | Zoom Webinars, Livestorm, ON24, Goldcast | YouTube Live, Instagram Live, TikTok LIVE, Livestorm |

## 5. Our model: 5 rules

1. **One topic, one buyer problem.** An agent picks topics from the questions that buyers ask sales, from search data and from top content. A topic that does not match a real buyer problem gets no slot.
2. **Region-first scheduling.** Each market gets a session at a good local time. 1 global session at 1 time fails at least 2 of our 5 markets. See `05-market-rules.md`.
3. **Follow-up is designed before the event.** The follow-up emails, the scoring rule and the sales brief format are approved before the event day. After the event, the agent only fills in personal details. This is how we keep the 24-hour promise.
4. **Speed to sales.** A hot attendee goes to sales within 4 business hours of the event end. Sales accepts or rejects each lead, and the reason goes back to the scoring rule.
5. **Every event is 10 assets.** The recording becomes clips, a blog post, an email series, social posts and a sales one-pager, through Services 3, 7, 1 and 4.

## 6. Engagement score (default)

The score ranks each registrant from 0 to 100 after the event. The client can change the weights at the plan gate.

| Signal | Points |
|---|---|
| Attended live | 20 |
| Watch time as a share of the session (live or on demand) | up to 25 (25 × share) |
| Asked a question | 15 |
| Answered 1 or more polls | 5 |
| Clicked a resource or a call to action in the session | 10 |
| Asked for a demo, a meeting or a price in a question, a poll or the chat | 25 (hand-raise) |

Cap the total at 100. A record with a hand-raise is always hot.

**Fit** comes from the CRM: A (ideal customer profile match), B (partial), C (no match). An ABM target account (Service 8) is always fit A.

| Segment | Rule | Next step |
|---|---|---|
| Hot | Score 60 or more and fit A or B, or any hand-raise | Sales hand-off within 4 business hours, personal follow-up |
| Engaged | Attended, but not hot | Segment follow-up, nurture flow (Service 1) |
| No-show | Registered, did not attend | Replay link and 1 reminder to watch |
| On demand | Registered after the event, watched the replay | Score again after 7 days |

## 7. Where this service connects

| Service | What it gives events | What events gives it |
|---|---|---|
| 1 Email | Invites, reminders, follow-up sends | New opted-in contacts, nurture triggers |
| 3 Video | Clips, captions, dubbing | Recordings as raw material |
| 4 Social | Organic promotion, live posts | Clips and quotes |
| 7 Content | Topic data, blog post from the transcript | Expert interviews (the speakers) |
| 8 ABM | Target account list, invites to tier 1 accounts | Engagement data per account |
| 9 CRM ops | Lead routing, lifecycle stages | Attendance and score fields |
| 10 Messaging | SMS and WhatsApp reminders (GCC, Singapore) | — |
| 11 Paid social | Paid promotion | Registration conversion data |
| 12 Analytics | Attribution, pipeline influence | Event metrics |
| 17 CRO | Registration page and tests | Registration page traffic |

## 8. What the agents never do alone

These come from the plan's governance rules, and from risks that are special to events:

- Sign a venue, booth, platform or speaker contract, or pay a speaker.
- Start paid promotion or raise the event budget.
- Answer a question live in the session with a new claim, a price, or a health, finance or legal statement.
- Reply to a complaint, a journalist or a regulator in the chat or by email.
- Send a follow-up to a contact with no consent record for the country (the engine blocks this).
- Share a registrant list with a co-host, sponsor or partner. A person checks the consent first.
- Offer a gift or hospitality to a government-linked buyer. A person checks the anti-bribery rules first.
- Use face recognition or other biometric check-in.
