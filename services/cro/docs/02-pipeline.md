# CRO and Landing Pages: Pipeline, Gates and Service Levels

Status: v1, 21 Oct 2026. The machine-readable form is `workflow/cro-pipeline.json`.

## 1. Track B: optimization program (11 stages, 5 gates)

| # | Stage | Who does it | Gate | Target time |
|---|---|---|---|---|
| 1 | Tracking check | Tracking QA agent, with Service 12 | none. A failed check stops the pipeline and opens a task for Service 12. | Day 0 to 1 |
| 2 | Funnel audit | Funnel audit agent | none | Day 1 to 3 |
| 3 | Research | Research agent (heatmaps, recordings, surveys, reviews) | none | Day 1 to 5 |
| 4 | Hypotheses and backlog | Hypothesis agent | **G1 Test plan** | Day 5 |
| 5 | Test design | Test design agent and `cro-stats` tool | none. Included in G1 for the first test; later tests use the approved backlog. | Day 5 to 6 |
| 6 | Variant build | Page build agent, copy agent | **G2 Creative, copy and claims** (G2a, G2b, G2c; only the parts the variant needs) | Day 6 to 9 |
| 7 | QA and compliance | QA agent, then the compliance gate | **G3 Test go-live** | Day 9 to 10 |
| 8 | Run and monitor | Monitor agent, daily | **G5 Escalation** (only on a guardrail or SRM failure) | 14 to 42 days |
| 9 | Analyze | Results agent and `cro-stats` tool | none | 1 day after the sample is reached |
| 10 | Decide and ship | CRO lead | **G4 Ship winner** | 2 working days |
| 11 | Learn | Learnings agent writes to the client brain | none | Same day as G4 |

## 2. Track A: landing page production (7 stages, 3 gates)

| # | Stage | Who does it | Gate | Target time |
|---|---|---|---|---|
| A1 | Brief intake | Intake agent reads the brief from the calling service or the client form | none. The agent asks for missing fields. | Day 0 |
| A2 | Page plan | Page planner agent: template choice, sections, message match, test idea | none | Day 0 to 1 |
| A3 | Copy and build | Copy agent and page build agent, per market and language | none | Day 1 to 3 |
| A4 | Localization | Localization agent; native editor for French, German, Spanish and Arabic | **G2 Creative, copy and claims** | Day 3 to 4 |
| A5 | QA and compliance | QA agent, then the compliance gate | **G3 Go-live** | Day 4 to 5 |
| A6 | Launch with a test | The page goes live with the first A/B test from A2, if traffic allows | none | Day 5 |
| A7 | Hand-off to track B | After 14 days of data, the page joins the track B backlog | none | Day 19 |

## 3. Gate detail

Every gate is an item in the engine approval inbox (`POST /approvals`). There is no private approval flow. Each item shows the draft, the brand score and the compliance result.

| Gate | `approval_kind` | Approver role(s) | What the approver sees | SLA | Skip rule |
|---|---|---|---|---|---|
| G1 Test plan | `plan` | `cro_lead`; `client_approver` for the first plan of each quarter | Ranked backlog, the top 3 test plans, sample sizes, run times, risks | 48 h | None |
| G2a Creative | `creative` (layout and visuals) | `creative_lead` | Side-by-side control and variant at 375 px and 1440 px, all languages, the brand score | 48 h | Skip when the variant only moves or removes approved elements (`skip_if` is allowed for this kind) |
| G2b Copy | `copy` (new text) | `client_approver`; `native_editor` first for French, German, Spanish and Arabic | The new text in each language, the brand score | 48 h | Skip when the variant uses only approved copy |
| G2c Claim, price or offer | `claim` | `client_legal` or `client_approver`; `client_finance` also for a price or offer (`required_count` 2) | The new claim, price or offer, its proof, the markets | 72 h | Never skipped (engine rule) |
| G3 Go-live | `go_live` | `ops_lead` or `client_developer` (engine guardrail G9: a change to a client website always needs this gate) and `cro_lead` (`required_count` 2) | QA checklist result, compliance result, test plan, screenshots per market | 24 h | Never skipped (engine rule G9) |
| G4 Ship winner | `test_winner` | `cro_lead`; plus `client_approver` when the winner changes a price, an offer or the checkout | Results report, guardrails, SRM result, the learning | 24 h | Never skipped. The plan says a person approves every winner. |
| G5 Escalation | `escalation` | `account_lead` (urgent), with `cro_lead` informed | Which guardrail failed, the data, the action already taken (test stopped) | 1 h | Never skipped |

Approval kinds, roles and SLAs follow the engine `specs/approval-inbox.md` v0.1.0. Shipping a winner (G4) changes the client website, so the ship step also runs the G3 `go_live` gate again before it goes to 100% of traffic.

### 3.1 Actions an agent never takes alone

These come from the plan's "Governance and risk" section. The workflow layer enforces them.

1. Ship a test winner to 100% of traffic.
2. Publish a new claim, price, offer, or a health, finance or legal statement on a page.
3. Change a checkout, payment method or price.
4. Start paid traffic to a page. Paid services (2, 5, 11) own spend and their own budget gates.
5. Remove or change consent, privacy, cookie or unsubscribe text.

An agent can stop a running test alone when SRM or a guardrail fails. Stopping returns all traffic to the control, which is the approved state.

## 4. Service levels

| Measure | Target |
|---|---|
| Landing page, brief to live | 5 working days (3 for a page that reuses an approved template and copy) |
| Audit, start to backlog | 5 working days |
| Test, approved plan to live | 5 working days |
| Result report after the sample is reached | 1 working day |
| Guardrail or SRM failure to test stop | 1 hour (automatic) |
| Escalation response by a person | 1 hour (engine escalation SLA) |

## 5. Inputs and outputs per stage

| Stage | Reads | Writes |
|---|---|---|
| Tracking check | Tracking plan (Service 12), GA4 or warehouse event counts | Tracking status per funnel step |
| Funnel audit | Funnel data per market and device, Core Web Vitals | Drop-off map, top 10 problem steps |
| Research | Heatmaps, recordings (Clarity or Hotjar), survey answers, reviews, sales notes | Evidence list with source links |
| Hypotheses | Evidence list, client brain (past tests, personas, claims) | Hypothesis cards, scored backlog |
| Test design | Hypothesis card, traffic and baseline rate | Test plan with sample size and run time |
| Variant build | Test plan, brand templates, client brain | Variant in the test tool, preview links |
| QA and compliance | Variant, QA checklist | QA report, compliance result |
| Run and monitor | Daily arm counts, guardrail metrics | Daily status, SRM result, stop events |
| Analyze | Final counts per arm | Results report |
| Decide and ship | Results report | Decision, ship ticket |
| Learn | Decision, results report | Learning record in the client brain |
