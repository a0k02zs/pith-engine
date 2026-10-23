# Service 5: SEO, SEM and GEO — How this service uses the shared engine

Engine contract version: **0.1.0** (`/mnt/project-files/engine/`). Service code: `search` (5).

## 1. Rules from the engine that this service follows

1. Every agent reads the brain first: `GET /clients/{id}/brain`.
2. Every page, ad and schema change goes through `POST /compliance/check`. A `block` stops the step.
3. Every human decision goes through the approval inbox (`approval-item.json`). No private approval flow.
4. Every publish, spend and conversion emits `engine/outbound.recorded` or `engine/metric.recorded`.
5. The 5 "never alone" actions are enforced by the workflow layer. For this service the relevant ones are: raise a budget or start new paid spend, and publish a new claim, price or health/finance/legal statement.

This service does not read contacts and does not send messages to people, so it does not call `POST /audiences/resolve`. Exception: B2B Customer Match lists for Microsoft or Google Ads go through Service 11 (paid social), which owns audience sync.

## 2. Map of short names to engine calls

| Short name in `02-workflows.md` | Engine call or event |
|---|---|
| `brain.get` | `GET /clients/{id}/brain` (brand-profile.json) |
| `brain.update` | `engine/learning.recorded` via `POST /learnings` with `service = "search"` |
| `brand.score` | `check` step with `kinds: ["brand"]`, `min_brand_score: 75` |
| `compliance.check` | `POST /compliance/check`. Channel `web_page` for pages, `paid_ad` for SEM ads, `landing_page` for SEM landing pages. `content.body_html`, `content.locale`, `content.claim_ids`, `content.price_mentions`. `paid.special_ad_category` for SEM. |
| `notify` | Approval item with `priority: urgent`, or `engine/escalation.raised` for crises |
| `tasks.create` | `tool` step, `risk: write_external` (Asana, Jira, Linear) |
| `metrics.get` | Warehouse read (analytics service, 12) |
| `audit.log` | Automatic: every step is logged by the workflow layer |
| spend anomaly | `engine/spend.alert` with `platform: google_ads | microsoft_ads` |
| `seo.crawl.completed` | `svc.search/crawl.completed` |

## 3. Events this service owns (`svc.search/*`)

| Event | Sent when | Payload |
|---|---|---|
| `svc.search/client.onboarded` | Client buys the service; access list submitted | `{client_id, package, markets[], segments[]}` |
| `svc.search/crawl.completed` | A crawl ends | `{client_id, run_id, crawl_id, urls, issues_by_severity}` |
| `svc.search/roadmap.approved` | Gate G1 approved | `{client_id, roadmap_artifact_id, months[3]}` |
| `svc.search/page.published` | A page goes live | `{client_id, artifact_id, url, locale, cluster_id}` — listeners: social (4), email (1), content (7) |
| `svc.search/geo.observed` | Weekly GEO run ends | `{client_id, run_id, market, prompts, citation_share, mention_share}` |
| `svc.search/geo.source_gaps` | GEO finds third-party sources that cite competitors only | `{client_id, market, domains[]}` — listeners: PR (14), community (18), affiliate (15) |
| `svc.search/geo.wrong_fact` | An AI answer states a wrong fact about the client | `{client_id, engine, prompt_id, claim, correct}` — listener: PR (14) |
| `svc.search/sem.launched` | SEM campaigns go live | `{client_id, platform, campaign_ids[], daily_budget, currency}` |

## 4. Artifacts this service creates (`artifact.json` → `kind`)

`seo_audit`, `keyword_clusters`, `search_roadmap`, `content_brief`, `web_page`, `schema_jsonld`, `llms_txt`, `dev_ticket`, `geo_prompt_set`, `sem_build`, `sem_change_set`, `search_report`.

## 5. Metric events

- Daily, per market: `engine/metric.recorded` with `kind: "kpi"` for each KPI in `06-kpis-and-gates.md`.
- SEM spend: `engine/outbound.recorded` with `type: "spent"`, `channel: "paid_ad"`, `platform: "google_ads" | "microsoft_ads"`, `value`, `currency`.
- Page publish: `engine/outbound.recorded` with `type: "posted"`, `channel: "web_page"`.
- Conversions from organic and paid search come from GA4 and the CRM through the analytics service (`engine/conversion.recorded`). This service does not send them.
- UTM: SEM final URLs use `utm_source=google|bing`, `utm_medium=cpc`, `utm_campaign={campaign_id}`, `utm_term={keyword}`, plus auto-tagging (gclid, msclkid). Follow `engine/specs/analytics.md` when it is published.

## 6. Requests to the engine thread — all done on 21 Oct 2026

The engine thread added all 5 (see `engine/CHANGELOG.md`, "Search (5)"): the 12 KPI codes, role `client_developer`, guardrail G9 for live site changes, compliance rules `UK-VAT-PRICE`, `EU-OMNIBUS-PRICE`, `GCC-ARABIC-B2C`, `QC-FRENCH`, `US-SPECIAL-AD`, `CA-SPECIAL-AD`, `G-AI-IMAGE-LABEL`, and brand profile `organization.same_as[]`. The list below is kept as a record.

1. **New KPI codes** in `enums.kpis`: `organic_conversions_nonbrand` (count), `index_coverage` (ratio), `pages_published` (count), `referring_domains_new` (count), `ai_mention_share` (ratio), `ai_avg_position` (number), `ai_referral_sessions` (count), `ai_wrong_facts_open` (count), `quality_score_avg` (number), `wasted_spend_ratio` (ratio), `budget_pace` (ratio), `critical_alert_minutes` (number).
2. **New role** in `enums.roles`: `client_developer` (client dev lead who approves changes to the live site, gate G4).
3. **New tool risk class** or rule: changes to a client's live site (robots.txt, redirects, canonicals) are `write_external` and must always follow a `go_live` gate. Please enforce this in `specs/workflow.md` §5.
4. **New compliance channel rules** for `web_page` and `paid_ad`: price display with VAT (UK B2C), EU Omnibus lowest 30-day price next to a discount, French for `CA-QC`, Arabic version check for GCC B2C, special ad categories for `paid_ad` in US and CA, AI image label (EU AI Act Art. 50).
5. **Brain field** (optional): `organization.same_as[]` (LinkedIn, Wikidata, Crunchbase, review site URLs) for Organization schema and GEO entity work. 
