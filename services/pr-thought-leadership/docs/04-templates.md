# PR and thought leadership: templates

Service 14. Version 0.1, 21 Oct 2026.
Agents fill these templates. Text in `{{double braces}}` is a variable. The agent reads the client brain (`GET /clients/{id}/brain`) for voice, approved claims and banned words before it fills any template.

| Id | Template | Used in workflow | Filled by |
|---|---|---|---|
| T1 | Client PR intake | Onboarding | PR lead with the client |
| T2 | Media contact record | WF-1 media list | Media researcher agent |
| T3 | Angle card | WF-2 angle plan | Angle strategist agent |
| T4 | Proactive pitch email | WF-3 pitch campaign | Pitch writer agent |
| T5 | Journalist request reply | WF-4 reactive | Reactive responder agent |
| T6 | Executive voice intake | WF-6 thought leadership | Executive, with the ghostwriter agent |
| T7 | LinkedIn post formats | WF-6 thought leadership | Ghostwriter agent |
| T8 | Press release | WF-5 announcement | Release writer agent |
| T9 | Crisis plan and holding statement | WF-8 crisis | Crisis agent, then PR lead and client legal |
| T10 | Interview brief | WF-3, WF-4 | Briefing agent |
| T11 | Coverage record | WF-7 monitor | Monitor agent |
| T12 | Monthly report | WF-9 report | Reporter agent |

---

## T1. Client PR intake

```
Client: {{client_name}}            Client id: {{client_id}}
Package: Voice | Authority | Category leader
Markets (enums market_groups): {{markets}}
Listed company: yes | no      Exchange and ticker: {{exchange}} {{ticker}}
Quiet periods (dates): {{quiet_periods}}

1. Business goal for the next 12 months (1 sentence):
2. Who must trust us more? (buyers, investors, talent, regulators, partners):
3. 3 messages we want in every story:
4. 3 competitors whose coverage we track:
5. Spokespeople (name, title, topics, languages, media-trained yes/no):
6. News we expect in the next 6 months (launches, funding, hires, data, events):
7. Data we can share (customer counts, surveys, usage data); owner of each:
8. Topics we never comment on:
9. Past coverage we are proud of (links):
10. Past crises or sensitive issues the team must know about:
11. Who approves: PR (client_approver), legal (client_legal), executives (client_executive):
12. Wire budget per year (if any):
```

## T2. Media contact record

Stored as an engine party (`party.json`, kind `journalist`, `client_id` null so that 1 record serves all clients). `name`, `email`, `country` and `handles` are party fields. The other fields go in the party's `attributes`.

| Field | Type | Rule |
|---|---|---|
| `name` (party field), `outlet`, `role` | text | From the media database or the outlet's own site |
| `email` | email | Work address only, unless the journalist gave a personal address |
| `country`, `market_group` | code | From `enums.json` |
| `language` | code | Language the journalist writes in |
| `beats` | list | Topics from their last 20 articles |
| `recent_articles` | list of 3 | Title, URL, date; refreshed every 30 days |
| `tier` | 1, 2, 3 | With `tier_reason` |
| `pitch_preferences` | text | From their bio or past replies (for example "no attachments", "exclusives only") |
| `last_pitched_at`, `last_reply_at` | date | Across all Pith clients |
| `do_not_pitch` | boolean | Set on any opt-out; global across all clients |
| `relationship_owner` | user | The Pith person who owns the relationship |
| `consent_basis` | code | `legitimate_interest` (UK, EU, SG, GCC), `opt_out_regime` (US), `casl_business_exemption` (CA) |
| `source` | text | For example `muckrack:2026-10-21`; needed for the GDPR Article 14 notice |

## T3. Angle card

```
Angle id: {{angle_id}}          Story type: {{story_type}} (playbook section 5)
Market(s): {{markets}}           Target tier: {{tier}}
Headline a journalist could write: {{headline}}
Why now (the hook): {{hook}}
Why this reader cares (1 sentence): {{reader_value}}
Proof: {{data_points_with_source}}   (each from approved claims, or marked NEW CLAIM)
Spokesperson: {{spokesperson}}
Assets ready: data | images | customer | demo | video
Target outlets and journalists (10 to 30): {{shortlist}}
Offer: exclusive | embargo | open | comment only
Risk notes: {{risks}}  (sensitive topic, listed-company rule, competitor named)
GEO value: {{prompts_this_helps}}  (from Service 5)
Score (agent): news value {{1-5}}, fit {{1-5}}, proof {{1-5}}, effort {{1-5}}
```

## T4. Proactive pitch email

Rules: under 150 words in the body. 1 idea. Name the journalist's recent article. No attachments in the first email. No "I hope this finds you well". Local spelling and language.

```
Subject: {{short_specific_subject}}        (under 9 words; no "press release")

Hi {{first_name}},

{{1 sentence that links to their article: title and why it matters}}

{{2 to 3 sentences: the story, the hook and the 1 best proof point}}

{{1 sentence: what we offer — data, interview with {{spokesperson}}, exclusive until {{date}}}}

Would this work for {{outlet}}? I can send {{asset}} today.

{{sender_full_name}}
{{sender_title}}, {{agency_or_client_name}}
{{phone}}  ·  {{postal_address}}

You get this email because you write about {{beat}}. Reply "no more" and we will not contact you again. Privacy notice: {{privacy_url}}
```

Follow-up (1 only, after 3 to 5 working days, in the same thread):

```
Hi {{first_name}}, a short follow-up on {{topic}}. {{1 new fact or a new asset}}. If it is not a fit, no problem.
```

## T5. Journalist request reply

For Qwoted, ResponseSource, Featured and similar feeds. Target: sent within 2 hours of the request.

```
Subject: Re: {{request_title}} — {{spokesperson_name}}, {{spokesperson_title}} at {{client_name}}

Hi {{journalist_first_name}},

{{spokesperson_name}} can help with your piece on {{topic}}.

Quote:
"{{quote_40_to_80_words_in_spokesperson_voice}}"

Why {{spokesperson_first_name}} can speak to this: {{1 line credential}}
Available for a call: {{times_in_journalist_time_zone}}
Headshot and bio: {{link}}

{{sender_signature_and_optout_as_T4}}
```

The quote must come from the spokesperson's notes or an earlier approved quote. The spokesperson approves the final quote before a person sends it.

## T6. Executive voice intake

The executive answers in writing or in a 30-minute recorded call.

```
1. In 1 sentence, what do you want to be known for?
2. 3 to 4 topics where you have earned an opinion (pillars):
3. A belief you hold that most people in your industry do not:
4. 3 stories from your career that changed how you work:
5. Words and phrases you use often:
6. Words you never use (for example "synergy", "game-changer"):
7. 3 people whose posts you like, and why:
8. Topics you will not post about:
9. Languages for posts:
10. How much time per week can you give? (minimum 20 minutes)
11. Do you want to approve each post in the inbox, by Slack or by email?
12. Can we post for you through a scheduler you authorize? yes | no (you post by hand)
```

The agent turns the answers into a voice profile with: sentence length, reading level, use of "I" and "we", humour level (0 to 3), emoji use (yes or no), formatting habits, signature phrases, banned words, pillars, stories bank, and 3 sample posts. The executive approves the profile (approval kind `plan`).

## T7. LinkedIn post formats

All formats: hook in the first 2 lines (about 200 characters before "see more"). Short paragraphs. 1 call to action or 1 question at most. 0 to 3 hashtags. Links go in the first comment only if the voice profile says so.

| Format | Shape | Length |
|---|---|---|
| Story | Hook, a moment, what happened, the lesson, a question | 150 to 250 words |
| Lesson list | Hook, 5 to 7 numbered lessons of 1 line each, a short close | 120 to 200 words |
| Contrarian view | "Most people say X. I think Y." Then 3 reasons and 1 caveat | 120 to 220 words |
| Data point | 1 number, its source, what it means, what to do | 80 to 150 words, 1 chart |
| Behind the scenes | What the team did this week and why | 100 to 180 words, 1 photo |
| News comment | The news in 1 line, the executive's view, 1 prediction | 80 to 150 words |
| Carousel | 6 to 10 slides, 1 idea per slide, made with Canva brand templates | 20 to 40 words per slide |
| Article | 1 deep topic per month, with headings | 700 to 1,200 words |

Draft header the agent adds for the approver (not published):

```
Pillar: {{pillar}}   Format: {{format}}   Source: {{memo_or_note_id}}
Claims used: {{claim_ids}}   New claims: {{none_or_list}}
Best time to post ({{market}}): {{local_time}}
```

## T8. Press release

Use a release only for real announcements. Most stories work better as a pitch (T4).

```
FOR IMMEDIATE RELEASE   |   EMBARGOED UNTIL {{date}} {{time}} {{time_zone}}

{{Headline: active verb, under 15 words}}
{{Sub-headline: the main proof point}}

{{CITY}}, {{date}} — {{Paragraph 1: who, what, when, where, why in 2 to 3 sentences}}

{{Paragraph 2: the detail and the best number}}

"{{Quote 1: from the executive; says why it matters, not what it is}}," said {{name}}, {{title}} at {{client}}.

{{Paragraph 3: customer, partner or market context}}

"{{Quote 2: optional, from a customer or partner, with their written approval}}"

{{Paragraph 4: availability, price, dates, link}}

About {{client}}
{{boilerplate from the client brain, under 80 words}}

Media contact
{{name}}, {{email}}, {{phone}}
###
```

Market versions: UK spelling for GB, SG and CA; US spelling for US; French for CA-QC; Arabic version for GCC Arabic titles (native writer, right-to-left layout, Hijri date beside the Gregorian date for Saudi government partners); local language for EU lead countries. Listed clients: the release follows the exchange's disclosure rule (see `06-market-rules.md`, rule G2).

## T9. Crisis plan and holding statement

### T9.1 Severity scale

| Level | Signs | Response time | Who decides |
|---|---|---|---|
| 1 Watch | 1 negative post or article, low reach, no facts in dispute | Same day | PR lead |
| 2 Issue | Negative tier 1 or 2 coverage, or a post with fast reach, or a journalist asks for comment on a negative story | 1 hour | PR lead and client approver |
| 3 Crisis | Safety, data breach, legal action, regulator contact, executive conduct, or national coverage | 15 minutes | Client executive and client legal, with the PR lead |

### T9.2 Holding statement (level 2 or 3)

```
We are aware of {{issue_in_neutral_words}}. {{What we are doing now, in 1 sentence}}.
{{Care line: who we are helping or what we are protecting}}.
We will share more information by {{time}}. Contact: {{media_contact}}.
```

Rules: no guesses, no blame, no "no comment", no legal admissions. Client legal approves every word. The agent never sends a statement. In a level 3 crisis, the workflow pauses every scheduled post and pitch for the client in every service, through the engine.

### T9.3 Crisis plan contents

Contact tree with phone numbers, spokespeople by topic, pre-approved holding statements for the 5 most likely issues, dark site plan, pause list (services and channels to pause), regulator notification duties per market, sign-off order.

## T10. Interview brief

```
Outlet and journalist: {{outlet}}, {{journalist}} (tier {{tier}})
Date, time, format: {{when}}, {{phone|video|in person|podcast|broadcast}}
What the journalist is writing: {{piece}}
Their last 3 articles and their angle: {{articles}}
Our 3 messages: {{messages}}
Proof for each message: {{proof}}
Likely hard questions and suggested answers: {{qa}}
Do not say: {{topics_to_avoid}}
Listed-company rule: {{yes_no_and_rule}}
After the interview: send {{assets}} within 2 hours
```

## T11. Coverage record

| Field | Rule |
|---|---|
| `url`, `outlet`, `tier`, `market`, `language`, `published_at` | From the monitor |
| `type` | feature, news, quote, mention, podcast, broadcast, list |
| `spokesperson_quoted` | Name or none |
| `sentiment` | positive, neutral, negative (agent score, spot-checked by a person each month) |
| `messages_pulled_through` | Which of the 3 messages appear |
| `backlink` | follow, nofollow, none |
| `source_workflow` | angle id or request id, for attribution |
| `reach_estimate` | From the media database; labelled as an estimate |

## T12. Monthly report

```
{{client}} · PR and thought leadership · {{month}}

1. Headline: {{1 sentence: the most important result}}
2. Coverage: tier 1 {{n}}, tier 2 {{n}}, tier 3 {{n}}; top 3 pieces with links
3. Share of voice against {{competitors}}: {{%}} ({{change}} from last month)
4. Sentiment: positive {{%}}, neutral {{%}}, negative {{%}}
5. Message pull-through: {{%}} of pieces carry at least 1 key message
6. Backlinks from media: {{n}} ({{n}} follow)
7. AI citation share on tracked prompts (from Service 5): {{%}}
8. Executive LinkedIn: posts {{n}}, engagement rate {{%}}, follower growth {{n}}, inbound conversations {{n}}
9. Pitches: sent {{n}}, reply rate {{%}}, placement rate {{%}}
10. What worked, what did not, and what we do next month (3 bullets each)
```

The analytics lead (or the PR lead) reviews the report before the client sees it (approval kind `report`).
