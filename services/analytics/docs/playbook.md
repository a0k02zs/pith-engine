# Analytics and attribution · strategy playbook

## 1. The promise to the client

"We show you which marketing spend makes money, and what to change next week."

The client gets 3 things:
1. **One true number set.** One dashboard with the same KPI names across all channels and all Pith services.
2. **An answer on credit.** Which channel, campaign and creative earned each sale or each B2B opportunity.
3. **A decision.** Each report ends with what to change, how much money moves, and what we expect.

## 2. Who buys it

| Buyer | Their question | What we lead with |
|-------|----------------|-------------------|
| B2C e-commerce, CMO or founder | "Which ads really make sales after iOS privacy changes?" | Server-side tracking, MMM, geo tests |
| B2C app or subscription | "What is my real cost per paying user?" | Cohort ROI, payback period, lifetime value by channel |
| B2B SaaS or services, VP marketing | "Which marketing creates pipeline that closes?" | CRM attribution to opportunity and revenue, ABM account view |
| Any Pith client on 2 or more services | "Is Pith worth the money?" | Pith ROI report across all services (included in every retainer) |

## 3. The 3 tiers

Tier names are for the sales deck. Prices are not set in this file. The head of growth sets them.

| | **Measure** | **Attribute** | **Optimise** |
|---|---|---|---|
| For | Clients with under 3 paid channels or under 12 months of data | Most clients | Clients with high spend across 4 or more channels and 2 or more years of data |
| Tracking audit and fix | Yes | Yes | Yes |
| Tracking plan and tag setup (client-side) | Yes | Yes | Yes |
| Server-side tracking and conversion APIs | No | Yes | Yes |
| Dashboard (Looker Studio) | Yes | Yes | Yes |
| Weekly AI report | Yes | Yes | Yes |
| Rule-based attribution (last touch, position-based) | Yes | Yes | Yes |
| Data-driven attribution | No | Yes | Yes |
| CRM revenue attribution (B2B) | No | Yes | Yes |
| Incrementality tests (holdout or geo test) | No | 1 per quarter | 1 per month |
| Marketing mix model | No | No | Yes, refit each quarter |
| Budget scenario planner | No | No | Yes |
| Monthly ROI review call | No | Yes | Yes |

## 4. The method ladder

No single model is true. We use 4 methods. Each one checks the others.

| Rung | Method | What it answers | When we trust it | Weak spot |
|------|--------|-----------------|------------------|-----------|
| 1 | Platform numbers (Meta, Google, LinkedIn) | What each platform claims | Only to optimise inside 1 platform | Each platform counts the same sale. Sum of platforms is often 1.5 to 3 times real sales. |
| 2 | Multi-touch attribution (MTA) | Which touches came before a conversion | Day-to-day decisions on campaigns and creative | Misses views, offline, and users who refuse cookies |
| 3 | Incrementality test | What would happen with no spend | The final answer for 1 channel at 1 time | Costs money and time; tests 1 thing at a time |
| 4 | Marketing mix model (MMM) | The return of each channel, from weekly totals | Budget split across channels, each quarter | Needs 1 to 2 years of weekly data; slow to react |

**Rule of use:**
- Use MTA for weekly decisions inside a channel.
- Use MMM for quarterly budget split across channels.
- Use incrementality tests to calibrate both. When a test result exists, the MMM uses it as a prior, and the report shows the test result next to the MTA number.
- Never report a sum of platform numbers as total revenue. Report deduplicated revenue from the warehouse, and show the platform claim only as a ratio ("Meta claims 1.8 times what the warehouse can join").

## 5. Attribution models we ship

| Model | Use | Default for |
|-------|-----|-------------|
| Last non-direct click | Baseline. Easy to explain. | Measure tier |
| Position-based (40/20/40) | Gives credit to the first and the last touch | B2C with short paths |
| Time decay (7-day half-life) | Gives more credit to recent touches | Promotions and short sales |
| Data-driven, code `data_driven` (Markov removal effect) | Credit from how much conversion drops when a channel is removed | Attribute and Optimise tiers, when there are 300 or more conversions in 30 days |
| B2B account-based | Credit to all touches on all contacts of the account, inside a window before the opportunity is made | B2B, with CRM opportunity data |

Lookback windows: 30 days for B2C, 90 days for B2B (to opportunity created), 180 days for B2B enterprise (to closed won). The client brain stores the windows for each client.

## 6. Client journey

| Week | Step | Output | Gate |
|------|------|--------|------|
| 0 | Intake form and access to accounts | `templates/intake-form.md` filled | |
| 1 | Measurement audit | `templates/measurement-audit.md` | G1 audit sign-off |
| 1 to 2 | Tracking plan | `templates/tracking-plan.yaml` | G2 tracking plan |
| 2 to 3 | Implementation in a test container, then live | Tags, server container, conversion APIs | G3 tracking go-live |
| 3 to 4 | Warehouse join and dashboard | Looker Studio dashboard | |
| 4 onward | Weekly report | `templates/weekly-report.md` | G4 report review |
| Each month | ROI report and call | `templates/monthly-roi-report.md` | G4 report review |
| Each quarter | Incrementality test | `templates/incrementality-test.md` | G5 test design |
| Each quarter (Optimise) | MMM refit and budget plan | `templates/mmm-readout.md` | G6 MMM and budget advice |

## 7. Data rules

1. **Consent first.** We store and join only events that the consent state allows. In the UK and EU, Google Consent Mode v2 sends cookieless pings when consent is refused; we report modelled conversions as "modelled", never as observed.
2. **One source of truth.** Revenue comes from the order system or the CRM, not from ad platforms.
3. **No personal data in reports.** Reports show totals. The minimum cell size is 20 people. Smaller cells show "under 20".
4. **Data stays in region.** The warehouse dataset location follows `markets.md`.
5. **Every number has a label.** Each figure in a report is one of: observed, modelled, estimated (model output), or platform-reported.
6. **Change log.** Every change to tags, models or windows goes in the client change log with a date. Reports mark weeks after a change.

## 8. What an agent can do alone, and what it cannot

Agents can: audit tags, draft tracking plans, run data checks, run models, draft reports, open fix tickets, send anomaly alerts to Pith staff.

Agents cannot (engine rule plus service rule):
- Publish a tag or pixel to a live site (gate G3).
- Send a report or a number to the client without a person's review (gate G4).
- Advise a budget shift. They can draft it, but the strategist signs it (gate G6). Only a person can move the budget (engine rule).
- Turn off spend for a holdout test (gate G5).
- Export personal data out of its region.

## 9. Pricing logic (for the head of growth)

The service is sold in tiers, and it is also bundled at Measure level into every Pith retainer, because every service needs proof of ROI. Upsell triggers: client spend crosses 4 paid channels; client reaches 12 months of clean weekly data (MMM is possible); the sum of platform claims is over 1.5 times warehouse revenue (the client needs an independent view).
