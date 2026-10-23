# Service 13 · Brand strategy and design · KPIs

Version 1 · 21 Oct 2026. KPI codes come from `engine/contracts/enums.json`.
Codes that start with `brand.` are service-only KPIs, as `engine/specs/service-integration.md` §7 allows.

## 1. Brand outcome KPIs (the client sees these)

| KPI | Code | Formula | Source | Target |
|---|---|---|---|---|
| Brand consistency score | `brand_score` | Average brand-scorer score of all assets published in the month | Brand scorer on every asset | 80 or more; alert under 70 for 2 months |
| Branded search volume | `brand.branded_search_volume` | Monthly searches that contain the brand name, per market | Google Search Console, Google Ads Keyword Planner | Grows each quarter after launch; baseline set at stage 2 |
| Aided awareness | `brand.awareness_aided` | % of target audience who know the brand when shown the name | Survey, 2 times a year, per market | Baseline at launch; target set with the client |
| Unaided awareness | `brand.awareness_unaided` | % who name the brand without help for the category | Same survey | As above |
| Share of voice | `share_of_voice` | Brand mentions ÷ mentions of brand and 3 named competitors | Social listening, media monitoring | Grows each quarter |
| AI citation share | `ai_citation_share` | % of tracked prompts that cite the brand | GEO monitor (Service 5) | Grows each quarter |

Survey KPIs are only for clients who pay for the brand tracker. Small clients use branded search and share of voice.

## 2. Delivery KPIs (Pith M sees these)

| KPI | Code | Formula | Target |
|---|---|---|---|
| Time to brain go-live | `time_to_launch_days` | Days from intake to gate 17 approved | A: 10 working days · B: 35 · C: 60 |
| Time to make an on-brand asset | `brand.asset_time_minutes` | Median minutes from brief to an asset with brand score 80 or more | Falls by 30% in the 3 months after go-live |
| Cost per asset | `cost_per_asset` | Production cost ÷ assets delivered | Falls after go-live |
| First-pass approval rate | `brand.first_pass_approval_rate` | Approval items with brand score data approved on first review ÷ all items | 70% or more across services |
| Gate rounds | `brand.gate_rounds` | Average number of rounds per gate | 2 or fewer |
| Scorer calibration | `brand.scorer_calibration` | On-brand samples scored 80+, off-brand scored under 60 | 18 of 20 each way |

## 3. Monthly brand health note

The `brand-health-reporter` agent writes 1 note per client per month. Sections:

1. Headline: 1 sentence on brand health this month.
2. Brand score by service and by market, with change from last month.
3. The 10 lowest-scoring assets and the most common cause.
4. Branded search and share of voice trends.
5. Survey results (when a wave closes).
6. Drift alerts and actions for next month.

The note goes to the approval inbox as kind `report`, with `service=brand`. A strategist reviews it before the client sees it,
as the plan says for all reports.
