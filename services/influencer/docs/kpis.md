# KPIs

Each KPI has its engine code. Shared codes come from `engine/contracts/enums.json` → `kpis`. Codes that start with `influencer.` are service-only (engine naming rule). Every value goes out as `engine/metric.recorded`. Targets are starting estimates. After 3 months, set each client's targets from its own data.

## Outcome KPIs (the client sees these first)

| KPI | Engine code | Formula | Start target | Source |
|---|---|---|---|---|
| Sales from creator codes and links | `attributed_revenue` | sum of order value with creator code or creator UTM | Set per client | Store + analytics |
| Cost per acquisition per creator (CPA) | `cpa` | (fee + product + shipping) ÷ orders from that creator | At or under the client's paid social CPA | Store + deals |
| Return on creator spend (ROCS) | `roas` | creator sales ÷ total creator cost | 1.5 or more by month 3 (B2C) | Store + deals |
| Cost per engagement (CPE) | `cost_per_engagement` | total cost ÷ (likes + comments + shares + saves) | Track trend; compare tiers | Platform APIs |
| Cost per 1,000 views (CPM) | `influencer.cpm` | total cost ÷ views × 1,000 | Under the market band in `playbook.md` | Platform APIs |
| B2B: pipeline created | `attributed_pipeline` | value of opportunities with creator source | Set per client | CRM |
| B2B: cost per qualified lead | `cost_per_sql` | cost ÷ qualified leads from creator source | Set per client | CRM |

## Process KPIs (Pith M runs on these)

| KPI | Engine code | Formula | Target |
|---|---|---|---|
| Outreach reply rate | `reply_rate` | replies ÷ creators contacted | 30% or more |
| Deal close rate | `influencer.deal_close_rate` | contracted ÷ interested | 50% or more |
| Deals closed per week | `influencer.deals_closed` | count of `deal.contracted` | Set by package |
| Time to shortlist | `influencer.days_to_shortlist` | campaign planned → shortlist approved | 5 business days or less |
| On-time posts | `influencer.on_time_post_rate` | posts live in window ÷ posts planned | 90% or more |
| First-pass content approval | `first_pass_approval_rate` | drafts approved in round 1 ÷ drafts | 70% or more |
| Disclosure compliance | `disclosure_compliance` | live posts that pass the stage 9 label check ÷ live posts | 100% |
| Payout on time | `influencer.payout_on_time_rate` | payouts sent within 15 business days ÷ payouts | 100% (target 7 days) |
| Creator rehire rate | `influencer.rehire_rate` | creators with would_rehire true ÷ creators | 60% or more |

## Content reuse KPIs

| KPI | Engine code | Formula | Target |
|---|---|---|---|
| Creator assets reused in ads | `ugc_reuse_count` | count of creator posts run as paid ads | 10% of posts or more |
| Amplified CPA | `cpa` (scope: amplified posts) | ad spend on creator posts ÷ orders | Lower than the client's brand-made ads |
| Hook rate (video) | `hook_rate` | 3-second views ÷ impressions | Compare with Service 3 benchmark |

## Measurement rules

- Every creator has a unique code and a unique UTM link (`utm_source={{creator_handle}}&utm_medium=influencer_post&utm_campaign={{campaign_id}}&utm_content={{creator_id}}`).
- Collect metrics at 24 hours, 7 days and 30 days after each post.
- Codes leak to coupon sites. Report code sales and link sales apart. Flag a code when more than 30% of its orders come from coupon-site referrers.
- Story metrics vanish after 24 hours: the creator sends an insights screenshot, or the creator tool captures them through the creator's connected account.
- Run a holdout test once a client spends over a set monthly amount: hold 1 region or 1 audience out and compare sales lift.

- Also send: `licence_coverage` (share of GCC creators with a verified licence, target 100%) and `takedown_hours` (time to fix or remove a post after a request, target under 24).
