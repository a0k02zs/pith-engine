# Performance and paid social: strategy playbook

Service 11 of the [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67). Version 0.1, 21 Oct 2026.
Platforms: Meta (Facebook, Instagram), LinkedIn, TikTok, Snapchat. X is an option for Saudi Arabia and Kuwait only.

## 1. What the client buys

Always-on paid social ads that make sales or leads at a target cost. The service runs every day. The Campaigns service (2) uses this service for launches. Between launches, this service keeps the account active.

The client gets:

1. An account structure and a tracking setup that the platforms can learn from.
2. A creative test every 2 weeks, with 10 to 20 new variants.
3. Daily budget moves inside limits that a person sets.
4. A weekly report and a monthly review with the next test plan.

## 2. Goals by client type

| Client type | Main goal | Main KPI | Second KPI |
|---|---|---|---|
| B2C e-commerce | Sales at a target return | ROAS (purchase value ÷ spend) | New-customer CPA |
| B2C lead or app | Sign-ups or installs at a target cost | CPA | Day-7 retention or lead-to-sale rate |
| B2B | Qualified pipeline | Cost per sales-qualified lead (SQL) | Pipeline value ÷ spend |

Rule: B2B accounts optimize for lead quality, not lead count. A cheap lead that sales rejects is a cost, not a result. Send CRM stages back to the platforms (see section 6).

## 3. Platform roles

| Platform | Best use | B2B | B2C | Notes |
|---|---|---|---|---|
| Meta | Scale and conversion for most B2C clients | Retargeting, some SMB targets | Main platform | Advantage+ Sales campaigns for e-commerce with 50+ purchases a week |
| LinkedIn | Reach named job titles and companies | Main platform | Rarely | High cost per click; use Lead Gen Forms and Document Ads; Matched Audiences with ABM (service 8) lists |
| TikTok | Reach under-35 audiences with native video | Rarely | Strong | Creative must look native; Spark Ads with creator posts (service 6) |
| Snapchat | Young B2C audiences, very strong in Saudi Arabia | No | GCC first | Vertical video; AR lenses for big launches only |
| X | Reach in Saudi Arabia and Kuwait | Rarely | GCC only | Use only when the client asks; check brand safety settings |

## 4. Funnel and account structure

Use few campaigns with large ad sets. The platforms need about 50 conversions per ad set per week to leave the learning phase. Many small ad sets never learn.

| Stage | Audience | Share of budget (start point) | Objective |
|---|---|---|---|
| Prospect (cold) | Broad, lookalikes, interests, job titles | 60 to 70% | Conversions or leads |
| Retarget (warm) | Site visitors, video viewers, engagers, CRM leads with no sale | 20 to 30% | Conversions |
| Retain (customer) | Past buyers, for cross-sell and win-back | 0 to 10% | Conversions |

Standard structure for each platform account:

1. 1 prospect campaign per market and objective.
2. 1 retarget campaign per market.
3. 1 test campaign with its own fixed budget (10 to 20% of spend). New creative is tested here first.
4. Winners move from the test campaign to the prospect campaign.

Naming follows `templates/naming-convention.md`. The optimizer agent reads names to find market, stage and test ID. A wrong name breaks the automation.

## 5. Creative testing method

Creative is the main lever on paid social. Targeting is now mostly automatic. So most of our work goes into a steady test cycle.

### 5.1 The 2-week cycle

1. **Plan.** The strategist agent picks 1 variable to test (see the order below) and writes a test card (`templates/creative-test-card.md`).
2. **Make.** The creative agent writes 10 to 20 variants from approved assets and the client brain. Video comes from service 3. Creator content comes from service 6.
3. **Approve.** Creative lead checks brand and claims (gate G2).
4. **Launch.** The variants go into the test campaign with equal budget.
5. **Read.** After the minimum data (5.3), the analyst agent marks each variant win, lose or no result.
6. **Promote.** Winners move to the prospect campaign. Losers stop. Lessons go to the client brain.

### 5.2 What to test, in order

Test the large changes first. Small changes give small results.

1. Concept and angle (problem, outcome, social proof, offer, founder story, comparison).
2. Format (static, carousel, short video, UGC video, document ad on LinkedIn).
3. Hook (first 3 seconds of video, or the headline and first line of a static ad).
4. Offer (discount, free trial, bundle, free shipping, demo, guide).
5. Copy details and call to action.
6. Landing page (with service 17).

Change 1 variable per test. If 2 things change, we cannot know which one caused the result.

### 5.3 When a result counts

Do not call a winner early. A variant needs all 3 of these before a decision:

1. Spend of at least 2 times the target CPA.
2. At least 7 days live, to cover each day of the week.
3. A probability to beat the control of 90% or more (Bayesian test on conversion rate per impression), or at least 30 conversions per variant for a CPA comparison.

Kill rule: stop a variant early when it spends 3 times the target CPA with 0 conversions.

If a test cannot reach the minimum data in 14 days, the budget is too small for this test. Test fewer variants or test on a higher-funnel event (for example add-to-cart), and say so in the report.

### 5.4 Creative fatigue

An ad is tired when 2 of these are true over 7 days, compared with its first 7 live days:

- Click-through rate is down 30% or more.
- CPA is up 25% or more.
- Frequency is above 3.0 for prospect audiences or above 6.0 for retarget audiences.

The fatigue agent then asks for new creative from the same winning angle. It does not stop the ad until a new ad is ready, unless CPA is 50% above target.

## 6. Tracking and data

Each account needs these before the first launch. The launch checklist (gate G3) blocks launch without them.

1. Browser pixel plus a server-side API on each platform: Meta Conversions API, LinkedIn Conversions API, TikTok Events API, Snapchat Conversions API.
2. Event deduplication between the pixel and the server API (the same `event_id`).
3. Consent: in the UK and EU, the pixel fires only after cookie consent. Use consent mode where the platform supports it. The engine data layer is the source of consent.
4. CRM stages sent back as offline conversions for B2B (MQL, SQL, opportunity, won), so the platforms learn lead quality.
5. UTM tags on every ad from `specs/analytics.md` in the engine.
6. Customer lists only from `POST /audiences/resolve` with `channel: "paid_ad"` and `purpose: "marketing"`. Hash all personal data (SHA-256) before upload. Never upload a contact that the engine did not return as eligible for their country.

## 7. Budget rules

These are hard rules. The workflow layer enforces them (engine `specs/workflow.md` §5).

| Rule | Value |
|---|---|
| Who sets the monthly budget | The client, by signed approval (gate G1) |
| Daily cap on each platform account | Monthly budget ÷ days in month × 1.3 |
| Agent budget moves | Between ad sets and campaigns inside 1 client budget, at most once a day |
| A move of more than 20% on 1 campaign in 1 day | Needs a person (gate G4) |
| Any increase of total spend, or any new paid spend | Needs a person (gate G4). An agent can never do this alone. |
| Auto-pause | An ad set with CPA 50% above target for 3 days in a row |
| Spend spike alert | Daily spend 30% above plan, or spend with 0 conversions for 24 hours |
| Test budget | 10 to 20% of the monthly budget, fixed |

## 8. Incrementality

Platform reports over-count, because they take credit for sales that would happen anyway. Once a quarter, run 1 lift test per main platform:

- Meta Conversion Lift or a geo holdout test (switch off ads in matched regions).
- LinkedIn: hold out a share of the ABM account list.
- Report incremental CPA and incremental ROAS next to the platform numbers.

The Analytics service (12) owns the method. This service books the test and the budget.

## 9. Links to other services

| Service | What it gives paid social | What paid social gives back |
|---|---|---|
| 2 Campaigns | Launch briefs and launch budgets | Always-on account, launch ads |
| 3 Video | Video variants in 9:16, 1:1, 4:5, 16:9 | Hook and hold rate data per video |
| 4 Social | Top organic posts to boost | Paid results by angle |
| 6 Influencer | Creator posts with paid usage rights (Spark Ads, partnership ads) | Paid results per creator |
| 8 ABM | Account lists and tiers for LinkedIn | Account engagement data |
| 12 Analytics | Attribution, lift test method, dashboards | Spend and conversion events |
| 17 CRO | Landing pages and tests | Traffic and conversion data per page |

## 10. Weekly rhythm

| Day | What happens | Who |
|---|---|---|
| Every day, 07:00 client time | Optimizer agent reads results, moves budget, pauses, raises alerts | Agent, with gate G4 for big moves |
| Every day | Spend and anomaly check | Agent; alert to performance marketer |
| Monday | Weekly report | Reporter agent, checked by performance marketer (gate G6) |
| Every 2nd Tuesday | New test launch | Strategist and creative agents, gate G2 |
| Monthly | Review, budget plan for next month | Performance marketer and client, gate G1 |
| Quarterly | Lift test and platform rule review | Analytics service and performance marketer |
