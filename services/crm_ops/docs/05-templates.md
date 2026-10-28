# Templates (T1 to T7)

Version 1 · 21 Oct 2026. Fields in `{{double braces}}` are filled by an agent or a person.

---

## T1 · CRM audit report

**Client:** {{client_name}} · **CRM:** {{platform}} {{tier}} · **Date:** {{date}} · **Auditor:** CRM Auditor agent, reviewed by {{ops_lead}}

**1. Summary (3 lines maximum)**
{{summary}}

**2. Health score:** {{score}} / 100

| Check | Result | Target | Status |
|---|---|---|---|
| Total contacts / companies / open deals | {{n}} / {{n}} / {{n}} | — | — |
| Duplicate contacts (exact email) | {{pct}} | < 1% | {{ok/fail}} |
| Possible duplicates (name + company) | {{pct}} | < 3% | |
| Contacts with no country | {{pct}} | < 2% | |
| Contacts with a marketing send and no consent record | {{n}} | 0 | |
| Contacts with no original source | {{pct}} | < 5% | |
| Lifecycle stage empty | {{pct}} | 0% | |
| Required fit fields empty (B2B: size, industry, seniority) | {{pct}} | < 20% | |
| Invalid or bounced emails still marked as marketable | {{n}} | 0 | |
| Active workflows / with errors in 30 days | {{n}} / {{n}} | 0 errors | |
| Workflows with no owner or no description | {{n}} | 0 | |
| Users with admin rights | {{n}} | ≤ 3 | |
| Open deals with no close date or amount | {{pct}} | 0% | |

**3. Top 5 issues by risk** (consent and data loss issues first)
1. {{issue}} — impact: {{impact}} — fix: {{fix}} — effort: {{S/M/L}}

**4. What works and we keep**
{{list}}

**5. Recommended package:** {{Foundation / Growth / Migration}}

---

## T2 · Design document (for gate G1)

**Client:** {{client_name}} · **Version:** {{v}} · **Decision needed by:** {{date}}

1. **Business model:** {{B2B / B2C / both}}. Sales motion: {{inbound / outbound / product-led / retail}}.
2. **Platform:** {{platform}}. Reason: {{reason}}.
3. **Lifecycle stages:** table from `02-lifecycle-and-scoring.md`, with client changes marked.
4. **ICP for the fit score:** size bands {{}}, industries {{}}, buyer functions {{}}, technologies {{}}, sales regions {{}}.
5. **Score thresholds:** MQL at fit ≥ {{40}} and total ≥ {{65}}. Hot at {{80}}.
6. **Routing:** queues {{}}, round-robin members {{}}, special rules {{}}.
7. **SLAs:** hot {{5 min}}, warm {{4 business hours}}.
8. **Nurture tracks in scope:** {{N1, N2, ...}}.
9. **Integrations:** {{list}}.
10. **Markets and rules applied:** {{UK, SG, ...}} (from `08-market-rules.md`).
11. **Data residency:** {{region}}.
12. **Open questions for the client:** {{list}}.

**Approvals (G1):** Client head of sales ☐ · Client head of marketing ☐ · Pith ops lead ☐

---

## T3 · Nurture email templates

The Nurture Writer agent fills these in the client voice from the client brain. Each email has 1 goal and 1 call to action (CTA). Footer blocks come from the market rules (`market-rules.json` → `email_footer`).

### T3-B2B-N1 · Content nurture (5 emails, 21 days)

| # | Day | Subject idea (agent writes 3) | Body goal | CTA |
|---|---|---|---|---|
| 1 | 0 | "Your copy of {{asset_title}}" | Deliver the asset. 1 line on why it matters. | Download |
| 2 | 3 | "{{1 insight from the asset}}" | Expand 1 key point with a number or example. | Read the related article |
| 3 | 7 | "How {{peer_company}} solved {{problem}}" | Short case study: problem, action, result. Use only approved claims. | Read the case study |
| 4 | 14 | "A {{n}}-step checklist for {{job}}" | Practical value. No sales push. | Get the checklist |
| 5 | 21 | "Worth a 20-minute talk?" | Plain text, from the account owner's name. Ask 1 question. | Book a call |

**Example (email 5, UK B2B, plain text):**

> Subject: Worth a 20-minute talk?
>
> Hi {{first_name}},
>
> You downloaded {{asset_title}} a few weeks ago. Teams like {{company}} often ask us about {{problem}} next.
>
> If that is on your list this quarter, I can show you how {{client_name}} handles it in 20 minutes. If not, no problem. I will not chase you.
>
> {{owner_first_name}}
> {{owner_title}}, {{client_name}}
>
> {{email_footer}}

### T3-B2B-N4 · Demo no-show (3 emails, 5 days)

1. Day 0, 1 hour after: "Sorry we missed you" + rebook link.
2. Day 2: a 2-minute recorded demo video + rebook link.
3. Day 5: "Should I close your request?" (a polite last ask; it usually gets the most replies).

### T3-B2C-C1 · Welcome (4 emails, 10 days)

1. Day 0: welcome, brand promise, what to expect, first-order offer (offer approved at G-COPY).
2. Day 2: best sellers or most-loved products, with ratings.
3. Day 5: social proof: reviews or customer content (with rights).
4. Day 9: offer reminder, with the real end date of the offer. Never a fake deadline.

### T3-B2C-C3 · Win-back (3 emails, 21 days)

1. Day 0: "It has been a while" + new arrivals.
2. Day 7: personalized picks from past orders.
3. Day 14: offer (approved by the client). Say the real end date.

---

## T4 · Sales hand-off brief (written by the Handoff Briefer agent)

> **{{grade_emoji}} {{grade}} MQL · {{first_name}} {{last_name}}, {{job_title}} at {{company}}**
> **Why now:** {{1 sentence: the trigger action, for example "Requested a demo after 3 pricing page visits this week"}}
> **Fit:** {{size_band}} employees · {{industry}} · {{country}} · fit {{fit_score}}/50
> **Activity (last 30 days):** {{top 5 actions with dates}}
> **Account:** {{other contacts at the account and their stages}} · ABM tier {{tier or none}} · open deals {{n}}
> **Suggested opener:** {{1 to 2 sentences that reference the actual content they used}}
> **Watch-outs:** {{consent limits, for example "Canada: CASL implied consent expires 2027-03-01"; language "Quebec: reply in French"}}
> **SLA:** first touch by {{due_time local}}

Rules: 120 words maximum. Facts only from the CRM. No guesses about budget or intent. Mark any inferred item with "(inferred)".

---

## T5 · Test plan and test report (UAT)

Minimum 40 test leads. Use test email addresses on a client-owned test domain. Never use real people's data.

| # | Test case | Input | Expected result |
|---|---|---|---|
| 1 | UK B2B demo request, ICP fit | Form demo, UK, VP, ICP size | Grade A, MQL, UK queue, alert < 1 min, task due 5 min |
| 2 | Same, outside business hours | Same, 22:00 UK time | Auto-reply with booking link, SLA starts 09:00 |
| 3 | Duplicate by email | Existing email, new form | Merged, no second record, oldest record kept |
| 4 | Fuzzy duplicate | Same name + company, new email | 2 records, pair in review queue |
| 5 | Free email B2B | gmail.com, demo form | Fit −10 applied |
| 6 | Competitor domain | Competitor email | Disqualified, no send |
| 7 | No country | Form with no country, no IP | `country_unknown`, sends held |
| 8 | Canada Quebec lead | CA-QC, demo | Routed to French rep or Canada queue, French auto-reply |
| 9 | CASL: no consent | CA, consent box not ticked, not a published business address | No marketing email |
| 10 | US B2B no consent box | US, no box | Marketing email allowed (opt-out model), postal address in footer |
| 11 | Germany B2C | DE, single opt-in | Held until double opt-in confirmation |
| 12 | Singapore SMS | SG phone, SMS consent | DNC check before first SMS |
| 13 | Saudi B2B | SA, Sunday 10:00 | Working hours = yes, GCC queue |
| 14 | UAE B2B | AE, Sunday 10:00 | Working hours = no (UAE weekend) |
| 15 | Unsubscribe in Klaviyo | Unsub event | CRM opted out < 5 min, removed from ad audience next sync |
| 16 | Hard bounce | Bounce event | `invalid_email`, engagement = 0 |
| 17 | Score decay | Engagement 40, 30 days no action | Engagement 30 |
| 18 | Sales rejects "bad timing" | Reject | Stage nurture, N5, review date +90 |
| 19 | SLA breach | Hot lead, no touch 15 min | Team lead alert; at 60 min reassigned |
| 20 | Enrichment EU without LIA | NL contact, `lia_on_file` false | Company fields only |
| 21–40 | One test per remaining workflow branch, per nurture track entry and exit, and per integration | | |

**Report:** pass / fail per case, screenshot or log link, severity (blocker, major, minor). Go-live needs 0 blockers and 0 majors on consent cases (9 to 12, 15).

---

## T6 · Go-live checklist (gate G2)

- [ ] Design doc v{{n}} approved at G1 (link)
- [ ] All T5 cases passed, 0 blockers
- [ ] Consent cases all pass
- [ ] Live data cleaned: duplicates merged, invalid emails flagged, contacts without lawful basis suppressed (client approved the list)
- [ ] Sales team trained (1 hour) and has a 1-page guide
- [ ] Routing queues and working hours checked with the sales head
- [ ] Integration users created, tokens stored in the vault, least access
- [ ] Old workflows that overlap are turned off (list attached)
- [ ] Rollback plan: which workflows to turn off, and in what order
- [ ] Daily monitor W10 turned on
- [ ] Market rules for each live market confirmed by local counsel (from the master plan)

**Sign-off:** Pith ops lead ☐ {{date}} · Client ops owner ☐ {{date}}

---

## T7 · Monthly report (Run package)

1. Funnel by market: leads, MQL, SAL, SQL, opportunities, customers. Change from last month.
2. MQL to SQL rate by grade and by source.
3. Median speed to lead, SLA breaches, reassignments.
4. Data quality score and its 5 parts.
5. Nurture: entries, exits to MQL, unsubscribe rate per track.
6. Workflow errors and fixes.
7. Proposed changes for G3 (score, routing, tracks), each with the data and the expected effect.
