# CRO and Landing Pages: Templates

Status: v1, 21 Oct 2026. The base page code is `templates/landing-page-base.html`.

## 1. Landing page catalogue

Each template uses the same base code and the same section blocks. Only the section order and the form change.

| ID | Template | Use | Primary call to action | Sections in order |
|---|---|---|---|---|
| T1 | Lead gen (gated content) | Whitepaper, report, checklist | "Get the report" | Hero with form, proof bar, what you get (3 points), preview image, testimonial, FAQ, legal footer |
| T2 | Demo or trial | B2B software, services | "Book a demo" or "Start free trial" | Hero, proof bar, 3 benefits, how it works (3 steps), case study, pricing hint or "from" price, FAQ, form, legal footer |
| T3 | Webinar or event | Service 16 | "Save my seat" | Hero with date and local time, speakers, agenda, who it is for, form, add-to-calendar on thank-you, legal footer |
| T4 | E-commerce offer | B2C promotion, product launch | "Add to basket" or "Shop now" | Hero with product, price and offer terms, delivery and returns line, reviews, product benefits, user photos, FAQ, payment marks, legal footer |
| T5 | App download | Apps | Store badges | Hero with device image, 3 benefits, ratings, screenshots, store badges, legal footer |
| T6 | ABM account page | Service 8, tier 1 and tier 2 | "Book a meeting with [owner]" | Personal hero (account name and industry), relevant case study, team contact card, calendar, legal footer |

## 2. Landing page brief (track A intake form)

The calling service or the client fills this. The page planner agent rejects a brief with an empty required field.

| Field | Required | Example |
|---|---|---|
| Client | Yes | `client_123` |
| Calling service | Yes | `campaigns`, `paid_social`, `abm`, `events`, `search`, `client` |
| Goal | Yes | Demo requests from UK finance teams |
| Primary conversion event | Yes | `demo_booked` |
| Offer | Yes | 30-minute demo with a product specialist |
| Audience | Yes | Finance directors, 200 to 2,000 staff |
| Traffic sources | Yes | LinkedIn ads, ad set "FD-UK-Q4" |
| Source copy (ad, email, post) | Yes | "Close your month 3 days faster" |
| Markets and languages | Yes | GB / en-GB |
| Live date and end date | Yes | 2026-11-03 to 2026-12-19 |
| Proof available | No | Case study id `cs_44`, G2 rating from the client brain |
| Template wish | No | T2 |
| Budget owner for paid traffic | Yes when paid | Service 11 |

## 3. Hypothesis card

```
ID:              H-<client>-<number>
Page:            <URL pattern>
Markets/devices: <GB, mobile>
Evidence:        <ids from the research list, with type>
Statement:       Because we saw <evidence>, we expect that <change> for
                 <audience> will move <primary metric> by <minimum effect>,
                 and will not harm <guardrail>.
Primary metric:  <KPI code, for example cvr or revenue_per_visitor>
Guardrails:      <KPI codes with stop rule>
Impact / Confidence / Effort: <1-5> / <1-5> / <1-5>   Priority: <I x C / E>
Flags:           <NEW_CLAIM, NEEDS_FINANCE_APPROVAL, CHECKOUT_CHANGE or none>
```

## 4. Test plan (attached to gate G1 and G3)

```
Test ID:          T-<client>-<number>      Hypothesis: H-<...>
Page and URL:     <...>
Arms:             A control, B <short name of change>[, C <...>]
Split:            50/50 (or 34/33/33)
Audience:         <markets, devices, new or returning, traffic sources>
Primary metric:   <KPI code>  Baseline (28 days): <rate>
MDE (relative):   <10%>   Alpha: <0.05>   Power: <0.80>   Method: <fixed horizon>
Sample per arm:   <from cro-stats plan>
Run time:         <days>  Start: <date>  End: <date>
Calendar check:   <no major sale or holiday in target markets: yes/no>
Guardrails:       <metric: stop if ...>
Stop rules:       SRM p < 0.001 on any day; guardrail worse at p < 0.01;
                  page error rate up 2 times
Decision rules:   01-playbook.md section 5.4
Approvals needed: <G2 kinds, if any>
```

## 5. QA checklist (gate G3)

The QA agent runs it. A person checks the agent's evidence at G3.

**Layout and function**

1. Page renders at 375 px, 768 px and 1440 px with no sideways scroll.
2. Primary call to action is above the fold at 375 px.
3. Every link and button works. The form submits and shows the thank-you state.
4. Latest Chrome, Safari (iOS) and Edge show the page the same.
5. Arabic pages use `dir="rtl"`; layout, icons and form fields mirror correctly.

**Speed and accessibility**

6. Lab LCP under 2.5 s on a mid-range phone profile; CLS under 0.1.
7. Text contrast at least 4.5:1; every form field has a visible label.
8. The whole page works with a keyboard and the focus is visible.

**Content**

9. Headline matches the source ad or email promise.
10. Every claim is on the approved claims list, or has approval at G2.
11. Prices, currency, tax text and offer terms are correct for each market.
12. No banned words from the client brain.

**Consent and legal** (any fail = overall fail)

13. Consent check boxes are not pre-ticked, and each purpose is separate where the market needs it.
14. Privacy notice link and the company identity are present.
15. Cookie banner shows before the test tool and analytics set non-essential cookies, in markets that need consent.
16. Market legal text is present (see `05-market-rules.md`).
17. No fake urgency or scarcity; any countdown matches a real end date.

**Tracking** (any fail = overall fail)

18. Test tool fires and assigns visitors 50/50 in a 200-visit QA sample (within 45% to 55%).
19. Primary and guardrail events fire once per action, with UTM values kept.
20. The test excludes internal traffic and bots.

## 6. Results report (gate G4)

```
Test:            T-<...>   Page: <...>   Dates: <start> to <end> (<days> days)
Decision:        SHIP | REJECT | INCONCLUSIVE | INVALID | HOLD
What we changed: <1 sentence>
Result:          Variant <B> <raised/lowered> <metric> from <a%> to <b%>
                 (relative <+x%>, 95% CI <lo%> to <hi%>, p = <p>).
Guardrails:      <metric: ok / harmed / improved>
Data quality:    SRM <pass/fail>, tracking <ok/issue>
Expected value:  <extra conversions or revenue per month at current traffic,
                 marked as an estimate>
Learning:        <1 sentence that can apply to other pages>
Next step:       <next test or ship ticket>
```

## 7. Monthly client report (outline)

1. Tests finished this month, with decisions.
2. Cumulative lift on the primary metric from shipped winners (estimate, with method).
3. Test win rate this quarter.
4. New landing pages launched, with conversion rate and Core Web Vitals.
5. Backlog: next 3 tests and why.
