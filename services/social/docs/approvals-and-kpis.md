# Approvals and KPIs

## 1. Approval matrix

All approvals go through the engine approval inbox. Kinds and roles come from `engine/specs/approval-inbox.md`.

| Gate | What | Engine kind | Who decides | SLA | Can skip? |
|------|------|-------------|-------------|-----|-----------|
| Setup | Pillars, voice samples, reply library, escalation contacts | `plan` | Social lead + client approver (both) | 72 h | No |
| A | Monthly calendar and analyst changes to pillars and cadence | `calendar` | Social lead + client approver (both) | 48 h | No |
| A0 | Calendar slots in a language that needs a native editor | `content` | Native editor | 24 h | Yes, when no slot needs one |
| B | Flagged post (checker `gate_b`, flags, compliance `warn`), or every post at autonomy level 1 | `content` | Social lead or client approver | 24 h | Yes, at autonomy ≥ 2 with a clean check |
| B-claim | New claim, price, health, finance or legal statement | `claim` | Client legal or client approver | 72 h | **Never** |
| B-fast | Reactive post (trend or news) | `content` | Social lead | 2 h | **Never** |
| Replies | Reply drafts the agent could not auto-send | `copy` | Social lead (community manager) | 2 h in business hours | Bulk approve allowed |
| C | Complaint, press, legal, safety, crisis | `escalation` | Account lead | 1 h | **Never** |
| Report | Weekly report before the client sees it | `report` | Strategist or analytics lead | 24 h | No |

**Agents can never** (plan, "Governance and risk"): start paid spend or boost a post; sign or pay; post a new claim without the `claim` gate; reply to a complaint, journalist or regulator; send a promotional DM to someone who did not message first.

## 2. KPI dictionary

Codes from `engine/contracts/enums.json` → `kpis`. Codes that start with `social.` are service-only KPIs (allowed by `engine/specs/service-integration.md` §7).

| KPI | Code | Formula | Grain |
|-----|------|---------|-------|
| Engagement rate per post | `engagement_rate` | (reactions + comments + shares + saves) ÷ reach | post, account, market |
| Saves | `social.saves` | count | post |
| Shares | `social.shares` | count (reposts, sends) | post |
| Follower growth in the target audience | `follower_growth` | net new followers in target markets (from platform audience data) | account, week |
| Reach | `reach` | unique accounts reached | post, account |
| Median reply time | `median_reply_minutes` | median minutes from inbound item to first reply, business hours only | account, week |
| Share of voice | `share_of_voice` | client mentions ÷ (client + 3 named competitors' mentions) | market, week |
| Net sentiment | `social.net_sentiment` | (positive − negative) ÷ all classified mentions | market, week |
| Clicks from social | `clicks` | link clicks with `utm_source` = platform, `utm_medium=social` | post, account |
| Conversions from social | `conversions` | conversions attributed by the analytics service (12) | account, month |
| Brand score | `brand_score` | checker score 0–100 | post |
| First-pass acceptance | `social.first_pass_acceptance` | posts approved with no edit ÷ posts reviewed | client, month |
| Auto-reply share | `social.auto_reply_share` | auto-replies ÷ all replies | account, week |
| Escalation response time | `social.escalation_minutes` | minutes from escalation raised to decision | client, week |
| Posts on time | `social.on_time_rate` | posts published in their slot ÷ planned slots | client, month |

UTM standard: `utm_source={platform}&utm_medium=social&utm_campaign={campaign_id or pillar}&utm_content={post_id}` (follow `engine/specs/analytics.md` if it differs).

## 3. Starting targets

Starting targets are planning estimates, not measured benchmarks. The analyst replaces them with each client's own 90-day baseline after month 3.

| KPI | Starting target |
|-----|-----------------|
| Median reply time | Under 2 hours in business hours (plan) |
| Escalation response time | Under 60 minutes, 100% of Sev 1 and Sev 2 |
| Engagement rate | Above the account's own 90-day average, month on month |
| Follower growth in target audience | Positive every month; target set per client at onboarding |
| Share of voice | Up against 3 named competitors, quarter on quarter (plan) |
| Brand score | Median ≥ 85; no post below 80 goes out without a person |
| First-pass acceptance | ≥ 90% by day 30 (needed for autonomy level 2) |
| Posts on time | ≥ 95% |
| Disclosure compliance on collab posts | 100% |

## 4. Reports

- Daily: listener brief (internal).
- Weekly (Monday): analyst report, reviewed by the strategist, then in the client portal. Format: `templates/reports.md`.
- Monthly: review + proposals that become part of the next Gate A.
- Quarterly: share of voice and audience quality review with the client.
