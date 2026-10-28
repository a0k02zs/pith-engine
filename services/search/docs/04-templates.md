# Service 5: SEO, SEM and GEO — Templates

| ID | Template | Made by | Used at |
|---|---|---|---|
| T1 | Technical audit report | A1 | W1, W2 |
| T2 | Keyword and question cluster sheet | A2 | W1, W3, W5 |
| T3 | 90-day roadmap | A4 | G1 |
| T4 | Content brief | A7 | W3 |
| T5 | JSON-LD schema snippets | A6 | W2, W3 |
| T6 | llms.txt and robots.txt block | A6 | W2 |
| T7 | GEO prompt set | A3 | W1, W4 |
| T8 | SEM build sheet | A10 | W5, G3 |
| T9 | Monthly report | A12 | W7, G5 |

---

## T1. Technical audit report

```markdown
# Technical SEO audit — {{client}} — {{date}}
Score: {{score}}/100 · URLs crawled: {{n}} · Indexable: {{n}} · Indexed (GSC): {{n}}

## Summary
{{3 sentences}}

## Critical issues (fix in weeks 1–2)
| # | Issue | URLs | Example | Fix | Effort |
|---|---|---|---|---|---|

## High issues
(same table)

## Normal issues
(same table)

## AI crawler access
| User agent | Purpose | Allowed now | Recommendation |
|---|---|---|---|
| OAI-SearchBot | ChatGPT search results | | Allow |
| ChatGPT-User | ChatGPT fetches a page for a user | | Allow |
| PerplexityBot | Perplexity search | | Allow |
| Claude-SearchBot | Claude search | | Allow |
| Bingbot | Bing and Copilot (and ChatGPT search data) | | Allow |
| GPTBot / Google-Extended / ClaudeBot / Applebot-Extended | Model training | | Client decision |

## Core Web Vitals (field data, mobile)
LCP {{}} · INP {{}} · CLS {{}} · Pass rate {{}}%
```

---

## T2. Keyword and question cluster sheet (CSV columns)

```
cluster_id, market, language, cluster_name, main_keyword, supporting_keywords, volume, intent, stage, persona, questions, current_url, page_status(new|update|ok), proven_in_sem, priority, owner, month
```

---

## T3. 90-day roadmap

```markdown
# 90-day search roadmap — {{client}} — markets: {{markets}}

## Goals
- {{goal 1, with baseline and target range}}

## Month 1
| Item | Type | Priority score | Owner | Done when |
|---|---|---|---|---|

## Month 2 / Month 3
(same)

## What we need from you
- Month 1: {{developer hours, expert interviews, approvals}}

## Forecast (range, with assumptions)

## Approval (gate G1)
Pith SEO lead: ______  Date: ____
Client: ______  Date: ____
```

---

## T4. Content brief

```markdown
# Brief: {{page title}}
Cluster: {{id}} · Market: {{market}} · Language: {{lang}} · Page type: {{type}} · New or update: {{}}
Target query: {{}} · Intent: {{}} · Persona: {{}} · Stage: {{}}
Word range: {{min}}–{{max}}

## Main question
{{question}}

## Direct answer (top of page, 2 sentences, under 50 words)
{{answer}}

## Outline
- H2: {{}}
  - H3: {{}}

## Facts to use (each with a source)
| Fact | Source URL | Date of source |
|---|---|---|

## What competitors and AI answers say now, and our gap
- Top results cover: {{}}
- AI answers cite: {{domains}}
- Our gap / unique angle: {{original data, expert view, local detail}}

## Entities to name
## Questions for the client expert (5–8)
## Internal links (out: 3–6, in: 2–4)
## SEO fields
Title tag (≤60): {{}} · Meta description (≤155): {{}} · URL slug: {{}} · Schema: {{}} · hreflang set: {{}}

## GEO checklist
- [ ] Direct answer first
- [ ] 1 fact with a number in each main section, with a source
- [ ] At least 1 table or list
- [ ] Named author and expert reviewer, with bio and LinkedIn
- [ ] "Last updated" date visible
- [ ] Sources linked
- [ ] FAQ section with the cluster questions (if they fit)

## Gate G2 sign-off
Expert: ______  Role: ______  Date: ____
```

---

## T5. JSON-LD snippets

Article with author and reviewer:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{title}}",
  "description": "{{meta_description}}",
  "inLanguage": "{{en-GB}}",
  "datePublished": "{{2026-10-21}}",
  "dateModified": "{{2026-10-21}}",
  "author": {"@type": "Person", "name": "{{author}}", "jobTitle": "{{title}}", "sameAs": ["{{linkedin_url}}"]},
  "reviewedBy": {"@type": "Person", "name": "{{expert}}", "sameAs": ["{{linkedin_url}}"]},
  "publisher": {"@type": "Organization", "name": "{{brand}}", "logo": {"@type": "ImageObject", "url": "{{logo_url}}"}},
  "mainEntityOfPage": "{{url}}"
}
```

Organization (home page, once):

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "{{brand}}",
  "legalName": "{{legal_name}}",
  "url": "{{home_url}}",
  "logo": "{{logo_url}}",
  "description": "{{1-sentence description, same wording as on LinkedIn and Crunchbase}}",
  "sameAs": ["{{linkedin}}", "{{wikidata}}", "{{crunchbase}}", "{{g2_or_trustpilot}}", "{{youtube}}"],
  "contactPoint": {"@type": "ContactPoint", "contactType": "sales", "email": "{{email}}", "areaServed": ["GB","SG","US","CA","AE","SA","NL"]}
}
```

Product (B2C):

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{product}}",
  "sku": "{{sku}}",
  "brand": {"@type": "Brand", "name": "{{brand}}"},
  "offers": {"@type": "Offer", "price": "{{price}}", "priceCurrency": "{{GBP}}", "availability": "https://schema.org/InStock", "url": "{{url}}"}
}
```

Add `aggregateRating` only when real reviews are visible on the page. FAQPage markup: use it for clarity, but Google shows FAQ rich results only for a small set of sites, so do not promise them.

---

## T6. llms.txt and robots.txt block

`/llms.txt`:

```markdown
# {{Brand}}

> {{1-paragraph description: what the company does, for whom, where. Same facts as the Organization schema.}}

## Products
- [{{Product}}]({{url}}): {{1 line}}

## Guides
- [{{Guide}}]({{url}}): {{1 line}}

## Company
- [About]({{url}}): {{1 line}}
- [Pricing]({{url}}): {{1 line}}
```

robots.txt block (search bots allowed; training bots per client decision):

```
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

# Training crawlers: client decision at gate G4
User-agent: GPTBot
{{Allow: / | Disallow: /}}

User-agent: Google-Extended
{{Allow: / | Disallow: /}}

User-agent: ClaudeBot
{{Allow: / | Disallow: /}}

Sitemap: {{sitemap_url}}
```

---

## T7. GEO prompt set (CSV columns)

```
prompt_id, market, language, text, type(category|problem|comparison|brand), cluster_id, priority, engines(chatgpt|perplexity|gemini|ai_overviews|copilot), active
```

Observation table (one row per run):

```
run_date, prompt_id, engine, run_no, client_mentioned, client_cited, position, sentiment, competitors_mentioned, cited_domains, wrong_facts
```

---

## T8. SEM build sheet (CSV columns; imports into Google Ads Editor)

Campaigns:
```
campaign, market, language, type(search|pmax|shopping), daily_budget, currency, bid_strategy, target_cpa_or_roas, locations, ad_schedule, status(paused)
```
Ad groups and keywords:
```
campaign, ad_group, keyword, match_type(exact|phrase|broad), final_url, cluster_id
```
Ads:
```
campaign, ad_group, headline_1 … headline_15 (≤30 chars), description_1 … description_4 (≤90 chars), path_1, path_2, final_url
```
Negatives:
```
level(account|campaign|ad_group), target, negative_keyword, match_type
```

Gate G3 sign-off line on the summary sheet: total daily budget, monthly cap, target, approver name, date.

---

## T9. Monthly report

```markdown
# Search report — {{client}} — {{month}}

## In short
{{result}}. {{main reason}}. {{next step}}.

## SEO
| KPI | This month | Last month | Change | Year ago |
|---|---|---|---|---|

## GEO (4-week average; range in brackets)
| KPI | Now | 4 weeks ago | Change |
|---|---|---|---|
Top prompts we won: … · Top prompts we lost: … · Wrong facts open: …

## SEM
| Market | Spend | Conversions | CPA | ROAS | Impression share |
|---|---|---|---|---|---|

## What we did
## What changed and why
## Next month
## What we need from you
```
