# Service 9 · Marketing automation and CRM operations — Strategy playbook

Pith Marketing (Pith M) · Version 1 · 21 Oct 2026
Owner: Pith M ops lead. Source: [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67), section 9.

## 1. Purpose

This service sets up and runs the CRM and the marketing automation for each client. The goal is simple. Every lead is captured, scored, routed and followed up. Every result has a source.

This service is "the plumbing" for the other 17 services. Email (1), ABM (8), SMS and WhatsApp (10), paid social (11), events (16) and CRO (17) all read the lifecycle stages and the lead score that this service defines. Analytics (12) reads the source fields.

## 2. What the client buys

| Package | For | Scope | Typical length |
|---|---|---|---|
| **Foundation** | New CRM, or a CRM in bad condition | Audit, lifecycle stages, fields, forms, lead scoring v1, routing, 3 nurture flows, 1 dashboard | 6 weeks setup |
| **Growth** | Clients with a working CRM | Foundation scope plus scoring v2 (with intent and product data), 6 to 10 nurture flows, sales SLA alerts, recycle flows | 8 weeks setup |
| **Run** | Any client after setup | Daily data checks, flow monitoring, monthly score tuning, new flows on request, quarterly review | Monthly retainer |
| **Migration add-on** | Move between CRMs (for example Pipedrive to HubSpot, HubSpot to Salesforce) | Field map, data clean, test load, cut-over, 30 days of support | 3 to 6 weeks |

B2B clients use the full lead model (lead, MQL, SQL, opportunity). B2C clients use a customer lifecycle model (subscriber, first purchase, repeat, VIP, lapsed). See `02-lifecycle-and-scoring.md`.

## 3. Platform choice

Use this rule. Do not let the agent choose the platform alone. The ops lead confirms it at gate G1.

| Client situation | Recommended platform |
|---|---|
| B2B, under 50 sales users, no CRM or a small CRM | HubSpot (Marketing Hub Pro + Sales Hub Pro) |
| B2B, over 50 sales users, complex territories or CPQ | Salesforce Sales Cloud + Account Engagement (Pardot) or HubSpot connector |
| B2B already on Salesforce | Keep Salesforce. Add Account Engagement or Marketo for automation |
| B2C e-commerce | Klaviyo for messages, HubSpot or the store platform as the record of customers |
| B2C with stores, bookings or memberships | HubSpot or Salesforce, plus Braze or Klaviyo for messages |
| Data must stay in Saudi Arabia | Choose a platform and region that meets the Saudi PDPL transfer rules. Ask local counsel first (see `08-market-rules.md`) |

Integration tools: n8n or Zapier for simple syncs. Clay for enrichment. Segment as the event pipe when the shared engine CDP uses it.

## 4. The pipeline (7 stages)

The stages follow the master plan. The gates (G1 to G3) are human approvals. Details of each gate are in `07-approvals-and-kpis.md`.

1. **Audit.** The CRM Auditor agent reads the CRM. It checks duplicates, empty fields, broken flows and missing consent data. Output: the audit report (template T1).
2. **Design.** The Ops Architect agent proposes the lifecycle stages, the lead scoring model and the routing rules. Output: the design document (template T2).
3. **G1 · Approve design.** The client heads of sales and marketing approve the stages, the score thresholds and the routing. The Pith ops lead confirms the platform.
4. **Build.** The automation engineer builds fields, forms, flows, scoring and integrations. The build happens in a sandbox (a test copy of the CRM) first.
5. **Test.** The QA Tester agent sends test leads through every path. It reports each failure. Output: the test report (template T5).
6. **G2 · Go live.** The Pith ops lead approves the switch to the live CRM. The client ops owner signs the go-live checklist (template T6).
7. **Monitor.** The Data Hygiene Monitor agent checks data quality and flow errors every day. It fixes simple issues inside its allowed list. It sends other issues to a person. Monthly, the Scoring Analyst agent proposes score changes. **G3** approves any change to thresholds or routing.

## 5. Roles (RACI)

R = does the work. A = owns the decision. C = gives input. I = gets informed.

| Step | Agent | Automation engineer | Pith ops lead | Client sales head | Client marketing head |
|---|---|---|---|---|---|
| Audit | R | C | A | I | I |
| Design | R | C | A | C | C |
| G1 approve design | — | C | R | A | A |
| Build | C (config drafts) | R | A | I | I |
| Test | R | R | A | I | I |
| G2 go live | — | C | A | I | C |
| Monitor | R | C | A | I | I |
| G3 score or routing change | R (proposal) | C | R | A | A |

## 6. Week plan for a Foundation client

| Week | Work | Exit check |
|---|---|---|
| 1 | Access, audit, data export, stakeholder interviews (sales, marketing, service) | Audit report sent |
| 2 | Lifecycle design, score model, routing rules, field list | G1 approved |
| 3 | Sandbox build: fields, pipelines, forms, consent fields | Field list built, forms live in sandbox |
| 4 | Flows: capture, dedupe, enrich, score, route, speed-to-lead, 3 nurture tracks | All flows on in sandbox |
| 5 | UAT with 40+ test leads, fixes, data clean of live records | Test report: 0 blocker failures |
| 6 | G2, go live, sales training (1 hour), first daily monitor run | G2 signed, dashboard live |

## 7. Rules that never change

These rules come from the master plan "Governance and risk" section. Agents cannot override them.

1. An agent never emails or messages a contact with no consent record for that contact's country.
2. An agent never deletes or merges a live record without a log and a 30-day restore path.
3. An agent never changes a score threshold, a lifecycle stage definition or a routing rule in the live CRM. A person approves at G3.
4. An agent never exports personal data out of the client CRM except to the shared engine data layer, in the allowed region.
5. Every build goes to a sandbox first. No direct build in the live CRM.
6. Each agent action writes to the shared engine audit log.

## 8. Files in this build

| File | Content |
|---|---|
| `01-playbook.md` | This file |
| `02-lifecycle-and-scoring.md` | Lifecycle stages, lead scoring model, MQL and SQL definitions, SLAs |
| `lead-scoring.json` | The scoring model in machine format, for the orchestrator |
| `03-workflows.md` | Automation workflow specs (W1 to W10) |
| `workflows.json` | 11 workflow definitions in the engine format (`crm_ops.*`) |
| `04-crm-setup.md` | HubSpot and Salesforce setup: objects, properties, pipelines |
| `crm-fields.csv` | Field list with HubSpot and Salesforce API names |
| `05-templates.md` | Audit report, design doc, nurture emails, sales brief, test plan, go-live checklist |
| `06-agent-prompts.md` | System prompts for the 7 agents |
| `07-approvals-and-kpis.md` | Approval gates, KPIs with formulas and targets |
| `08-market-rules.md` | Rules for UK, Singapore, US, Canada, GCC and EU |
| `market-overlay.json` | CRM overlay on the engine compliance rules (working week, data location, request deadlines) |
| `engine-interface.md` | What this service reads from and writes to the shared engine |
