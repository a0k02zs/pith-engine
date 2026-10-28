# Lifecycle stages and lead scoring model

Version 1 · 21 Oct 2026. Machine format: `lead-scoring.json`.

These are the Pith M default values. Each client starts from these values. The client changes them at gate G1. All point values and thresholds are starting estimates, not measured data. The Scoring Analyst agent tunes them after 60 days of real data (see section 6).

## 1. B2B lifecycle stages

Each stage has an entry rule. A contact moves forward only. A contact moves back only through the recycle flow (W8), which sets the stage to `nurture`.

| # | Stage | API value | Entry rule | Owner |
|---|---|---|---|---|
| 1 | Subscriber | `subscriber` | Opted in to content only (newsletter, blog) | Marketing |
| 2 | Lead | `lead` | Gave contact details on a form, event or import, with a lawful basis for the country | Marketing |
| 3 | Marketing-qualified lead (MQL) | `mql` | Fit score ≥ 40 **and** total score ≥ 65, **or** a hand-raise (demo, pricing, contact sales) with fit score ≥ 25 | Marketing |
| 4 | Sales-accepted lead (SAL) | `sal` | A sales rep accepts the MQL within the SLA | Sales |
| 5 | Sales-qualified lead (SQL) | `sql` | Rep confirms need, authority and a timeline (for example BANT or MEDDIC fields filled) | Sales |
| 6 | Opportunity | `opportunity` | Deal created with an amount and a close date | Sales |
| 7 | Customer | `customer` | Deal closed-won | Account management |
| 8 | Evangelist | `evangelist` | Customer with NPS ≥ 9, or a case study, review or referral | Account management |
| — | Nurture (recycled) | `nurture` | Rejected by sales with a reason, or closed-lost, or no activity for 90 days at MQL or SAL | Marketing |
| — | Disqualified | `disqualified` | Competitor, student, job seeker, spam, or outside all 5 markets | Nobody (suppress) |

**Engine mapping.** Engine contract v0.1.0 has the stages `subscriber`, `lead`, `mql`, `sql`, `opportunity`, `customer`, `evangelist`, `churned` and `other`. The engine added `sal`, `nurture` and `disqualified` on 21 Oct 2026 at our request, so all 10 stages map 1 to 1. A disqualified contact is also `suppressed` in the engine.

**Sales rejection reasons** (required picklist): `bad_fit`, `no_budget`, `bad_timing`, `no_response`, `already_customer`, `competitor`, `duplicate`, `other`. The reason sets the recycle path in W8.

## 2. B2C lifecycle stages

| # | Stage | API value | Entry rule |
|---|---|---|---|
| 1 | Subscriber | `subscriber` | Opted in to marketing with a valid consent for the country |
| 2 | Engaged | `engaged` | Clicked, browsed 2+ product pages or added to cart in the last 30 days |
| 3 | First-time customer | `first_purchase` | 1 order |
| 4 | Repeat customer | `repeat` | 2+ orders |
| 5 | VIP | `vip` | Top 10% by 12-month revenue, or 4+ orders in 12 months |
| 6 | At risk | `at_risk` | No order for 1.5 × the client's median time between orders |
| 7 | Lapsed | `lapsed` | No order for 3 × the median time between orders, or 365 days |
| — | Sunset | `sunset` | No open or click for 180 days. Send the re-permission flow, then suppress |

B2C clients usually do not use an MQL. They use a **propensity score** (likely to buy in 30 days) and **RFM** (recency, frequency, monetary) segments. See section 4.

## 3. B2B lead score

The score has 2 parts. **Fit** shows if the company and person match the ideal customer profile (ICP). **Engagement** shows interest. Total score = fit + engagement. Fit is 0 to 50. Engagement is 0 to 50 (capped).

### 3.1 Fit score (0 to 50)

| Attribute | Value | Points |
|---|---|---|
| Company size (employees) | Inside the ICP band | +15 |
| | One band next to the ICP band | +7 |
| | Outside | 0 |
| Industry | ICP industry | +10 |
| | Next-best industry | +5 |
| Job seniority | C-level, VP, head of, director | +10 |
| | Manager | +6 |
| | Individual contributor | +2 |
| Job function | Buyer function (from the client ICP) | +8 |
| Country | In one of the 5 Pith markets and a client sales region | +5 |
| Tech stack | Uses an ICP technology (from Clay, Apollo or BuiltWith data) | +2 |
| **Negative** | Personal email domain (gmail.com, outlook.com and so on) for B2B | −10 |
| | Student, job seeker or competitor domain | Set to `disqualified` |

The fit score cannot go below 0.

### 3.2 Engagement score (0 to 50, with decay)

| Action | Points | Max per 30 days |
|---|---|---|
| Demo request, contact sales, pricing form (hand-raise) | +30 | — (also fast-tracks to MQL) |
| Pricing page visit | +10 | 20 |
| Webinar attended | +10 | 20 |
| Webinar registered, no attendance | +3 | 6 |
| Gated content download (whitepaper, report) | +8 | 16 |
| Case study page or product page visit | +3 | 12 |
| Email click | +2 | 10 |
| Email open | 0 | — (Apple Mail Privacy Protection makes opens unreliable) |
| Event or trade show badge scan | +8 | 16 |
| Free trial start (product-led clients) | +25 | — |
| Product active in trial: key action done (client defines it) | +10 | 20 |
| ABM intent surge for the account (from service 8) | +10 | 10 |
| LinkedIn ad lead form | +8 | 16 |
| **Negative** | Unsubscribe from all marketing | −20 |
| | Hard bounce | Set engagement to 0 and flag the record |
| | Careers page visit | −5 |

**Decay.** Engagement points lose 25% of their value each 30 days with no new engagement action. This stops old interest from staying "hot". Fit points do not decay.

**Account roll-up (B2B).** The account engagement score is the sum of the top 3 contact engagement scores at that account, capped at 100. ABM (service 8) uses this value.

### 3.3 Thresholds and grades

| Grade | Rule | Action |
|---|---|---|
| **Hot (A)** | Hand-raise with fit ≥ 25, or total ≥ 80 with fit ≥ 40 | MQL now. Route in real time. Alert the owner. SLA 5 minutes in business hours |
| **Warm (B)** | Total 65 to 79 with fit ≥ 40 | MQL. Route. SLA 4 business hours |
| **Nurture (C)** | Total 30 to 64, or fit < 40 | Stay in nurture track. No sales alert |
| **Cold (D)** | Total < 30 | Newsletter only |

## 4. B2C scores

### 4.1 RFM segments

Each customer gets a score of 1 to 5 for each of recency (R), frequency (F) and monetary value (M), by quintile within the client's own customers. Recalculate each night.

| Segment | Rule | Flow |
|---|---|---|
| Champions | R 5, F 4–5, M 4–5 | VIP early access, referral ask |
| Loyal | R 3–5, F 3–5 | Cross-sell, reviews |
| Promising | R 4–5, F 1–2 | Second-purchase flow |
| At risk | R 2, F 3–5 | Win-back with offer (offer needs client approval) |
| Hibernating | R 1, F 1–2 | Sunset and re-permission |

### 4.2 Propensity score (optional, Growth package)

A model predicts the chance of a purchase in the next 30 days. Inputs: RFM, browse events, cart events, email clicks, discount use. Start with the built-in model of the platform (Klaviyo predictive analytics or HubSpot predictive scoring). Build a custom model only after 12 months of order data.

## 5. Routing and SLAs (B2B)

| Rule order | Condition | Route to |
|---|---|---|
| 1 | Account already has an owner (existing customer or open deal) | That account owner |
| 2 | Account is on the ABM tier 1 list | The named ABM account owner |
| 3 | Country = Quebec (Canada, province QC) | French-speaking rep, if one exists, else the Canada queue |
| 4 | Country in GCC | GCC rep queue (Arabic-speaking rep for Saudi Arabia, where possible) |
| 5 | Company size ≥ enterprise band | Enterprise team, round-robin |
| 6 | All others | Regional queue for the country (UK, SG, NA, GCC, EU), round-robin, only reps in working hours |

**SLA timers.**

| Grade | First touch SLA | Escalation 1 | Escalation 2 |
|---|---|---|---|
| Hot | 5 minutes (business hours) | 15 minutes: alert the team lead | 60 minutes: reassign to the next rep |
| Warm | 4 business hours | 8 business hours: alert the team lead | 2 business days: reassign |

Business hours follow the local working week of the lead's country. UAE: Monday to Friday. Saudi Arabia, Qatar, Kuwait, Bahrain, Oman: Sunday to Thursday. Other markets: Monday to Friday.

## 6. Score tuning (monthly)

1. After 60 days, the Scoring Analyst agent compares MQLs that became SQL with MQLs that sales rejected.
2. It reports the conversion rate by grade and by each score attribute.
3. It proposes point changes. Each change has the data and the expected effect.
4. A person approves changes at gate G3. The agent never changes live values.
5. Target health: Hot grade converts to SQL at 3× or more the rate of the Warm grade. MQL to SQL rate is 25% to 40%. If the MQL to SQL rate is under 15%, raise the thresholds. If it is over 50%, lower them, because good leads are possibly waiting in nurture.

These target ranges are planning estimates for B2B services. They are not measured benchmarks.
