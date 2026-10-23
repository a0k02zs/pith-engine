# Service 13 · Brand strategy and design · Pipeline

Version 1 · 21 Oct 2026. Machine-readable version: `workflow/brand-pipeline.json`.

The plan lists 6 steps: research, positioning options, workshop, design, approve identity, guidelines.
This build splits them into 18 stages so the orchestrator can run, retry and log each one.
Stages marked **GATE** stop the workflow and create an item in the approval inbox.

Legend: 🤖 agent step · 🔧 tool step · ✅ automatic check · 🚦 GATE (person decides)

## 1. Stages

| # | Stage | Type | Who or what | Output | Package |
|---|---|---|---|---|---|
| 1 | Intake | 🤖 | `brand-intake` agent reads the intake form | Scoped brief: package, markets, B2B/B2C, deadlines, stakeholders | A B C |
| 2 | Asset audit | 🤖🔧 | `brand-auditor` agent; crawler pulls site, social, ads, decks | Asset inventory, current voice traits, claims found, consistency gaps | A B C |
| 3 | Market research | 🤖 | `competitor-analyst` and `voc-miner` agents | Competitor grid, category language, review themes per market | B C |
| 4 | Customer interviews | 👤🤖 | Strategist runs 6 to 12 interviews; `interview-synthesizer` agent summarises | Interview insights with quotes; jobs, pains, gains | B C |
| 5 | Insight brief | 🤖 | `insight-synthesizer` agent | 1-page insight brief: 5 to 7 insights, each with evidence | B C |
| 6 | Positioning routes | 🤖 | `positioning-strategist` agent | 3 different positioning routes, each with statement, pillars and risks | B C |
| 7 | 🚦 **Positioning workshop** | GATE `plan` | Strategist runs a 3-hour workshop. Client chooses 1 route | Chosen route with client edits | B C |
| 8 | Verbal identity | 🤖 | `messaging-architect`, `voice-writer`; `naming-agent` if in scope | Messaging house, voice chart, vocabulary, taglines, name shortlist | A B C |
| 9 | 🚦 **Name and tagline legal screen** | GATE `claim` | `client_legal` (or Pith lawyer) after the `name-screener` agent | Name and tagline cleared for search, or rejected | C (B if new tagline) |
| 10 | Visual territories | 🤖 | `moodboard-director` agent makes 3 mood boards | 3 visual territories with colour, type and image direction | B C |
| 11 | 🚦 **Territory choice** | GATE `creative` | Creative lead, then client | 1 territory to design | B C |
| 12 | Identity design | 👤✅ | Designer makes the identity in Figma. `design-qa` agent checks contrast, sizes, files | Logo set, colour, type, imagery, icons, grid; QA report | B C |
| 13 | Market adaptation | 🤖👤 | `market-adapter` agent; `native_editor` per language | Arabic and Quebec French versions; culture check report | C (B when the client sells in the GCC or Quebec) |
| 14 | 🚦 **Approve identity** | GATE `design` | `client_approver` and `client_executive` (2 approvals) | Approved identity | B C |
| 15 | Guidelines and templates | 🤖👤 | `guidelines-writer` agent drafts; designer builds Figma library and Canva kit | Guidelines (web page and PDF), template library | A B C |
| 16 | Brain compile and test | 🤖✅ | `brain-compiler` agent; `brand-scorer` calibration on 40 samples | Draft brand profile (status `draft`), claims, banned terms, chunks; test report | A B C |
| 17 | 🚦 **Brain go-live** | GATE `design` | `account_lead` and `client_approver` (2 approvals) | Brand profile status `approved`. Other services may now start | A B C |
| 18 | Monitor | 🤖 loop | `brand-scorer` on every asset; `brand-health-reporter` monthly | Brand score per asset, drift alerts, monthly brand health note | A B C |

Packages skip stages that are not in scope. Package A runs 1, 2, 8, 15, 16, 17, 18.
In Package A, stage 8 extracts and cleans up the current voice. It does not invent a new one.

## 2. Approval gates

All gates use the engine approval inbox. No private approval flow.

| Gate | Approval kind | Required roles | Count | Service level (SLA) | What the approver sees |
|---|---|---|---|---|---|
| 7 Positioning workshop | `plan` | `strategist` + `client_approver` | 2 | 5 working days | 3 routes, insight brief, risks, a recommended route |
| 9 Name and tagline legal screen | `claim` | `client_legal` | 1 | 10 working days | Shortlist, linguistic screen, knock-out search per market |
| 11 Territory choice | `creative` | `creative_lead`, then `client_approver` | 2 | 3 working days | 3 mood boards with rationale |
| 14 Approve identity | `design` | `client_approver` + `client_executive` | 2 | 5 working days | Identity presentation, QA report, market versions signed by a `native_editor` |
| 17 Brain go-live | `design` (the inbox kind for a brand profile version) | `account_lead` + `client_approver` | 2 | 3 working days | Brand profile diff, brand scorer test results, open issues |

Rules:

1. A gate that passes its SLA sends a reminder at 100% and escalates to the head of growth at 150%. It never auto-approves.
2. `changes_requested` returns the workflow to the stage before the gate, with the comments as input.
3. `rejected` at gate 7 or 11 restarts that stage with new routes. After 2 rejections, the strategist calls the client.
4. A change to the approved brand profile later (for example a new claim) creates a new profile version and goes through gate 17 again. A new claim alone goes through a `claim` gate, as the engine rules say.

## 3. Guardrails

The 5 engine rules apply (engine README §4.6). In addition, for this service:

1. **No AI-only logo.** Image models make mood boards and explorations only. A human designer makes the final logo and identity files. Reason: copyright needs human authorship in several markets (see `05-market-rules.md`).
2. **No name or tagline goes to the client as "clear"** until a person has done the trademark knock-out search. An agent can only say "no obvious conflict found in the sources checked".
3. **No new claims in the messaging house** without evidence. Each claim goes into the claims register with status `proposed` until a `claim` approval.
4. **Interview data** is personal data. Recording needs consent from the person. Quotes in outputs have no names unless the person agrees in writing.
5. **Brain go-live is the only way** a brand profile becomes `approved`. No agent writes `approved` status.
6. **Competitor material** is for analysis only. Agents never copy competitor slogans, layouts or logos into a client asset.

## 4. Timeline per package

| Week | Package A | Package B | Package C |
|---|---|---|---|
| 1 | Intake, asset audit | Intake, audit, research | Intake, audit, research |
| 2 | Voice cleanup workshop, brain compile, go-live | Interviews, insight brief | Interviews, insight brief |
| 3 | | Routes, gate 7 | Routes, gate 7 |
| 4 | | Verbal identity, territories, gate 11 | Verbal identity, naming |
| 5 | | Refresh design | Gate 9 (legal), territories, gate 11 |
| 6 | | Gate 14, guidelines | Identity design |
| 7 | | Brain compile, gate 17 | Identity design, market adaptation |
| 8 to 9 | | | Gate 14, guidelines and templates |
| 10 | | | Brain compile, gate 17, launch kit |

Time on gates is the main risk to these dates. The account lead books the workshop and approval meetings in week 1.

## 5. Automation share

| Work | Share done by agents (estimate) |
|---|---|
| Research and synthesis | about 70% |
| Positioning and messaging drafts | about 50% (people rewrite) |
| Visual identity | about 15% (mood boards, QA, exports) |
| Guidelines and templates | about 40% |
| Brain compile and monitoring | about 90% |
| **Whole service** | **about 30%**, in line with the plan |

These shares are estimates for planning. They are not measured data.
