# Community and UGC: Strategy Playbook

Service 18 of the Pith M Automation Plan. Owner: head of growth (until a community lead joins). Status: v1, 21 Oct 2026.
Source: [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67), section "Community and UGC".
Engine: contracts v0.1.0 in `/engine/`. This service calls the engine. It does not copy it.

## 1. What this service is

The client gets 3 things from real customers:

| Module | What it makes | Who it serves first |
|---|---|---|
| A. Reviews | More honest reviews on the platforms that buyers check, and a fast, kind reply to every review | B2C and B2B |
| B. UGC (user-generated content) | Photos, videos, quotes and case-study material from customers, with written usage rights | B2C first, B2B for case studies |
| C. Community | A space where customers help each other, give product feedback and become advocates | B2B (product users), B2C (fans and hobby brands) |

Real customer content is trusted more than ads. It is also the lowest-cost content Pith M makes. Other services reuse it: social (4), paid social (11), email (1), CRO product pages (17), content case studies (7), SEO and GEO review signals (5).

## 2. The 5 rules we never break

These rules apply in all 5 markets. The workflow layer enforces them. No client request changes them.

1. **No fake reviews.** No staff, family, agency or bot reviews. No bought reviews. No review swaps. No reviews written by AI for a customer.
2. **No review gating.** Ask every eligible customer, not only happy ones. Never send unhappy customers to a private form and happy ones to a public site. A "happiness check" may route an unhappy customer to support, but the review link goes to everyone.
3. **No suppression.** Never hide, delete or report a true negative review because it is negative. Only report reviews that break the platform's own rules (spam, hate, personal data).
4. **Incentives only where allowed, and never tied to a positive review.** Google and Amazon ban incentives for reviews. Where a platform allows them, the incentive is the same for any star rating, and the review says it was incentivised.
5. **Written rights before reuse.** No customer content goes into an ad, email, web page or post until the owner gives written rights for that use, and every person in it gives consent. No content of a child (under 18) without written guardian consent; we do not pay minors.

**Why:** the US FTC rule on consumer reviews and testimonials (16 CFR Part 465, in force from October 2024), the UK DMCC Act 2024 (banned review practices, CMA fines up to 10% of global turnover, from April 2025), the EU Omnibus Directive and the platform rules (Google, Trustpilot, Amazon) all ban these practices. This is a planning summary, not legal advice. A local lawyer confirms each market before launch.

## 3. Offer packages

Prices are set by the head of growth. These are scope packages, not prices.

| Package | Modules | Fits | Typical monthly volume |
|---|---|---|---|
| Review Engine | A | Local services, e-commerce, SaaS on G2/Capterra | Up to 2,000 review requests, all replies drafted |
| UGC Studio | A + B | DTC brands, hospitality, consumer apps | Review Engine + 30 to 100 UGC pieces with rights |
| Community Builder | C (+ A light) | B2B SaaS, communities of practice, hobby brands | 1 community, up to 5,000 members, weekly programme |
| Full Advocacy | A + B + C | Brands with 10,000+ customers | All modules, advocate programme, monthly insights |

## 4. B2B and B2C differences

| Topic | B2C | B2B |
|---|---|---|
| Review platforms | Google Business Profile, Trustpilot, app stores, Amazon, product reviews on site (Yotpo, Bazaarvoice, Judge.me) | G2, Capterra, TrustRadius, Gartner Peer Insights, Clutch (agencies), Google |
| Best ask moment | After delivery or first use (see §6) | After onboarding success, a renewal, or a high support score |
| UGC type | Unboxing, try-on, before and after, short video | Case study, quote, logo use, webinar talk, LinkedIn post |
| Rights signer | The person | The person **and** the company (logo and name need company approval) |
| Community | Discord, Circle, Facebook Groups, WhatsApp Communities, Telegram (SG) | Slack or Circle, LinkedIn Group, customer advisory board |
| Main KPI | Review count and rating, UGC in ads | Reviews on G2-type sites, referenceable customers, product feedback, retention |

## 5. Lifecycle (8 stages, 6 gates)

| # | Stage | Who does it | Gate | Target time |
|---|---|---|---|---|
| 1 | Onboard and audit | Audit agent: platforms, current rating, reply rate, UGC on hand, community health | G1 Programme plan | Week 1 |
| 2 | Set up | Connect review platforms, store, CRM events, community tool; load templates | G2 Templates (first use and each change) | Week 1 to 2 |
| 3 | Ask for reviews | Review-timing agent + engine audience | none (repeat sends of approved templates) | Daily |
| 4 | Reply to reviews | Reply agent drafts; 4 and 5 star replies auto-post after the trial period; 1 to 3 star replies need a person | G3 Negative and sensitive replies | Within 24 hours |
| 5 | Collect UGC and rights | Scout agent finds content; rights agent asks; owner signs | G4 Rights and ad use | Weekly |
| 6 | Moderate | Moderation agent screens every item and community post | G5 Escalation | Within 1 hour for red items |
| 7 | Run the community | Community host agent: welcome, answers, prompts, events | G5 Escalation | Daily |
| 8 | Insights and report | Insights agent: themes, product feedback, weekly report | G6 Monthly report review | Weekly / monthly |

Gate detail is in `approvals.md`. Workflows are in `workflows/`.

## 6. When to ask for a review

The review-timing agent picks the moment from events. Default delays below. The agent learns per client and moves the delay by up to 50%.

| Business type | Event | Default delay | Channel order |
|---|---|---|---|
| E-commerce, physical product | `order.delivered` | 7 days (14 for products that need use, such as skincare) | Email, then SMS or WhatsApp if consented |
| Restaurant, hotel, local service | `visit.completed` / `stay.checked_out` | 2 to 24 hours | SMS or WhatsApp, then email |
| SaaS / app | `onboarding.completed` or 30 days active | 30 days | In-app prompt, then email |
| B2B service | `project.milestone_accepted`, `renewal.signed`, CSAT 9 to 10 | 3 days | Email from the account manager |
| Any | Support ticket closed as solved | 2 days, if no open ticket | Email |

Limits: 1 request and 1 reminder per order or visit. No more than 1 request per contact in 90 days. Stop at once if the contact reviews, opts out or opens a complaint.

**Happiness check (optional, not gating).** The first message may ask "How did we do?" with 1 to 5 stars. Every answer shows the public review link. Answers of 1 to 3 also open a support ticket. This is allowed because no one is filtered out of the public ask.

## 7. Replying to reviews

| Rating | Reply time | Who posts | Content |
|---|---|---|---|
| 5 and 4 star | 24 hours | Agent, after a 30-day trial where every reply is approved and the edit rate is under 10% | Thank, name 1 specific detail, no copy-paste |
| 3 star | 24 hours | Person approves the agent draft | Thank, own the issue, offer a next step |
| 1 and 2 star | 12 hours in business hours | Person approves; account lead if legal, safety or press risk | Calm, no argument, move to private channel, never share personal data |
| Any with health, safety, legal, discrimination, or a journalist | 1 hour alert | Account lead and client legal | Hold the public reply until approved |

Replies never promise refunds or compensation unless the client's approved answer list allows it. Replies never reveal order data or health data.

## 8. UGC rights levels

| Level | Allowed use | How we get it | Expiry |
|---|---|---|---|
| R1 Organic repost | Repost on the client's own social accounts with credit | Reply "yes" to a hashtag request + link to terms | 12 months |
| R2 Owned channels | R1 + website, email, product pages | E-signature on the short rights form | 24 months |
| R3 Paid ads | R2 + paid ads, including whitelisting (ads from the creator's handle) | E-signature on full rights form; payment or product as stated | 12 months, renewable |
| R4 Case study (B2B) | Name, title, company logo, quote, story | Signed by the person and an authorised company signer | 24 months |

The rights store records: owner, every person shown, level, channels, countries, start, end, payment, and the signed file. The reuse step checks this record before every use. When rights expire, the agent pulls the content from live use and tells the account lead 30 days before.

Any payment for UGC rights is a contract and a payout. A person approves both (plan: "sign a contract or pay a creator" is never done by an agent alone). Paid UGC that we post publicly carries an ad label in every market.

## 9. Community programme

**Platform choice:** B2B: Slack or Circle. B2C: Discord (gaming, tech, young audience), Circle (courses, premium), WhatsApp Communities (GCC, SG), Facebook Groups (SG, older audiences). Pick 1 platform. Do not split a small community.

**Weekly rhythm (default):**

| Day | Item |
|---|---|
| Monday | Welcome thread for new members, weekly topic prompt |
| Wednesday | Tip, tutorial or member spotlight (with consent) |
| Friday | Wins thread, product news from the client |
| Monthly | Live session (AMA, workshop), product feedback round, top-member thanks |

**Member levels:** newcomer, active, contributor, champion. Champions get early access and a direct line to the product team. Champion perks are not tied to reviews (rule 4).

**Community host agent:** welcomes members, answers questions from the client's approved answer list, tags the right person for anything else, and suggests topics. It always says it is an AI assistant (EU AI Act Article 50; good practice in every market).

**Health signals:** active members (posted or reacted in 30 days), share of questions answered within 24 hours, share answered by members (not staff), 90-day retention of new members.

## 10. What goes to other services

| To | What | Rule |
|---|---|---|
| 4 Social | R1+ UGC, review quotes, community wins | Credit the creator |
| 11 Paid social | R3 UGC, review-quote ads | Check rights expiry before each flight |
| 1 Email | R2+ UGC, star rating blocks | Show real, unedited review text |
| 17 CRO | Review widgets, UGC galleries on product pages | Show all ratings, not only 5 star; state how reviews are checked (EU) |
| 7 Content | R4 case studies | Expert and client legal sign-off |
| 5 SEO / GEO | Review schema (only for first-party reviews that Google allows), review themes for FAQ | No self-serving review markup where Google bans it |
| 9 CRM ops | Advocate flag, NPS and review status on the contact | Through the engine data layer |

## 11. Automation level

The plan target is about 60% of steps automatic. In this build: review requests, timing, reminders, 4 and 5 star replies, UGC scouting, rights requests, first-pass moderation, community welcomes and reports are automatic. Negative replies, rights deals, ad use, escalations and payments stay with people.
