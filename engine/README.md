# Pith M shared engine — contracts v0.1.0

Status: **draft for build**. Date: 2026-10-21. Owner: the "Shared marketing engine" thread.
Source plan: [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67), section "The shared engine" and "Governance and risk".
Reading page: https://claude.ai/artifact/CYy7PkV4SQ9uWTJN5xHeV2 (generated from these files). Change log: CHANGELOG.md.

All 18 service threads build against these contracts. Do not fork them. If a service needs a change, ask the engine thread. The engine keeps changes backward compatible inside a major version.

## 1. What the engine is

The engine has 6 parts. Every service uses all 6.

| # | Part | What it does | Contract |
|---|------|--------------|----------|
| 1 | Client brain (brand store) | Brand voice, products, offers, personas, approved claims, banned words, past results. Every agent reads it before it writes. | `contracts/schemas/brand-profile.json`, `GET /clients/{id}/brain` |
| 2 | Data layer (consented customer data) | Contacts, companies, events, consent per channel and country. Consent travels with each contact to every channel. | `contracts/schemas/contact.json`, `consent.json`, `db/001_core.sql` |
| 3 | Agent workflow layer | Runs each service pipeline step by step. Retries, logs every action, stops at gates. | `specs/workflow.md`, `contracts/schemas/workflow-definition.json` |
| 4 | Approval inbox | 1 queue for client and Pith staff. Each item shows the draft, the brand score and the compliance result. | `contracts/schemas/approval-item.json`, `/approvals` API |
| 5 | Compliance gate | Automatic check before anything goes live, per contact country. | `specs/compliance.md`, `specs/compliance-rules.json`, `POST /compliance/check` |
| 6 | Measurement | Same KPI names across services, attribution, weekly AI report. | `specs/analytics.md`, `contracts/schemas/metric-event.json` |

## 2. Reference stack

The plan names these tools. The contracts do not depend on them, so a part can change later.

- Database: Postgres 16 (Supabase), with `pgvector` for brand-store retrieval and row-level security per client.
- Workflow engine: Inngest (durable steps, retries, `waitForEvent` for gates). n8n or Zapier only for simple integrations.
- Agents: Claude API. Default model: `claude-opus-5-5` for strategy and writing, `claude-haiku-5-5` for classification and checks.
- Approval inbox: web portal plus Slack notifications.
- Warehouse and dashboards: BigQuery, dbt, Looker Studio. GA4 and ad platform APIs as sources.
- Language: TypeScript for engine and service code.

## 3. Files

```
engine/
  README.md                         this file
  db/001_core.sql                   Postgres schema (all 6 parts)
  contracts/openapi.yaml            HTTP API for service threads and the portal
  contracts/events.md               event catalog (Inngest event names and payloads)
  contracts/enums.json              shared codes: services, markets, channels, roles, KPIs
  contracts/schemas/*.json          JSON Schema (draft 2020-12) for every shared object
  specs/workflow.md                 agent workflow layer: step types, gates, guardrails
  specs/approval-inbox.md           approval kinds, roles, SLAs, skip rules
  specs/compliance.md               how the compliance gate decides
  specs/compliance-rules.json       country rules as data
  specs/analytics.md                KPI dictionary, UTM standard, attribution
  specs/service-integration.md      checklist for each service thread
```

## 4. Rules every service follows

1. Read the client brain before any agent writes (`GET /clients/{id}/brain`).
2. Never read contacts directly from a CRM. Use `POST /audiences/resolve`. It returns only contacts with a valid consent for the channel, purpose and country.
3. Every outbound item goes through `POST /compliance/check`. A `block` result stops the step.
4. Every human decision goes through the approval inbox. Never build a private approval flow.
5. Every send, post, spend and conversion emits `engine/metric.recorded` with a KPI code from `contracts/enums.json`.
6. Agents can never do these 5 things alone (plan, "Governance and risk"): raise a budget or start new paid spend; sign a contract or pay a creator; publish a new claim, price, or health, finance or legal statement; reply to a complaint, journalist or regulator; email a contact with no consent record for their country. The workflow layer enforces this (see `specs/workflow.md` §5).

## 5. Versioning

- Contract version: `0.1.0`. Every API response has the header `Pith-Contract-Version`.
- Minor version: new optional fields, new enum values, new endpoints.
- Major version: anything that breaks a service. Announced in the project before it ships.

## 6. Not legal advice

`specs/compliance-rules.json` comes from the plan's market sections. It is a planning summary. A local lawyer confirms each market before launch, as the plan says.
