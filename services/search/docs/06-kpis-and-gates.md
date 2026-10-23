# Service 5: SEO, SEM and GEO — KPIs and approval gates

## Approval gates

An agent never passes a gate. The workflow stops and puts the item in the approval inbox of the shared engine. Each item shows the draft, the brand score and the compliance result.

| Gate | What is approved | Engine `approval_kind` | `required_roles` | SLA (`sla_hours`) | If no answer |
|---|---|---|---|---|---|
| G1 | 90-day roadmap and priorities | `plan` | `seo_lead`, then `client_approver` (`required_count` 2) | 72 | `engine/approval.overdue` at SLA, then account lead. Work stays paused. |
| G2 | Each page: facts, claims, voice | `content` | `subject_expert` | 120 | Remind at 72 h. Page stays in draft. |
| G2b | Publish (only if the contract asks) | `go_live` | `client_approver` | 72 | Page stays in draft. `skip_if: client.contract.publish_ok == false` |
| G3 | SEM launch, budgets, bid strategy, target CPA/ROAS | `budget` | `performance_marketer` + `client_finance` (`required_count` 2) | 48 | Nothing launches. |
| G3b | Budget change over 20%, new campaign, bid strategy change, any raise of the total | `budget_change` | `performance_marketer` | 24 | No change. Guardrails stay. |
| G3c | New ad text (weekly batch) | `copy` | `performance_marketer` | 48 | Old ads keep running. |
| G4 | Changes to the client's live site: robots.txt, redirects, canonicals, templates | `go_live` | `client_developer` (engine guardrail G9: this gate can never be skipped) | per client | Ticket stays open. |
| G5 | Monthly report before the client sees it | `report` | `strategist` | 48 | Report is late; account lead is told. |
| G6 | New claim found in a draft ("[NEW CLAIM - NEEDS APPROVAL]") | `claim` | `client_approver` + `client_legal` for health, finance or legal | 72 | Claim is removed from the draft. |

### What an agent can never do alone (from the master plan, applied here)

- Raise a budget or start new paid spend.
- Publish a page with no expert sign-off.
- Publish a new product claim, price, or health, finance or legal statement.
- Change robots.txt, redirects or canonicals on a live site.
- Bid on or use a competitor trademark.
- Reply to a regulator, journalist or complaint about search content.

## KPIs

All codes are in the engine `contracts/enums.json` → `kpis` (the search codes were added on 21 Oct 2026). Each KPI is sent as its own `engine/metric.recorded` event, per client, per market.

### SEO

| KPI | Definition | Source | Target (first 12 months, set per client at G1) |
|---|---|---|---|
| **`organic_sessions_nonbrand`** | Organic sessions from non-brand queries | GA4 + GSC | +30% to +60% year on year |
| **`organic_conversions_nonbrand`** | Conversions from non-brand organic | GA4 | +25% year on year |
| **`top3_share`** | % of priority keywords in positions 1–3 | Rank tracker | 20% by month 6, 35% by month 12 |
| **`cwv_pass_rate`** | % of URLs that pass Core Web Vitals (field data) | CrUX | 75%+ |
| **`index_coverage`** | Indexed pages ÷ pages that should be indexed | GSC | 95%+ |
| **`pages_published`** | Expert-signed pages live this month | CMS | Per package |
| **`referring_domains_new`** | New referring domains with authority above the client's floor | Ahrefs/Semrush | Trend up |

### GEO

| KPI | Definition | Source | Target |
|---|---|---|---|
| **`ai_citation_share`** | % of tracked prompt runs that cite a client URL | GEO tracker | +10 points in 6 months from baseline |
| **`ai_mention_share`** | % of prompt runs that name the client (cited or not) | GEO tracker | +15 points in 6 months |
| **`share_of_voice`** (`props.scope = "ai"`) | Client mentions ÷ (client + tracked competitor mentions) | GEO tracker | Above the top competitor by month 12 |
| **`ai_avg_position`** | Average rank of the client in list answers | GEO tracker | Top 3 |
| **`ai_referral_sessions`** | Sessions from chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com and similar | GA4 (custom channel group) | Trend up |
| **`ai_wrong_facts_open`** | Wrong facts about the client found in AI answers and not yet fixed | GEO tracker | 0 open for more than 30 days |

AI answers change between runs. We report GEO metrics as a 4-week rolling average and show the range.

### SEM

| KPI | Definition | Source | Target |
|---|---|---|---|
| **`cpa`** | Cost ÷ conversions | Ads APIs | At or below target set at G3 |
| **`roas`** | Conversion value ÷ cost | Ads APIs | At or above target |
| **`impression_share`** | Search impression share on priority campaigns | Ads APIs | 60%+ on brand, set per client on non-brand |
| **`quality_score_avg`** | Impression-weighted average quality score | Google Ads | 7+ |
| **`wasted_spend_ratio`** | Spend on search terms later added as negatives ÷ total spend | Ads APIs | Under 10% |
| **`pipeline_value`** (B2B) | Opportunity value from paid search leads | CRM | Set per client |
| **`budget_pace`** | Spend to date ÷ planned spend to date | Ads APIs | 95%–105% |

### Operations

| KPI | Definition | Target |
|---|---|---|
| **`gate_wait_hours`** (engine computes from the inbox) | Average days items wait at each gate | Under the SLA |
| **`time_to_launch_days`** | Days from brief to live page | Under 15 working days |
| **`critical_alert_minutes`** | Hours from a critical technical issue to alert | Under 1 hour |
| **`cost_per_asset`** | Pith cost (agent + expert + editor) per live page | Track; set target after month 3 |

All targets are planning estimates, not measured data. We set real targets per client at gate G1, from the baseline.
