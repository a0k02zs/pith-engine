# Service 16: Events and webinars — Templates

Version 1, 21 Oct 2026. Text in `{{double braces}}` is a merge field. Text in `[brackets]` is a note for the person who fills the template.

## 1. Event brief (intake form)

| Field | Answer |
|---|---|
| Client | |
| Event type | Webinar / webinar series / virtual event / trade show / field event |
| Business goal | [for example: 40 SQLs, 15 meetings, 200 live buyers] |
| Audience | [roles, industries, company size; B2C: persona] |
| Markets | UK / SG / US / CA / GCC (which countries) / EU (which countries) |
| Preferred dates | [avoid the dates in `05-market-rules.md` §3] |
| Speakers | [names, roles; internal or customer or partner] |
| Co-host, sponsor or partner | [name; will they get registrant data? yes or no] |
| Call to action | [demo / trial / download / buy / meeting] |
| Budget | Platform: / Paid promotion: / Speaker fees: / Booth or venue: |
| Regulated topic? | No / Yes: health, finance, legal, other |
| Languages | |
| Sales owner | [name, who accepts the hot leads] |

## 2. Registration form fields

Always: first name, last name, work email (B2B) or email (B2C), company (B2B), job title (B2B), country.

Optional (max 2): company size, 1 qualifying question (for example "What is your main challenge with {{topic}}?").

The engine adds the consent block from the country answer. See `05-market-rules.md` §2. Do not add consent text by hand.

Default consent block (UK and EU wording, the strictest):
```text
We use your details to run this event and send you the recording.
[ ] Send me news and offers from {{client_name}} by email. You can unsubscribe at any time.   (not ticked)
[ ] {{partner_name}} can contact me about related products.   (not ticked; only if a co-host exists)
This session is recorded. Read our privacy notice: {{privacy_url}}
```

## 3. Confirmation email

```text
Subject: You're registered: {{session_title}}

Hi {{first_name}},

Thanks for registering for {{session_title}} on {{local_date}} at {{local_time}} ({{timezone}}).

Join link: {{join_url}}
Add to calendar: {{calendar_url}}

What you will learn:
{{outcomes_block}}

Can't make it live? Stay registered and we will send you the recording.

{{sender_name}}
{{client_name}} · {{postal_address}} · Unsubscribe: {{unsubscribe_url}}
```
[US: postal address required (CAN-SPAM). Singapore bulk email: add "<ADV>" to marketing subject lines; a confirmation of a requested registration is not marketing. Quebec: French version.]

## 4. Reminders

| When | Channel | Text |
|---|---|---|
| T−7d | Email | "1 week to go: {{session_title}}". Add 1 new reason to attend (a speaker, a question we will answer). |
| T−1d | Email | "Tomorrow at {{local_time}}: {{session_title}}". Join link and calendar link. |
| T−1h | Email | "We start in 1 hour". Join link only. |
| T−10min | SMS or WhatsApp, only with consent for the channel | "{{session_title}} starts in 10 min. Join: {{short_join_url}} Reply STOP to opt out." [WhatsApp: use a Meta-approved utility template.] |

## 5. Run-of-show checklist (producer)

- [ ] Recording on. Recording notice read in the welcome.
- [ ] Live captions on (in the session language).
- [ ] Polls loaded. Poll 1 in the first 10 minutes.
- [ ] Q&A assistant connected. Moderator logged in. Escalation contact named.
- [ ] Prepared answers open for the moderator.
- [ ] Slides are the approved version (version number: ___).
- [ ] Attendee cameras and microphones off by default.
- [ ] Attendee names hidden from other attendees (unless the plan says networking).
- [ ] Call-to-action link tested.
- [ ] Backup host and backup slide file ready.
- [ ] GCC sessions: no clash with prayer times; Ramadan timing checked.

## 6. Follow-up templates (approved at the go-live gate)

**Hot**
```text
Subject: Your questions from {{session_title}}

Hi {{first_name}},

Thanks for joining {{session_title}}. You asked:
{{questions_block}}

{{sender_name}} from our team will contact you to answer them in detail. If you prefer, book a time here: {{cta_url}}

Useful next reads:
{{resources_block}}

Recording: {{replay_url}}
```

**Engaged**
```text
Subject: Recording and slides: {{session_title}}

Hi {{first_name}},

Thanks for joining. Here is the recording and the slides: {{replay_url}}

{{questions_block}}
Based on the session, these may help:
{{resources_block}}

Next step: {{cta_url}}
```

**No-show**
```text
Subject: You missed it, here is the recording

Hi {{first_name}},

We missed you at {{session_title}}. The full recording is here: {{replay_url}}
It takes {{duration_minutes}} minutes. The key part starts at {{key_timestamp}}.
```

**On demand**
```text
Subject: Thanks for watching {{session_title}}

Hi {{first_name}},

Thanks for watching. Here are 2 resources that go deeper:
{{resources_block}}

Questions? Reply to this email.
```
[All templates: add the footer from §3. The engine adds the unsubscribe and the address per market.]

## 7. Sales brief (one per hot lead)

```text
Who: {{name}}, {{title}} at {{company}} ({{country}}). Fit {{fit}}. Lifecycle: {{stage}}.
Why hot: {{top_signals}}. Score {{score}}/100.
What they asked: "{{question_1}}" "{{question_2}}"
Suggested next step: {{next_step}}
Watch out: {{consent_note}} {{open_issues}}
Event: {{session_title}}, {{event_date}}. Replay at {{key_timestamp}}.
Accept / Reject (reason required)
```

## 8. Trade show lead capture form (lead app)

| Field | Type |
|---|---|
| Badge scan | auto |
| Interest | Product A / Product B / Partnership / Just browsing |
| Hand-raise | Demo / Meeting / Quote / Trial / None |
| Timeframe | Now / 3 months / 6 months+ / Unknown |
| Note | free text, max 200 characters |
| Consent question (per market, see `05-market-rules.md` §2) | Yes / No |
| Captured by | staff name |

## 9. Speaker agreement checklist (a person completes it)

- [ ] Date, time, length and format agreed.
- [ ] Consent to record, and to reuse the recording and clips (channels, markets, how long).
- [ ] Consent to use name, photo, title and bio in promotion.
- [ ] Fee and expenses (if any) approved at the budget gate.
- [ ] Speaker reviewed and approved the slides and prepared answers.
- [ ] Speaker discloses any conflict (for example a paid relationship with the client), and the promotion shows it where the market requires it.
- [ ] No AI voice or face copy of the speaker without separate written consent (plan, Service 3 rule).

## 10. Post-event report outline

1. Result against target: registrations, show-up rate, attendees, hot leads, SQLs, meetings, cost per attendee.
2. Speed: median follow-up minutes, hot lead to sales hours.
3. Sales feedback: accepted and rejected leads with reasons.
4. Audience: top questions, poll results, markets, roles.
5. Assets made from the recording, and their first results.
6. 3 actions for the next event.
