# Service 5: SEO, SEM and GEO — Strategy playbook

Owner: SEO lead. Version 1, 21 Oct 2026. Source: [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67), section "SEO / SEM / GEO".

## 1. What the client buys

| Line | Definition | Main result |
|---|---|---|
| SEO | Organic rankings in Google and Bing. | Non-brand organic sessions and conversions. |
| SEM | Paid search ads in Google Ads and Microsoft Ads. | Conversions at a target CPA or ROAS. |
| GEO | Generative engine optimization. AI answer engines (ChatGPT, Gemini, Perplexity, Google AI Overviews and AI Mode, Microsoft Copilot) cite or recommend the client. | AI citation share on tracked prompts. |

The 3 lines share 1 keyword and question map. SEM data tells SEO which terms convert. SEO and GEO pages become SEM landing pages. GEO prompts come from the same question clusters.

## 2. Packages

| Package | For | Scope | Markets |
|---|---|---|---|
| Search Foundation | Small B2C or B2B, 1 site | Audit, technical fixes, 1 cluster per month (4 pages), GEO tracking on 50 prompts, monthly report | 1 |
| Search Growth | Mid-size | Foundation + 2 clusters per month, SEM management up to the agreed spend, GEO on 150 prompts, digital PR link requests via Service 14 | Up to 2 |
| Search Enterprise | Multi-country | Growth + hreflang and international setup, 4+ clusters per month, SEM in all markets, GEO on 400+ prompts in each language, weekly report | 3 to 5 |

SEM fee: a management fee plus a percentage of spend above a floor. The client pays media cost direct to Google and Microsoft. Pith never holds client media money.

## 3. B2B and B2C focus

| Topic | B2B | B2C |
|---|---|---|
| Keyword intent | Problem, solution, comparison ("X vs Y", "best X for Y"), integration, pricing | Product, category, "near me", reviews, how-to, gift and season |
| Page types | Solution pages, comparison pages, glossary, use-case pages, original research | Category and product pages, buying guides, comparisons, FAQ hubs |
| SEM | Microsoft Ads is worth more (LinkedIn profile targeting). Offline conversion import from CRM (SQL, opportunity). | Google Shopping and Performance Max, feed quality, seasonal bid rules |
| GEO | Be listed in "best X tools" answers. Get on review sites (G2, Capterra), analyst lists, Reddit and expert forums. | Be named in product recommendations. Reviews, retailer listings, structured product data, Merchant Center feed. |
| Conversion | Demo, trial, contact (sent to CRM as MQL) | Purchase, add-to-cart, store visit |

## 4. How GEO works (our model)

AI answer engines pick sources in 2 ways: (a) from what the model learned in training, and (b) from a live web search at answer time (retrieval). We can affect (b) directly and (a) slowly.

We work on 5 levers:

1. **Crawl access.** AI crawlers can reach the site. Check robots.txt for OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Google-Extended, ClaudeBot, Claude-SearchBot, Bingbot. The client chooses to allow or block training crawlers. Search crawlers stay allowed.
2. **Ranking in the underlying search.** ChatGPT search and Copilot use Bing. AI Overviews and Gemini use Google. Normal SEO and Bing Webmaster Tools (with IndexNow) still matter.
3. **Quotable content.** Each page answers 1 question in the first 2 sentences. It has facts with numbers, dates and sources, a named expert author, tables, and clear headings phrased as questions.
4. **Entity clarity.** One consistent name, description and facts across the site, Organization schema with `sameAs` links, Wikidata, Google Business Profile, Crunchbase, LinkedIn, review sites.
5. **Third-party mentions.** AI engines cite sources other than the brand: media (Service 14), review sites (Service 18), comparison lists, Reddit, YouTube (Service 3), and partner sites (Service 15).

`llms.txt` is a low-cost extra. No major engine confirms that it uses the file. We ship it, but we do not sell it as a ranking factor.

## 5. Client lifecycle

| Phase | Weeks | Output |
|---|---|---|
| Onboard | 1 | Access to GSC, Bing Webmaster Tools, GA4, Google Ads, Microsoft Ads, CMS, Merchant Center. Client brain entry from the shared engine. |
| Baseline | 1–2 | Technical audit, keyword and question map, GEO baseline (prompt set run 3 times), SEM account audit. |
| Roadmap | 2–3 | 90-day roadmap, ranked by value × confidence ÷ effort. **Gate G1.** |
| Fix | 3–8 | Technical tickets in the client dev queue. Schema and llms.txt. |
| Build | 4 onward | Monthly cluster: briefs, drafts, **gate G2 expert edit**, publish, internal links. |
| SEM | 3 onward | Account build, **gate G3 launch approval**, daily optimization in caps. |
| Measure | Monthly | Report and next-month plan. **Gate G5 strategist review.** |
| Refresh | Every 6 months per page | Decay check; pages that lose traffic or citations get a refresh brief. |

## 6. Hand-offs with other Pith services

| Service | We give | We get |
|---|---|---|
| 7 Content marketing | Question clusters, briefs with SEO and GEO rules | Long-form drafts (whitepapers, research) for SEO pages |
| 9 CRM operations | Lead source fields, offline conversion schema | SQL and revenue data for SEM bidding |
| 12 Analytics | Event list for organic and paid search | Dashboards, attribution |
| 14 PR | Link and citation targets, data stories | Media mentions and backlinks |
| 17 CRO | High-traffic pages and SEM landing pages to test | Test results |
| 18 Community and UGC | Review site targets for GEO | Review volume and rating data |
| 2 Campaigns | Search share of the campaign plan | Campaign brief, budget |

## 7. Rules we always follow

- No page goes live with only AI text. A subject expert edits and signs each page (gate G2).
- No made-up statistics, quotes, reviews or author credentials. Every fact has a source URL in the brief.
- No link buying, private blog networks, cloaking, doorway pages or mass AI pages. These break Google spam policies (scaled content abuse, site reputation abuse).
- No fake reviews. The FTC fake reviews rule (US) and the UK DMCC Act 2024 ban them.
- The SEM agent never raises a budget or starts new spend. A person does.
- Trademark terms of competitors: we do not use them in ad text. Bidding on them needs gate G3 and a country check.
