# PR and thought leadership: approvals and KPIs

Service 14 (`pr`). Version 0.1, 21 Oct 2026.
Kinds and roles come from `engine/specs/approval-inbox.md` and `engine/contracts/enums.json`. No new kinds or roles are needed.

## 1. Approval points

| # | Workflow step | Kind | Roles | SLA | Can skip? |
|---|---|---|---|---|---|
| A1 | WF-1 `approve_list`: new tier 1 journalists | `shortlist` | pr_lead | 72 h | No. The branch runs it only when new tier 1 names appear. |
| A2 | WF-2 `approve_plan`: angle plan | `plan` | pr_lead | 48 h | No |
| A3 | WF-2 `client_plan`: angles and spokespeople | `plan` | client_approver | 48 h | No |
| A4 | WF-2 `new_claims` | `claim` | client_legal or client_approver | 72 h | No. Runs only when angles have new claims. |
| A5 | WF-3 `approve`: pitches (bulk approve allowed) | `copy` | pr_lead | 24 h | No |
| A6 | WF-3 `listed`: price-sensitive pitch for a listed client | `claim` | client_legal | 24 h | No. Runs only for listed clients. |
| A7 | WF-3 `approve_fu`: follow-ups | `copy` | pr_lead | 24 h | No |
| A8 | WF-4 `expert`: quote for a journalist request | `copy` | client_executive or subject_expert | 2 h | No |
| A9 | WF-4 `pr_ok`: request reply | `copy` | pr_lead | 1 h | No |
| A10 | WF-5 `native`: translated release | `copy` | native_editor | 48 h | Yes, when no market needs translation |
| A11 | WF-5 `client_copy`: release | `copy` | client_approver + client_executive (2) | 48 h | No |
| A12 | WF-5 `legal`: release claims and disclosure | `claim` | client_legal | 48 h | No |
| A13 | WF-5 `wire_go`: wire time and fee | `go_live` | pr_lead + client_approver (2) | 24 h | No |
| A14 | WF-6 `exec_ok`: each executive post | `copy` | client_executive | 48 h | No, never |
| A15 | WF-6 `legal`: listed client or new claim | `claim` | client_legal | 24 h | No. Runs only when needed. |
| A16 | WF-8 `escalate`: owner for an issue | `escalation` | pr_lead or account_lead | 15 min | No |
| A17 | WF-8 `decide`: holding statement | `escalation` | client_legal + client_executive (2) | 1 h | No |
| A18 | WF-9 `review`: monthly report | `report` | pr_lead or analytics_lead | 24 h | No |

Human actions outside the inbox (by design, not gates): the sender presses Send on every pitch; the executive posts comments by hand; a person closes each crisis.

## 2. Approval load estimate

For 1 client on the Authority package (2 executives, 1 market). These are planning estimates, not measured data.

| Person | Items per month | Time per month |
|---|---|---|
| PR lead (Pith) | About 2 plans, 4 pitch batches, 15 request replies, 1 report | About 6 hours |
| Each executive | About 14 posts, 4 to 6 quotes | About 2 hours |
| Client approver | 1 plan, 1 or 2 releases | About 1 hour |

## 3. KPIs

Shared codes come from `enums.json` `kpis`. Service-only codes use `pr.<name>` (the engine's `kpi_naming_rule`).

| KPI | Code | Definition | Target (planning default) |
|---|---|---|---|
| Tier 1 media mentions | `media_mentions_tier1` | Coverage records with tier 1 in the month | Authority: 2 or more per month after month 3 |
| All media mentions | `pr.media_mentions` | All coverage records (tier 1 to 3) | Trend up |
| Share of voice | `share_of_voice` | Client mentions ÷ (client + 3 tracked competitors) in the month, per market | +5 points in 6 months |
| Net sentiment | `pr.sentiment_net` | (positive − negative) ÷ all mentions | Above +0.3 |
| Message pull-through | `pr.message_pull_through` | Share of coverage with at least 1 key message | 60% or more |
| Backlinks from media | `pr.backlinks_earned` | Coverage with a link to the client site (follow and nofollow counted apart) | 3 or more per month |
| AI citation share | `ai_citation_share` | From Service 5, on the tracked prompts | Trend up; PR reports it, search owns it |
| Pitch reply rate | `reply_rate` (channel `press_pitch`) | Replies ÷ pitches sent | 15% or more |
| Placement rate | `pr.placement_rate` | Pitches with coverage within 30 days ÷ pitches sent | 5% or more |
| Request reply time | `pr.request_reply_minutes` | Median minutes from request found to reply sent | Under 120 |
| Executive post engagement | `engagement_rate` (channel `social_post`, service `pr`) | (reactions + comments + reposts) ÷ impressions | Above the executive's own 90-day baseline |
| Executive follower growth | `follower_growth` | New followers per executive per month | Trend up |
| Inbound conversations | `pr.exec_inbound` | Messages and meetings that name an executive post, logged by the client | Logged and reported |
| Posts approved first time | `pr.first_pass_approval` | Executive posts approved with no changes ÷ all posts | 70% or more by month 3 |
| Crisis response time | `pr.escalation_minutes` | Minutes from detection to an owner in the inbox | Under 15 for level 3 |

## 4. What we do not count

- Advertising value equivalency (AVE). It is not a valid measure of PR value.
- "Potential reach" as a result. We show reach only as an estimate beside the coverage.
- Open rates of pitches.
