# ABM strategy playbook

## 1. Goal

Win named target accounts for each B2B client. Grow pipeline value, win rate and deal size on those accounts. ABM is the B2B service with the highest deal value in the Pith M plan.

## 2. When a client is a fit for ABM

Sell ABM to a client when all of these are true:

- The client sells B2B with an average deal of 25,000 USD (or local equivalent) a year or more.
- The client can name its best customers, or it has CRM data that shows them.
- The client has a sales team that agrees to work the same account list.
- The sales cycle is 2 months or longer, with 3 or more people in the buying decision.

If a client fails 2 or more checks, sell demand generation (Services 1, 5, 11) first.

## 3. Ideal customer profile (ICP)

The ICP agent (`agents/01-icp-account-scorer.md`) builds the ICP from the client's closed-won deals in the last 24 months. The ICP has 4 parts:

| Part | Examples of attributes |
|------|------------------------|
| Firmographic | Industry, employee count, revenue band, ownership (private, listed, government-linked), growth rate |
| Technographic | Tools in the account's stack that the client integrates with or replaces |
| Market | Country and region from the 5 Pith markets; language; public or private sector |
| Situation | Recent funding, new executive, expansion into a new country, a regulation that creates a need |

The account owner approves the ICP once a quarter (gate G1).

## 4. Three tiers

| Tier | Model | Accounts per client | Personalization | Main channels | Human effort |
|------|-------|---------------------|-----------------|---------------|--------------|
| Tier 1 | 1-to-1 | 5 to 25 | Each asset is made for 1 account and for each committee role | Executive email, LinkedIn, custom landing page, direct mail and gifts, events, sales calls | High. Account owner approves every asset |
| Tier 2 | 1-to-few | 25 to 200, in clusters of 5 to 20 | Each asset is made for 1 cluster (same industry, same problem, same market) | Email sequences, LinkedIn ads, cluster landing page, webinars | Medium. Approve the cluster template once |
| Tier 3 | 1-to-many | 200 to 2,000 | Dynamic fields (company name, industry, role) in approved templates | LinkedIn and display ads, intent-triggered email, website personalization | Low. Approve templates only |

Move an account between tiers only at the monthly tier review, or when an account passes the hand-off threshold (it moves up to Tier 1 for the time of the deal).

## 5. Scoring model

Each account has 3 scores from 0 to 100. The engine stores them on the account record.

### 5.1 Fit score (how much the account looks like the best customers)

| Factor | Weight |
|--------|--------|
| Industry match | 25 |
| Size match (employees or revenue) | 20 |
| Technographic match | 20 |
| Market match (Pith market, language, sector) | 15 |
| Situation trigger present | 10 |
| Existing relationship (past customer, partner, warm contact) | 10 |

A fit score is valid for 90 days. The scorer recomputes it every month.

### 5.2 Intent score (how much the account researches the problem now)

| Signal | Points | Decay |
|--------|--------|-------|
| Third-party topic surge (6sense, Demandbase, Bombora) | up to 30 | Half each 14 days |
| Visits to the client's pricing, demo or comparison pages | up to 25 | Half each 7 days |
| Hiring for roles that use the client's product | up to 15 | Half each 30 days |
| Funding, merger, new executive, new country | up to 15 | Half each 60 days |
| Review site research (G2, Capterra) | up to 15 | Half each 14 days |

The cap is 100. The intent agent (`agents/02-intent-monitor.md`) updates it every day.

### 5.3 Engagement score (how much the buying committee responds to us)

| Signal | Points |
|--------|--------|
| Email reply from a committee member | 15 |
| Meeting accepted | 25 |
| Event or webinar attended | 15 |
| Landing page visit from a known contact | 10 |
| LinkedIn ad click from the account | 5 |
| Direct mail accepted or gift redeemed | 10 |
| Content download | 10 |

Points expire after 30 days. Cap 100.

### 5.4 Thresholds

| Name | Rule | Action |
|------|------|--------|
| Target | Fit ≥ 60 | The account can enter the list |
| Tier 1 candidate | Fit ≥ 80 and strategic value set by sales | Shown at gate G1 |
| Surge | Intent ≥ 60, or a rise of 25 or more in 7 days | Start the next play for the tier |
| Hand-off (sales-ready) | Intent ≥ 70 **and** engagement ≥ 40 **and** 2 or more committee members engaged in 14 days | Hand-off agent sends a brief to sales (gate G5) |
| Cool-down | No engagement in 60 days | Move the account to a low-cost nurture for 90 days |

The thresholds are start values. The reporting agent checks them each quarter against won deals and proposes changes. The account owner approves changes.

## 6. Buying committee

For each account, the committee agent finds 5 to 10 people in these roles:

| Role | What they care about | Message angle |
|------|----------------------|---------------|
| Economic buyer | Return, risk, strategy | Business case, peer proof, cost of no action |
| Champion | Making their work better and looking good | Practical gains, internal sell kit |
| Technical evaluator | Fit, security, integration | Architecture, security pack, integration list |
| User lead | Daily work | Time saved, ease, training |
| Procurement or legal | Terms, risk, vendor rules | Standard terms, compliance documents |
| Blocker (if known) | Status quo, other vendor | Proof against the objection |

Coverage target: Tier 1 has 4 or more roles with a named contact; Tier 2 has 3 or more.

## 7. Plays

A play is a set of touches over 4 to 8 weeks. Each play has an entry rule, touches, and an exit rule.

| Play | Tier | Entry | Touches (in order) | Exit |
|------|------|-------|--------------------|------|
| P1 Warm-up | 1, 2, 3 | New on list | 2 weeks of LinkedIn and display ads to the account, before any email | 2 weeks done |
| P2 Executive open | 1 | After P1 | Personal email from a client executive, LinkedIn connection from the account owner, direct mail with a useful item | Reply, meeting, or 4 weeks |
| P3 Insight-led | 1, 2 | After P1 or on surge | Account or cluster research note, email sequence of 4 steps per role, custom or cluster landing page | Meeting or 6 weeks |
| P4 Event | 1, 2 | Event in the market in the next 6 weeks | Invite, reminder, 1-to-1 meeting at the event, follow-up in 24 hours | Event done plus 2 weeks |
| P5 Surge response | 1, 2, 3 | Intent surge | Alert to the account owner in 1 hour, intent-matched ad and email within 2 days | Hand-off or 3 weeks |
| P6 Competitive displacement | 1, 2 | Account uses a named competitor and its contract renewal is in 3 to 9 months | Comparison page, migration guide, peer case study | Meeting or renewal date |
| P7 Expansion | 1, 2 | Account is a current customer | New-product or new-team plays to other business units | Opportunity or 8 weeks |
| P8 Cool-down nurture | all | No engagement in 60 days | 1 useful touch a month, ads at low frequency | Surge or 90 days |

Market changes to plays are in `markets/rules.md`. Example: in the GCC, P4 (event) and in-person meetings come before P2 cold email.

## 8. Cadence

| Cycle | What happens | Who |
|-------|--------------|-----|
| Daily | Intent update, surge alerts, compliance checks on queued touches | Agents |
| Weekly | Account report per client, sales and marketing stand-up of 30 minutes on Tier 1 | Reporting agent, account owner, client sales lead |
| Monthly | Tier review, fit re-score, play results | Account owner, client sales and marketing heads |
| Quarterly | ICP review, threshold review, business review with the client | Head of growth, client leadership |

## 9. Team roles (RACI)

| Activity | Agent | Pith account owner | Client sales lead | Client marketing lead | Client executive |
|----------|-------|--------------------|-------------------|-----------------------|------------------|
| ICP and scoring | R (drafts) | A | C | C | I |
| Account list and tiers | R (drafts) | A | A (joint) | C | I |
| Tier 1 assets | R (drafts) | A | C | C | C (if sender) |
| Tier 2 and 3 templates | R (drafts) | A | I | C | I |
| Direct mail and gifts | R (drafts) | A | C | I | I |
| Sales hand-off | R (brief) | C | A | I | I |
| Weekly report | R (drafts) | A | I | I | I |

R = does the work, A = approves, C = gives input, I = is told.

## 10. Rollout

ABM is in Phase 3 of the plan (with search, paid social and CRO). Market order: UK, Singapore, North America, GCC (UAE and Saudi Arabia first), EU.

- Weeks 1 to 2: connect intent and contact data sources; load the first client ICP.
- Weeks 3 to 4: first account list and tiers; Tier 3 templates live in the UK.
- Weeks 5 to 8: Tier 2 clusters and Tier 1 accounts; first hand-offs; first weekly reports.
- After week 8: add 1 market at a time, in the plan order, after the local rules check.
