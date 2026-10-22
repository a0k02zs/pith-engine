# Service 5: SEO, SEM and GEO — Automation workflow specs

The orchestrator from the shared engine (plan: Inngest, with n8n or Zapier for app glue, and the Claude API for agents) runs these workflows. Each step names its trigger, the agent or tool, the input, the output and the engine call. The machine-readable form is `workflows.yaml`.

Legend: **[A]** automatic step. **[G]** human approval gate (the workflow stops and waits in the approval inbox).

Service events use the engine form `svc.search/<noun>.<verb>` (for example `svc.search/roadmap.approved`). Short names in the tables below (`seo.crawl.completed`, engine `brain.get`) map to engine calls and events in `07-engine-contract.md` §2.

---

## W1. Onboarding and baseline (once per client, then every 6 months)

Trigger: `svc.search/client.onboarded` (sent by the portal when the client buys the service).

| # | Type | Step | Agent / tool | Output |
|---|---|---|---|---|
| 1 | A | Check access to GSC, Bing Webmaster Tools, GA4, Google Ads, Microsoft Ads, CMS, Merchant Center. List what is missing. | `access-checker` (API calls) | Access checklist. Missing items go to the client as tasks. |
| 2 | A | Load the client brain: brand voice, products, personas, approved claims, banned words, competitors, markets. | engine `brain.get` | Context pack |
| 3 | A | Technical crawl (up to 50,000 URLs on Growth). | Screaming Frog CLI or Sitebulb; PageSpeed Insights API; CrUX API | `crawl.json` |
| 4 | A | Write the technical audit. | **A1 Technical auditor** | Audit report (template T1) |
| 5 | A | Pull GSC and Bing queries (16 months), backlink data, competitor gaps. | GSC API, Bing WMT API, Ahrefs or Semrush API | Raw keyword data |
| 6 | A | Build keyword and question clusters for each market. | **A2 Keyword and question researcher** | Cluster sheet (T2) |
| 7 | A | Build the GEO prompt set and run the baseline (3 runs on each engine). | **A3 GEO prompt designer** + GEO tracker | Prompt set (T7), baseline citation share |
| 8 | A | Audit the SEM accounts (if they exist). | **A8 SEM auditor** | SEM audit |
| 9 | A | Draft the 90-day roadmap. Score each item: value × confidence ÷ effort. | **A4 Roadmap planner** | Roadmap (T3) |
| 10 | **G1** | **Approve roadmap.** SEO lead, then client. | approval inbox | Approved roadmap |
| 11 | A | Create tickets for the approved items. | engine `tasks.create` (Asana / Jira / Linear) | Tickets |

SLA: steps 1–9 finish in 5 working days after access is complete.

---

## W2. Technical fix loop (weekly)

Trigger: cron, Monday 06:00 client local time. Also on `seo.crawl.completed`.

| # | Type | Step | Agent / tool | Output |
|---|---|---|---|---|
| 1 | A | Re-crawl changed sections. Compare with the last crawl. | crawler | Diff |
| 2 | A | Classify new issues: critical (indexing, 5xx, noindex on money pages, robots.txt block), high, normal. | **A1** | Issue list |
| 3 | A | Critical issue: send an alert to the SEO lead within 1 hour. | engine `notify` (Slack) | Alert |
| 4 | A | Write dev tickets with exact fix steps and acceptance tests. | **A5 Technical ticket writer** | Tickets in the client dev queue |
| 5 | A | Write or update schema markup (JSON-LD), `robots.txt` advice and `llms.txt`. | **A6 Schema and llms.txt writer** | Code files (T5, T6) |
| 6 | A | Validate schema. | Schema.org validator, Google Rich Results Test | Pass or fail |
| 7 | **G4** | **Approve site changes (weekly batch, never skipped).** The client developer approves any change to robots.txt, canonicals, redirects or templates. Pith never pushes to the client's live site without this. | approval inbox | Approved change |
| 8 | A | After deploy: request indexing (IndexNow for Bing; sitemap ping), re-test. | IndexNow API, GSC URL Inspection API | Verified fix |

---

## W3. Content cluster production (monthly)

Trigger: cron on the 1st of the month, or `seo.roadmap.approved`.

| # | Type | Step | Agent / tool | Output |
|---|---|---|---|---|
| 1 | A | Pick the clusters for this month from the roadmap. | **A4** | Cluster list |
| 2 | A | Pull the top 10 results and AI answers for each target query. Extract what they cover, and their gaps. | SERP API + GEO tracker | SERP and AI answer notes |
| 3 | A | Write a brief per page: intent, the question to answer, outline, facts with sources, entities, internal links, schema type, GEO rules. | **A7 Brief writer** | Brief (T4) |
| 4 | A | Expert input: send 5 to 8 questions to the client expert (form or 20-minute call through Service 7). | engine `tasks.create` | Expert notes |
| 5 | A | Draft the page from the brief and the expert notes. Every fact cites a source from the brief. | **A7b Page drafter** | Draft |
| 6 | A | Automatic checks: brand score, claims check against approved claims, fact-source check (each number has a source), duplicate check, readability, compliance gate for the market. | engine `brand.score`, `compliance.check` | Check report |
| 7 | **G2** | **Expert edit and sign-off.** A subject expert edits the draft and signs it. Their name goes on the page as author or reviewer. | approval inbox | Signed page |
| 8 | A | Publish to the CMS as a draft, with schema, meta tags, hreflang and internal links. | CMS API (WordPress, Webflow, Sanity, Shopify) | CMS draft |
| 9 | **G2b** | **Client publish OK** (only for clients who ask for it in the contract). | approval inbox | Live page |
| 10 | A | Submit to IndexNow and the sitemap. Add the page's queries to rank and GEO tracking. | IndexNow, tracker | Tracking on |
| 11 | A | Repurpose: send the page to Service 4 (social) and Service 1 (email) as a content event. | `svc.search/page.published`, plus `engine/outbound.recorded` (type `posted`, channel `web_page`) | Event |

Long-form assets (whitepapers, research) come from Service 7. W3 uses them as sources. It does not produce them.

---

## W4. GEO monitoring (weekly)

Trigger: cron, Wednesday 03:00 UTC.

| # | Type | Step | Agent / tool | Output |
|---|---|---|---|---|
| 1 | A | Run each tracked prompt on each engine in each market and language. Run 3 times, because answers vary. | AI visibility tracker (for example Profound, Peec AI, Otterly or Semrush AI toolkit) or our own runner on the engines' APIs with web search on | Raw answers |
| 2 | A | Parse: is the client named? Is a client URL cited? Which position? Which competitors? Which sources are cited? Sentiment. | **A9 GEO analyst** | Rows in `geo_observations` |
| 3 | A | Compute citation share, mention share, average position, share of voice vs. competitors. | SQL in the warehouse | Metrics |
| 4 | A | Find the sources that AI engines cite for prompts where the client is missing. Send them to PR (Service 14) and community (Service 18) as targets. | **A9** | Source gap list |
| 5 | A | A drop of more than 10 points on a priority cluster: alert the SEO lead. | engine `notify` | Alert |
| 6 | A | A wrong fact about the client in an AI answer: open a correction task (fix the site source, fix the third-party source, use the engine's feedback form). | **A9** | Correction task |

---

## W5. SEM build and launch

Trigger: `seo.roadmap.approved` with SEM in scope, or `svc.campaigns/brief.approved` from Service 2 when the channel mix includes search.

| # | Type | Step | Agent / tool | Output |
|---|---|---|---|---|
| 1 | A | Pull the converting search terms, SEO clusters and landing pages. | GSC, Google Ads API | Input set |
| 2 | A | Build the account: campaigns per market and language, ad groups by theme, keywords (exact and phrase, plus broad with Smart Bidding only when there are 30+ conversions a month), negatives list, responsive search ads (15 headlines, 4 descriptions), assets (sitelinks, callouts, structured snippets). | **A10 SEM builder** | Build sheet (T8) |
| 3 | A | Set conversion tracking: GA4 import or Google tag, Enhanced Conversions, offline conversion import from CRM for B2B. Consent Mode v2 in the UK and EU. | engine `analytics.events` | Tracking plan |
| 4 | A | Check: brand score, claims, character limits, trademark terms, restricted categories, market rules. | engine `compliance.check` + Google Ads policy pre-check | Check report |
| 5 | **G3** | **Approve launch and budget.** Performance lead and client approve the build, daily budgets, bid strategy and target CPA or ROAS. The budget is signed by the client. | approval inbox | Approved launch |
| 6 | A | Push to Google Ads and Microsoft Ads as paused. Set account-level daily caps. Then enable. | Google Ads API, Microsoft Advertising API (import from Google) | Live campaigns |

---

## W6. SEM optimization (daily)

Trigger: cron, 07:00 client local time.

| # | Type | Step | Agent / tool | Output |
|---|---|---|---|---|
| 1 | A | Pull yesterday's and the last 7 and 30 days' data. | Ads APIs | Data |
| 2 | A | Mine search terms: add negatives for irrelevant terms; propose new keywords for converting terms. | **A11 SEM optimizer** | Change list |
| 3 | A | Move budget between campaigns in the same market, inside the approved total. Each move is at most 20% of a campaign's budget. | **A11** | Change list |
| 4 | A | Pause ads and keywords that spent 2× target CPA with 0 conversions. Pause a campaign at 50% above target CPA for 3 days in a row (master plan rule). | **A11** | Change list |
| 5 | A | Apply the changes inside the guardrails. Log every change with the reason. | Ads APIs, engine `audit.log` | Applied changes |
| 6 | **G3b** | **Approve budget change.** Any change that raises the total, moves more than 20%, starts a new campaign, or changes the bid strategy waits for the performance lead. | approval inbox | Approved change |
| 7 | A | Spend anomaly (more than 150% of daily budget pace, or CPC jump of more than 50%): pause the campaign and alert. | engine `notify` | Alert |
| 8 | A | Ad copy tests: when an ad has 2,000+ impressions and is in the bottom 25% for CTR, the agent writes 3 new headlines. They go to G3c (creative check, can be batched weekly). | **A10** | New ad text |

---

## W7. Reporting (monthly, plus weekly for Enterprise)

Trigger: cron, 2nd working day of the month.

| # | Type | Step | Agent / tool | Output |
|---|---|---|---|---|
| 1 | A | Pull KPIs from the warehouse (see `06-kpis-and-gates.md`). | engine `metrics.get` | KPI table |
| 2 | A | Write the report: what changed, why, what we do next. Plain language. | **A12 Search reporter** | Report (T9) |
| 3 | **G5** | **Strategist review.** The strategist checks the numbers and the next steps before the client sees it. | approval inbox | Approved report |
| 4 | A | Send to the client portal and email. Store lessons in the client brain. | engine `brain.update`, `notify` | Sent |

---

## W8. Content refresh (monthly)

Trigger: cron, 15th of the month.

| # | Type | Step | Agent / tool | Output |
|---|---|---|---|---|
| 1 | A | Find decaying pages: organic clicks down 20%+ over 3 months vs. the prior 3, or GEO citation loss, or facts older than 12 months. | GSC API, `geo_observations` | Refresh list |
| 2 | A | Write a refresh brief (what to update, new facts, new questions). | **A7** | Refresh brief |
| 3 | — | Back to W3 from step 5. | | |
