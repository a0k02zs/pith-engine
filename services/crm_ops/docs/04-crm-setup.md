# CRM setup spec: HubSpot and Salesforce

Version 1 · 21 Oct 2026. Field list: `crm-fields.csv` (about 55 fields, with HubSpot and Salesforce API names).

Platform features and limits change. Check the current HubSpot and Salesforce documentation and the client's licence tier before each build. This spec does not replace that check.

## 1. Common setup (both platforms)

1. **Sandbox first.** HubSpot: a standard sandbox (Enterprise) or a separate test portal (Pro). Salesforce: a Developer or Partial Copy sandbox.
2. **Naming.** Every Pith field starts with `pithm_` (HubSpot) or ends with `__c` with a clear label (Salesforce). Every workflow name starts with `PITHM W<number> ·`. This makes the audit and the handover easy.
3. **Users and access.** Give each agent its own integration user (API key or private app token) with the least access it needs. Never share a person's login with an agent. Rotate tokens every 90 days.
4. **Field groups.** Create the groups from `crm-fields.csv`: lifecycle, score, source, consent, fit, sales, hygiene.
5. **Required fields on forms.** Email, first name, country, and the consent checkboxes for the country. B2B forms also ask company and job title. Use progressive profiling for other fields.
6. **Consent text.** Store each version of the consent text with an id. The form writes `pithm_consent_text_version`. This proves what the person agreed to.
7. **Time zone and working hours.** Set the working hours for each rep and each queue. GCC queues: see section 5 of `02-lifecycle-and-scoring.md`.

## 2. HubSpot

| Area | Setup |
|---|---|
| Lifecycle stage | Use the default `lifecyclestage` property. Map Pith stages: `subscriber`, `lead`, `mql` → `marketingqualifiedlead`, `sql` → `salesqualifiedlead`, `opportunity`, `customer`, `evangelist`. Add `sal` as a custom stage where the tier allows custom stages; else use the `hs_lead_status` property value `SAL`. Use `other` + `pithm_rejection_reason` for nurture and disqualified, or custom stages. |
| Lead object | On tiers with the HubSpot Leads object, create a lead record at MQL. Sales works the lead record. This keeps the contact lifecycle clean. |
| Scoring | Use the HubSpot lead scoring tool (fit + engagement groups, with decay) where the tier allows it. Else use calculated properties and workflows, or let the orchestrator calculate the score and write `pithm_*_score` through the API. Use one method only per client. |
| Pipelines | Sales pipeline stages: Discovery, Qualified, Proposal, Negotiation, Closed won, Closed lost. Each stage has a fixed probability and required fields (amount, close date, next step). |
| Routing | Workflows with "rotate record to owner" by team, or the Leads routing tool. Teams: UK, SG, NA, NA-QC, GCC, EU, Enterprise. |
| Workflows | Build W1 to W10 as HubSpot workflows where native. Use webhook actions to call the orchestrator for agent steps. |
| Subscription types | Create subscription types: Newsletter, Product updates, Events, Offers (B2C), Sales follow-up (1:1). Map each to the consent fields. |
| Integrations | Native: Salesforce (if dual CRM), LinkedIn Ads, Meta Ads, Google Ads, Slack, Zoom or Webex. Through orchestrator: Klaviyo, Twilio, WhatsApp, Clay. |
| Data residency | HubSpot has EU and US data centres. Put EU clients in the EU data centre. Check the current list of data centres for other regions. |

## 3. Salesforce

| Area | Setup |
|---|---|
| Lead vs contact | Use the Lead object for unqualified people. Convert to Contact + Account + Opportunity at SQL. Copy all `pithm` fields on convert with field mapping. |
| Lifecycle | `Lifecycle_Stage__c` picklist on Lead and Contact. Lead Status values: Open, Working, SAL, Nurture, Disqualified, Converted. |
| Scoring | Account Engagement (Pardot) scoring and grading, or the orchestrator writes the score fields through the API. Account Engagement "grade" matches the fit score; "score" matches engagement. |
| Routing | Lead assignment rules plus Omni-Channel or a routing app (for example LeanData or Distribution Engine) for round-robin and working hours. |
| Automation | Record-triggered Flows for native steps. Platform Events or outbound calls (Named Credentials) to call the orchestrator for agent steps. Do not use Process Builder or Workflow Rules (retired). |
| Consent | Use the standard consent objects (Individual, Contact Point Type Consent) where the org has them. Else use the `Consent_*__c` fields. Keep 1 method per org. |
| Campaigns | 1 Salesforce Campaign per Pith campaign, with member status values (Sent, Registered, Attended, Responded). Analytics (service 12) reads Campaign Influence. |
| Data residency | Choose the Hyperforce region that meets the market rule (for example EU, UK, Singapore, UAE where offered). Confirm the region list with Salesforce before contract. |

## 4. Migration checklist (add-on)

1. Export all objects, with record ids, owners, and history where possible.
2. Build the field map (source field → target field → transform).
3. Clean before the move: dedupe, normalize, drop records with no lawful basis (after client approval).
4. Test load 1,000 records into the sandbox. Check counts, associations and consent values.
5. Freeze changes in the old CRM for the cut-over window (usually a weekend).
6. Full load. Re-run counts. Rebuild workflows in the new CRM. Turn off old workflows.
7. 30 days of support. Keep the old CRM read-only for 90 days, then archive.

## 5. Dashboard (built in the CRM, fed to analytics service 12)

1. Funnel: leads → MQL → SAL → SQL → opportunity → customer, by month and by market.
2. Speed to lead: median response minutes by grade, SLA breach count.
3. Source: MQLs and pipeline value by original source and by Pith service.
4. Data health: data quality score, duplicate rate, consent coverage, flow errors.
5. Nurture: track entries, exits to MQL, unsubscribe rate by track.
