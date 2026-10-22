# Content marketing — strategy playbook

Service 7 of 18. Version 0.1. Date: 2026-10-21.
Source: [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67), section "7 · Content marketing".
Engine: builds against engine contracts v0.1.0 (`/mnt/project-files/engine/`). Service code: `content`. See `engine-integration.md`.

## 1. Goal

Publish expert content that wins search and AI citations. Give sales and email useful assets to send.

- B2B: whitepapers, reports, ebooks, case studies, expert blog posts.
- B2C: guides, comparisons, how-to articles, buying guides.

Automation target at launch: about 60% of steps (plan estimate, not measured).

## 2. What the client buys

| Package | Per month | Contents | Best fit |
|---|---|---|---|
| Starter | 4 pieces | 4 blog posts, 1 refresh, repurpose pack for each | B2C, small B2B |
| Growth | 8 pieces + 1 asset per quarter | 6 blog posts, 1 case study, 1 gated asset (whitepaper or ebook) per quarter, repurpose packs | Most B2B |
| Authority | 12 pieces + 1 asset per month | 8 blog posts, 2 case studies, 1 gated asset per month, 1 data report per quarter, 2 markets | B2B with long sales cycles |

Each extra market adds localization cost. See `market-rules.md`.

## 3. The 4 core formats

| Format | Job | Length | Gated? | Main KPI |
|---|---|---|---|---|
| Blog post (guide, how-to, comparison) | Win search and AI answers for 1 question cluster | 1,200–2,500 words | No | Organic conversions, AI citation share |
| Whitepaper or report | Show expert insight or original data; capture leads | 2,500–5,000 words, 8–15 pages | Yes (B2B) | Downloads, content-assisted pipeline |
| Ebook | Teach a full topic step by step; capture leads | 5,000–10,000 words, 15–40 pages | Yes, or ungated for B2C | Sign-ups, nurture conversion |
| Case study | Prove results with a named customer | 600–1,200 words, plus 1-page PDF | No | Sales usage, win rate on deals where it is sent |

Templates for each format are in `templates/`.

## 4. Strategy rules

1. **Start from buyer questions, not keywords.** Each topic answers a real question from sales calls, support tickets, search data or AI prompts.
2. **Every piece has original input.** This is an expert interview, client data, a customer story or a test. AI text alone never goes live (plan rule, Service 5).
3. **Pillar and cluster.** Each quarter has 2–3 pillar topics. Each pillar has 1 gated asset and 4–8 cluster posts that link to it.
4. **Write for AI answer engines (GEO).** Put a direct 40–60 word answer under each question heading. Use clear facts, dates, numbers and named sources. Add FAQ and Article schema markup.
5. **One piece, many uses.** Each long piece makes a repurpose pack: 3 emails, 5 social posts, 2 short video scripts and 1 sales one-pager.
6. **Refresh before you write new.** Every 6 months, the refresh agent checks each page. A page that loses 20% of its traffic, or has old facts, goes into the next plan.
7. **Claims come only from the client brain.** A new claim, price, or health, finance or legal statement needs a person to approve it (plan, "Governance and risk").

## 5. Pipeline (8 stages, 4 human gates)

Gates are marked **[GATE]**. The machine specs are `workflows/content.plan.json`, `workflows/content.piece.json` and `workflows/content.refresh.json`. They validate against `engine/contracts/schemas/workflow-definition.json`.

| # | Stage | Who does it | Output | Time target |
|---|---|---|---|---|
| 1 | Gap analysis | Agent `cm.gap_analyst` | Gap report: questions with no good answer on the client site | 1 hour, monthly |
| 2 | Plan | Agent `cm.planner` | Quarterly calendar with briefs | 1 hour |
| 3 | **[GATE] Approve plan** | Content lead (Pith), client marketing lead | Approved calendar | 3 working days |
| 4 | Interview | Agent `cm.interviewer` writes questions; a person records 20 minutes with a client expert | Transcript | 5 working days to book |
| 5 | Draft | Agent `cm.drafter`, then `cm.fact_checker` and brand check | Draft with citations and a claims list | 1 working day |
| 6 | **[GATE] Edit and fact-check** | Pith editor; client expert signs off | Final copy | 3 working days |
| 6b | **[GATE] New claim approval** (only when the draft has a claim that is not in the client brain) | Client approver | Approved or removed claim | 2 working days |
| 7 | Repurpose | Agent `cm.repurposer` | Repurpose pack | 2 hours |
| 7b | **[GATE] Case study release** (case studies only) | The named customer gives written approval | Signed release | 10 working days |
| 8 | Publish and refresh | Workflow publishes to the CMS; agent `cm.refresh_auditor` runs every 6 months | Live URL, schema, metric events | Same day |

Time from approved brief to live page: target 10 working days for a blog post, 20 for a gated asset.

## 6. Approval points

All approvals go through the engine approval inbox (`POST /approvals`). No private approval flow.

Every item has `service=content`. Kinds and roles are the shared engine codes.

| Gate | Approval kind | Approver roles | Can skip? |
|---|---|---|---|
| Approve plan | `plan` | `content_lead` + `client_marketing_lead` (2 of 2) | No |
| New claim | `claim` | `client_approver` or `client_legal` | No. Engine guardrail G3 |
| Edit, fact-check and expert sign-off | `copy` | `editor` + `subject_expert` (2 of 2) | No in v1. A shortcut for light refreshes (editor only) is a v2 item |
| Case study release | `copy` | `external_contact` (the named customer, one-time link, signed document in `edits.evidence_ref`) | No |
| Refresh list | `plan` | `content_lead` | No |
| Repurpose pack | none | — | Items reuse approved copy. Each item still passes the brand and compliance check |

Each inbox item shows: the draft, the brand score, the compliance result, the claims list with sources, and the fact-check report.

## 7. KPIs

Shared KPI codes come from `engine/contracts/enums.json`. Codes that start with `content.` are service-only KPIs, allowed by the engine naming rule.

| KPI | Code (proposed) | Target (first 6 months) |
|---|---|---|
| Organic sessions per piece (non-brand) | `organic_sessions_nonbrand` | Growth in month 3–6, by cluster |
| Organic conversions per piece | `conversions` (filter: content pages) | 1 or more per month per cluster post by month 6 |
| AI citation share for the topic | `ai_citation_share` (shared with Service 5) | +10 points on tracked prompts in 6 months |
| Gated asset downloads | `content.downloads` | 200 per asset in the first 90 days (B2B) |
| Email sign-ups from content | `content.signups` | 2% of content sessions (B2C) |
| Content-assisted pipeline | `pipeline_value` (filter: content-assisted) | Report in each market currency |
| Case study sales usage | `content.sales_sends` | Each case study sent in 5+ deals per quarter |
| Cost per published piece | `content.cost_per_piece` | Track. Fall 25% after month 3 |
| Days from brief to live | `content.cycle_days` | 10 (blog), 20 (gated asset) |
| Fact-check fail rate at edit gate | `content.factcheck_fail_rate` | Under 5% of claims |

All targets are planning estimates, not measured data.

## 8. Tools

Plan list: Notion, Google Docs, Surfer or Clearscope, Grammarly, WordPress, Webflow or Sanity, Canva.
Engine stack: Claude API (`claude-opus-5-5` for writing, `claude-haiku-5-5` for checks), Inngest, Supabase.

## 9. What feeds this service, and what it feeds

- In: SEO clusters (Service 5), sales objections (CRM, Service 9), campaign themes (Service 2), webinar recordings (Service 16).
- Out: email content (Service 1), social posts (Service 4), video scripts (Service 3), ABM assets (Service 8), PR angles (Service 14).
