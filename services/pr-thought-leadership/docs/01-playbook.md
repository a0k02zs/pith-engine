# PR and thought leadership: strategy playbook

Service 14 of the Pith M plan. Version 0.1, 21 Oct 2026. Owner: the "PR and thought leadership" thread.
Source: [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67), section "Service 14 · PR and thought leadership".
Engine: builds on the shared engine contracts v0.1.0 in `/mnt/project-files/engine/`.

## 1. What the client buys

The client buys trust. The service gets the client and its leaders quoted in media that buyers trust, and makes its leaders visible on LinkedIn. Media mentions also raise the client's citations in AI answer engines (GEO, Service 5).

The service has 2 parts. A client can buy 1 part or both.

| Part | What it does | Main output |
|---|---|---|
| Earned media (PR) | Finds stories, pitches journalists and podcasts, answers journalist requests, runs announcements, watches coverage | Media mentions, interviews, backlinks |
| Executive thought leadership | Turns each leader's own ideas into LinkedIn posts, articles and comments, in that leader's voice | Posts, followers, inbound conversations |

| Client type | Main job | Typical targets |
|---|---|---|
| B2B (SaaS, services, finance, industrial) | Authority with buyers and investors; shorter sales cycles | Trade press, business press, podcasts, analyst notes, LinkedIn |
| B2C (consumer brands, retail, apps) | Awareness and trust; launches | Lifestyle and consumer press, broadcast, gift guides, creators (with Service 6) |

## 2. Service packages

These are planning packages. Pith sets the prices.

| Package | Scope | Executives | Markets | Pitch campaigns per month | Executive posts per week |
|---|---|---|---|---|---|
| Voice | Thought leadership only | 1 | 1 | 0 | Up to 3 per executive |
| Authority | PR and thought leadership | Up to 2 | 1 | Up to 2, plus journalist requests | Up to 3 per executive |
| Category leader | PR and thought leadership, crisis on-call, wire releases | Up to 5 | Up to 5 | Up to 6, plus journalist requests | Up to 4 per executive |

All packages include monitoring and a monthly report. Wire distribution fees (for example Business Wire or PR Newswire) pass through to the client at cost.

## 3. Strategy in 8 rules

1. **People send, agents draft.** An agent never sends a pitch, never replies to a journalist and never publishes for an executive. A named person sends each pitch from their own mailbox. This is the plan's rule: "Reply to a complaint, journalist or regulator" is on the list of things an agent can never do alone.
2. **News value first.** Every pitch answers 1 question: "Why does this reader care now?" A pitch with no new data, no new event or no strong opinion does not go out.
3. **Few, relevant journalists.** We pitch 10 to 30 named journalists per angle, not 500. Each pitch names a recent article by that journalist and says why this story fits their beat.
4. **The executive's own ideas.** Thought leadership comes from the executive's notes, voice memos, interviews and meetings. The agent shapes the words. It never invents opinions, stories, numbers or experiences. Every post is approved by that executive.
5. **Claims need proof.** Every number, ranking or customer name in a pitch, release or post comes from the approved claims list in the client brain, or goes to the claim gate.
6. **Speed matters for reactive PR.** A journalist request or a news story is worth most in the first 2 hours. The reactive workflow has a 2-hour target from request to a sent reply.
7. **Every mention works twice.** Each piece of coverage goes to Service 5 (backlinks and AI citation), Service 4 (social posts), Service 1 (newsletter) and sales enablement.
8. **Bad news goes to a person at once.** Any negative story, crisis sign or regulator contact stops all scheduled PR and executive posts for that client and alerts a person within 15 minutes.

## 4. The pipeline

This is the pipeline from the plan, with engine calls added. Steps marked GATE stop and wait for a person. Full workflow specs are in `02-workflows.md`.

| # | Step | Who does it | Engine call |
|---|---|---|---|
| 1 | Media list: find journalists and podcasts by topic and market | Media researcher agent | Media database API; each journalist is a party (`party.json`, kind `journalist`) |
| 2 | Story angles: find news hooks from data, trends and client news | Angle strategist agent | `GET /clients/{id}/brain` |
| 3 | GATE: approve angles | PR lead and client | Approval kind `plan` |
| 4 | Pitch: draft personal pitches, check them | Pitch writer agent, QA agent | `POST /compliance/check` (channel `press_pitch`) |
| 5 | GATE: approve pitches, then a person sends them | PR lead | Approval kind `copy`; the send is a human step (`wait` for `svc.pr/pitch.sent`) |
| 6 | Executive posts: draft from the executive's own notes and voice | Executive ghostwriter agent | `GET /clients/{id}/brain` (executive voice profile) |
| 7 | GATE: the executive approves each post | Client executive | Approval kind `copy` |
| 8 | Monitor: mentions, sentiment, share of voice | Monitor agent | `engine/metric.recorded`; listens to `engine/escalation.raised` from all services |
| 9 | GATE: crisis. Any negative story goes to a person at once | PR lead, client legal, client executive | Approval kind `escalation` |
| 10 | Report and learn | Reporter agent | `engine/metric.recorded`; write-back to the client brain |

## 5. Story types we use

The angle strategist agent picks from these 9 types. Each angle names its type.

| Type | What it is | Best for | Example hook |
|---|---|---|---|
| Data story | New numbers from the client's own data or a survey | B2B and B2C; the best type for GEO | "62% of UK finance teams still close the books by spreadsheet" |
| Announcement | Funding, launch, partnership, hire, expansion, award | All | "Pith client opens Riyadh office" |
| Expert comment | The executive reacts to news in the first hours | B2B | Comment on a new regulation on the day it is published |
| Trend piece | The executive explains a shift with 3 examples | B2B | "Why buyers in the Gulf now want WhatsApp-first service" |
| Contrarian view | A clear, defensible opinion against the common view | B2B thought leadership | "Open rates are dead; stop reporting them" |
| Customer story | A named customer and a measured result | B2B trade press | Customer approval is required in writing |
| Founder story | Why the company exists; a turning point | Podcasts, profiles | Only true events from the founder's own words |
| Seasonal hook | A date that the market cares about | B2C | Ramadan, Black Friday, Singles' Day (11.11), tax year end |
| Award or list | Award entries and "top N" lists | All | Entry deadlines tracked in the media calendar |

## 6. Media tiers

The media researcher agent gives each outlet a tier per market and topic. Tiers drive KPIs and pitch priority.

| Tier | Definition | Examples (UK) |
|---|---|---|
| 1 | National or global business, news or broadcast outlet with high trust; or the top trade title for the client's buyers | Financial Times, The Times, BBC, Reuters, the top trade title |
| 2 | Strong trade, regional or consumer titles; major podcasts and newsletters in the niche | Sector trade press, regional business press |
| 3 | Blogs, smaller podcasts, partner and community sites | Niche blogs, community newsletters |

The researcher stores a reason for each tier. The PR lead can change a tier. Each market's tier 1 starter list is in `06-market-rules.md`.

## 7. Executive thought leadership model

### 7.1 Voice profile

Before the first post, the ghostwriter agent builds a voice profile for each executive from 3 sources: a 30-minute recorded interview, 10 or more past posts or talks, and the executive's answers to the intake form (`04-templates.md`, template T6). The executive approves the profile. The profile is stored in the client brain under the executive's name.

### 7.2 Content pillars

Each executive has 3 to 4 pillars. A pillar is a topic where the executive has real experience and the client wants authority. Pillars come from the brand strategy (Service 13) and the SEO clusters (Service 5).

### 7.3 Weekly cadence (default)

| Day | What | Source |
|---|---|---|
| Monday | Idea capture: the executive sends a 5-minute voice memo or 3 bullet notes | The executive |
| Tuesday | Agent sends 3 to 4 drafts to the approval inbox | Ghostwriter agent |
| Wednesday | The executive approves, edits or rejects each draft | The executive |
| Tuesday to Thursday | Posts go live at the best local time, 1 per day at most | The executive or an approved scheduler |
| Friday | Engagement report and 5 suggested comments on other people's posts | Monitor agent |

### 7.4 Post formats

Story post, lesson list, contrarian view, data point with a chart, behind-the-scenes, comment on news, document carousel, short video (with Service 3), and long-form LinkedIn article once a month.

### 7.5 LinkedIn platform rules

- Posts go live through the LinkedIn official API with the executive's own authorization, through a scheduler that uses that API, or by the executive by hand. Never through browser bots or tools that log in with the executive's password.
- No automated connection requests, direct messages, likes or comments. The agent only suggests comments. The executive writes or approves each comment and posts it.
- Disclose when a post promotes the executive's own company where the market requires it. The executive's job title on the profile usually does this. Paid partnerships use the LinkedIn "Brand partnership" label.

## 8. What agents do and what people do

| Agents do | People do |
|---|---|
| Find journalists, podcasts and their recent work | Choose which journalists to pitch |
| Find news hooks and draft angles | Approve angles; protect the relationship |
| Draft pitches, releases, Q&A briefs and posts | Send every pitch; answer every journalist |
| Scan journalist request feeds every 30 minutes | Approve every quote given to media |
| Track coverage, sentiment and share of voice | Give interviews; go on podcasts |
| Draft holding statements in a crisis | Decide what to say in a crisis |
| Write the monthly report | Present results to the client |

## 9. Links to other services

| Service | What PR gives | What PR gets |
|---|---|---|
| 5 SEO / SEM / GEO | Media mentions, backlinks, AI citation sources | Link and citation targets, data story ideas, priority topics |
| 7 Content marketing | Coverage to quote; interview transcripts | Reports and data for data stories |
| 4 Social media | Coverage to share; executive posts to reshare | Trend and mention signals |
| 1 Email marketing | "As seen in" blocks for newsletters | None |
| 3 Video production | Interview clips, podcast clips | Short video for executive posts |
| 13 Brand strategy | Message pull-through data | Positioning, messaging pillars |
| 16 Events and webinars | Speaker slots and press invites | Event news hooks |
| 12 Analytics | KPI events | Dashboard and attribution |
| 2 Campaigns | Earned media part of a launch | Launch dates and master brief |

## 10. First 30 days for a new client

| Week | Work | Gate |
|---|---|---|
| 1 | Intake (T1), brand brain check, executive interviews, competitor and media audit | None |
| 2 | Media lists per market, voice profiles, pillars, 90-day angle plan | Approve voice profiles; approve angle plan |
| 3 | First 4 executive posts; first pitch campaign; journalist request feeds on | Executive approves each post; PR lead approves pitches |
| 4 | Crisis plan (T9) signed, monitoring live, first report baseline | Client legal approves the crisis plan |
