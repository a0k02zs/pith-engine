# CRO and Landing Pages: Strategy Playbook

Service 17 of the [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67). Owner: CRO lead (role `cro_lead`). Status: v1, 21 Oct 2026.

## 1. What this service is

CRO means conversion rate optimization. The goal is to turn more visitors into leads and sales. A better page lowers the cost of every paid and organic channel, so this service raises the return of all other services.

The service has 2 tracks. Both use the same agents, templates, gates and engine.

| Track | What it makes | Who asks for it | Rhythm |
|---|---|---|---|
| A. Landing page production | New pages for campaigns, ads, ABM accounts, webinars and offers | Campaigns (2), ABM (8), Paid social (11), Search (5), Events (16), the client | On request. Target: 5 working days from brief to live page |
| B. Optimization program | A/B tests and fixes on live pages, forms and checkouts | The CRO lead, from the audit and the backlog | Continuous. 1 to 8 tests per month, by package |

A new page from track A enters track B after 2 weeks of live data.

## 2. Packages we sell

These are volume tiers, not prices. Pith sets the prices.

| Package | Fit | Tests per month | New landing pages per month | Includes |
|---|---|---|---|---|
| Starter | Under 30,000 sessions a month, or 1 key funnel | 1 (or fix-and-monitor when traffic is too low, section 5.6) | 2 | Audit, backlog, monthly report |
| Growth | 30,000 to 300,000 sessions a month | 2 to 4 | 4 | Audit, backlog, tests, personalization by market, weekly report |
| Scale | Over 300,000 sessions a month, or many markets | 4 to 8 | 8 | All of Growth, plus checkout and pricing-page tests, ABM page variants, quarterly research sprint |

## 3. Plays by client type

### 3.1 B2B (lead generation)

- Primary conversion: a qualified form submit or a booked meeting, not any form submit. Read the lead stage from the CRM through the engine.
- Core pages: demo request, pricing, free trial sign-up, gated content, webinar sign-up, ABM account pages.
- High-value tests:
  1. Form length and field order. Fewer fields first; enrich the rest from the data layer.
  2. Instant booking (calendar on the thank-you step) against "sales will contact you".
  3. Proof near the call to action: logos from the same industry and market, a named case study, G2 badges.
  4. Pricing page clarity: plan comparison, "talk to sales" placement, annual against monthly default.
  5. Personalization by industry, market or ABM tier (headline, logos, case study).
- Guardrail: lead quality. A test that adds form submits but lowers the SQL rate is a loss.

### 3.2 B2C (e-commerce and apps)

- Primary conversion: an order, a sign-up or an app install. Primary money metric: revenue per visitor.
- Core pages: product page, collection page, cart, checkout, offer landing page, app download page.
- High-value tests:
  1. Local payment methods and buy-now-pay-later in the first checkout view (section 6 of `05-market-rules.md`).
  2. Delivery date and returns promise near the "add to basket" button.
  3. Reviews and user content above the fold on product pages.
  4. Mobile layout: sticky add-to-basket button, thumb-reach controls, faster images.
  5. Offer framing: bundle against discount, free-delivery threshold.
- Guardrails: refund rate, average order value, page speed.

## 4. The CRO method (the loop)

Every test follows 1 loop. The pipeline in `02-pipeline.md` runs it.

1. **Measure.** Check that tracking is correct before any test. Service 12 owns the tracking plan.
2. **Research.** Find where and why visitors drop off. Use 4 evidence types: analytics funnels, heatmaps and session recordings, on-page surveys, and customer voice (reviews, sales calls, support tickets).
3. **Hypothesis.** Write each idea as: "Because we saw [evidence], we expect that [change] for [audience] will move [primary metric] by [minimum effect], and we will not harm [guardrail]."
4. **Prioritize.** Score with the model in section 5.1.
5. **Design the test.** Fix the primary metric, guardrails, sample size and run time before launch. Write them in the test plan. Do not change them during the test.
6. **Build and QA.** Make the variant from brand templates. Check every browser, device, language and market.
7. **Run.** Do not stop early unless a guardrail breaks or the test uses a sequential method.
8. **Decide.** Apply the decision rules in section 5.4.
9. **Learn.** Store the result, win or lose, in the client brain. A loss is also a learning.

## 5. Test rules

### 5.1 Priority score

Score each hypothesis from 1 to 5 on 3 parts. Priority = Impact × Confidence ÷ Effort.

| Part | 1 | 3 | 5 |
|---|---|---|---|
| Impact | Low-traffic page, small expected change | Mid-funnel page, medium change | Top page or checkout, large expected change |
| Confidence | An idea with no evidence | 1 evidence type supports it | 2 or more evidence types, or a past win on a similar page |
| Effort | Under 1 day of build | 2 to 3 days | 1 week or more, or developer work |

Effort is in the divisor, so a score of 5 means high effort and lowers the priority.

### 5.2 Statistics standard

| Setting | Default | Note |
|---|---|---|
| Method | Fixed-horizon frequentist test, 2-sided | Use the platform's sequential or Bayesian engine only when the test plan names it before launch |
| Significance level (alpha) | 0.05 | 0.10 is allowed for low-risk copy tests, and the test plan must say so |
| Power | 0.80 | |
| Minimum detectable effect (MDE) | Relative 10% for B2C, 15% for B2B | The smallest lift worth the build cost |
| Minimum run time | 14 days (2 full weekly cycles) | Covers weekday and weekend behaviour; in the GCC the weekend days differ by country |
| Maximum run time | 42 days | After this, cookie loss and seasonality damage the result |
| Traffic split | 50/50 for 2 arms | Equal arms give the most power |
| Variants | At most 3 arms (control plus 2) | More arms need more traffic and a correction for multiple comparisons |

The tool `tools/cro-stats.mjs` computes sample size, run time, the sample ratio check and the result.

### 5.3 Quality checks during a test

1. **Sample ratio mismatch (SRM).** Run a chi-square test on the visitor split each day. If p < 0.001, stop the test. The split is broken, so the result is not valid.
2. **Guardrails.** Check the guardrail metrics each day. If a guardrail is significantly worse (p < 0.01) or page errors rise, stop the test and open an escalation.
3. **No peeking.** The dashboard shows the primary result only after the planned sample size is reached, unless the test uses a sequential method.
4. **Events and seasons.** Do not start a test that crosses a major sale or holiday in its market (for example Black Friday, Ramadan, 11.11). Pause new starts 3 days before such an event.

### 5.4 Decision rules

| Result | Decision |
|---|---|
| Variant better, p < alpha, guardrails not harmed | Propose **ship**. The CRO lead approves (gate G4). |
| Variant worse, p < alpha | **Reject.** Log the loss and the learning. |
| No significant difference at full sample | **Inconclusive.** Keep the control. The CRO lead may ship the variant only for a non-metric reason (for example, simpler to maintain), and must log that reason. |
| SRM failed or tracking broken | **Invalid.** Fix and rerun. Do not use the data. |
| Primary metric better, guardrail worse | **Hold.** The CRO lead and the client decide. |

### 5.5 What we never test

- Fake urgency or scarcity: countdown timers that reset, "only 2 left" when it is not true.
- Hidden costs, pre-ticked consent boxes, confirmshaming ("No, I do not want to save money").
- Different prices for the same product to different people, unless the client's legal team approves and local law permits it.
- New claims (health, finance, legal, "best", "number 1") that are not on the client's approved claims list.
- Anything that removes or hides consent, privacy or unsubscribe text.

The compliance gate blocks these. The governance rules in the plan also stop an agent from publishing a new claim or price alone.

### 5.6 Low-traffic rule

If a test needs more than 42 days to reach its sample size, do not run it as an A/B test. Choose 1 of these:

1. Test a bolder change, so the MDE is larger.
2. Test higher in the funnel (for example, clicks to the form instead of submits).
3. Fix and monitor: ship a change that research strongly supports, then compare 4 weeks before and 4 weeks after. Label the result "not a controlled test".

## 6. Landing page standards (track A)

Every page from track A meets these standards before launch.

1. **1 page, 1 goal.** 1 primary call to action. Remove main navigation on paid-traffic pages.
2. **Message match.** The headline repeats the promise of the ad, email or post that sent the visitor.
3. **Above the fold on mobile (375 px wide):** headline, 1 line of value, the call to action and 1 proof element.
4. **Speed:** Core Web Vitals pass at the 75th percentile: LCP under 2.5 s, INP under 200 ms, CLS under 0.1.
5. **Accessibility:** WCAG 2.2 level AA. This covers contrast, labels, keyboard use and focus order.
6. **Market fit:** local language, currency, date format, payment methods, trust marks and legal text from `05-market-rules.md`. Arabic pages use a right-to-left layout.
7. **Tracking:** UTM parameters kept on the form, and events named as in the engine analytics spec.
8. **Consent:** forms collect consent per channel and purpose through the engine. Check boxes are never pre-ticked.
9. **Ownership:** each page has an owner, an end date or a review date, and an archive plan. Old offer pages redirect after the end date.

## 7. What this service gives other services

| Service | What CRO gives |
|---|---|
| 2 Campaigns | The campaign landing page and its A/B test plan |
| 5 Search | Landing pages with high quality score; test results for ad copy |
| 8 ABM | Account and industry page variants; personalization rules |
| 11 Paid social | Message-matched pages per ad set; test learnings for creative |
| 12 Analytics | Test results and lift for attribution models |
| 16 Events | Webinar and event sign-up pages |
| 1 Email, 10 Messaging | Better post-click pages for every send |
