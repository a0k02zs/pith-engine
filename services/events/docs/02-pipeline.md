# Service 16: Events and webinars — Pipelines and approval gates

Version 1, 21 Oct 2026. Machine-readable versions: `workflow/webinar-pipeline.json` and `workflow/trade-show-pipeline.json`.

"T" is the event start. "T−28d" means 28 days before the event. "E" is the event end. Gates are marked **GATE**. Each gate is an item in the shared approval inbox, with an `approval_kind` from `engine/contracts/enums.json`.

## 1. Webinar and virtual event pipeline (17 stages)

| # | Stage | When | Who | What happens |
|---|---|---|---|---|
| 1 | Intake | T−42d | Client, account lead | The client fills the event brief (`04-templates.md` §1): goal, audience, markets, speakers, budget. |
| 2 | Topic research | T−40d | Agent `ev-topic-strategist` | Reads the client brain, sales questions, search clusters and past event results. Proposes 3 topics, each with a title, the buyer problem, the speaker profile and a registration forecast. |
| 3 | **GATE: plan** | T−38d | Account lead, client approver | Approve 1 topic, the speakers, the session times per region, the engagement score weights and the KPI targets. `approval_kind: plan`. SLA: 2 business days. |
| 4 | **GATE: budget and contracts** | T−36d | Client finance, account lead | Only when there is paid promotion, a paid platform add-on or a paid speaker. A person signs. `approval_kind: budget` and `contract`. |
| 5 | Content build | T−35d to T−21d | Agent `ev-run-of-show-writer`, speakers | Speaker brief, run of show, slide outline, polls, pre-written answers for likely questions. |
| 6 | **GATE: claims and slides** | T−21d | Speakers, client approver, `client_legal` for regulated topics | Approve the slide content, the polls and the pre-written answers. New claims need a person (governance rule). `approval_kind: claim` and `copy`. |
| 7 | Registration build | T−35d to T−30d | Service 17 (landing page), agent `ev-promo-brief-writer` | Registration page, form with consent fields per market (`05-market-rules.md`), confirmation email, calendar file, reminder sequence, follow-up templates per segment. Every item goes through `POST /compliance/check`. |
| 8 | **GATE: go live (registration)** | T−30d | Account lead, client approver | Approve the page, the reminders and the 4 follow-up templates together. After this gate, follow-up sends that use only approved templates and approved fields skip the copy gate. `approval_kind: go_live` and `template`. |
| 9 | Promotion | T−28d to T−1h | Services 1, 4, 8, 11, 10 | 1 promotion brief goes to each channel service as a subflow. Each service applies its own gates. |
| 10 | Registration pacing | Daily from T−28d | Agent `ev-registration-pacer` | Compares registrations with the forecast curve. At T−14d, if registrations are under 60% of the T−14d target, it proposes actions in the approval inbox (for example a new email or a paid boost). A paid boost needs a budget gate. |
| 11 | Dry run | T−3d | Producer (person), speakers | Test audio, slides, polls, recording, captions and the Q&A assistant. Producer ticks the run-of-show checklist. |
| 12 | Live session | T | Producer, moderator, agent `ev-live-qa-assistant` | The agent sorts questions, drafts answers from approved content for the moderator, and flags questions for sales (hand-raise). It never posts a new claim. It sends complaints, press and legal questions to the moderator at once. |
| 13 | Score and follow up | E to E+24h | Agents `ev-attendee-scorer`, `ev-follow-up-writer`, `ev-sales-brief-writer` | Pull attendance, watch time, questions, polls and clicks. Score each record. Fill the approved follow-up templates. Send each segment at a good local time, but always inside 24 hours of E. |
| 14 | **GATE: sales hand-off** | E to E+4 business hours | `client_sales` | Sales sees the hot list with a brief for each person. Sales accepts or rejects each lead with a reason. `approval_kind: shortlist`. Not accepted in 1 business day: the account lead gets an alert. |
| 15 | Repurpose | E+1d to E+10d | Agent `ev-repurpose-planner`, Services 3, 7, 1, 4 | Cut plan for clips, blog outline, email series, social posts, sales one-pager. Each service applies its own gates. Clips go through the video final-review gate. |
| 16 | **GATE: report** | E+7d and E+30d | Strategist | Agent `ev-report-writer` drafts the report. The strategist checks it before the client sees it. `approval_kind: report`. |
| 17 | Learn | E+30d and E+90d | Agent `ev-report-writer` | Pipeline and revenue influenced by the event. Lessons and sales feedback go to the client brain. |

Stage 4 runs only when it applies. Stages 15 to 17 run in parallel.

### Service levels

| Promise | Target |
|---|---|
| First follow-up to every registrant (all segments) | Inside 24 hours of E, in local business hours where possible |
| Hot lead to sales | Inside 4 business hours of E |
| Replay available | Inside 4 hours of E |
| First 3 clips ready for review | Inside 3 business days of E |
| Report | E+7d (first look) and E+30d (pipeline) |

### Why follow-up is fast

Stage 8 approves the follow-up templates before the event. On the event day there is no copy gate for those templates. The agent fills only these fields: first name, company, session title, questions asked (as the person wrote them), the resources that match the questions, and the replay link. If the agent wants to add a new sentence that is not in the template, the engine sends it to the copy gate. The 24-hour clock then still runs, so the agent sends the plain template and puts the extra sentence in the sales brief.

## 2. Trade show and field event pipeline (13 stages)

| # | Stage | When | Who | What happens |
|---|---|---|---|---|
| 1 | Show selection | T−180d to T−120d | Agent `ev-trade-show-planner` | Rank candidate shows by audience fit, target accounts expected, cost and past results. Uses the market calendar in `05-market-rules.md`. |
| 2 | **GATE: plan and budget** | T−120d | Client approver, client finance | Choose the shows. Approve the budget. `approval_kind: plan`, `budget`. |
| 3 | **GATE: contracts** | T−120d to T−90d | Client, account lead | A person signs the booth, sponsorship and venue contracts. Local event permits for field events (GCC). `approval_kind: contract`. |
| 4 | Target list | T−60d | Service 8 (ABM), agent `ev-trade-show-planner` | Target accounts that will attend or are near the show. Buying committee contacts. Only contacts that `POST /audiences/resolve` returns. |
| 5 | Pre-show outreach | T−30d to T−2d | Services 1, 8, sales | Meeting invites, booth invites, field event invites. Personal emails from sales (drafted by agents). |
| 6 | Booth content and lead app setup | T−30d to T−7d | Agent `ev-run-of-show-writer`, Service 3 | Demo script, talk track, booth screen loop, lead capture form with consent questions per market. |
| 7 | **GATE: booth content and lead form** | T−7d | Client approver, `client_legal` if needed | Approve claims on screens and handouts, and the lead form consent text. `approval_kind: creative`, `go_live`. |
| 8 | Show days | T to E | Booth team (people) | Scan badges, add a note and a consent answer for each lead. The lead app syncs each night. |
| 9 | Nightly triage | Each show night | Agent `ev-attendee-scorer` | Score the day's leads by fit and note. Draft the next-day meeting list for the booth team. |
| 10 | Follow-up | E to E+24h | Agents `ev-follow-up-writer`, `ev-sales-brief-writer` | Follow-up by segment and market, from templates approved at stage 7. Sales gets a brief for every A-fit lead. |
| 11 | **GATE: sales hand-off** | E to E+1 business day | `client_sales` | Accept or reject each lead with a reason. `approval_kind: shortlist`. |
| 12 | **GATE: report** | E+14d | Strategist | Cost per lead, meetings, pipeline. `approval_kind: report`. |
| 13 | Learn | E+90d | Agent `ev-report-writer` | Pipeline and revenue per show. Go or no-go advice for next year. |

## 3. Who approves what

| Gate | Pith role | Client role | Can it be skipped? |
|---|---|---|---|
| Plan | `account_lead` | `client_approver` | No |
| Budget | `account_lead` | `client_finance` | Only when there is no spend |
| Contract | `account_lead` | `client_approver` (signs) | No, if a contract exists |
| Claims and slides | `content_lead` | `subject_expert` (speaker), `client_legal` for regulated topics | No |
| Go live and templates | `account_lead` | `client_approver` | No |
| Sales hand-off | — | `client_sales` | No |
| Report | `strategist` | — | No |
| Escalation (live or follow-up) | `account_lead` | `client_approver` | No |

The role `events_lead` does not exist in the engine role list yet. Until it does, `account_lead` owns events gates.
