# Approval points and KPIs (crm_ops)

Version 1 · 21 Oct 2026. Gates use the engine approval inbox (`specs/approval-inbox.md`). Kinds and roles come from `engine/contracts/enums.json`.

## 1. Approval gates

| Gate | When | Engine kind | Roles (count) | SLA | Can skip? | Evidence in the inbox item |
|---|---|---|---|---|---|---|
| **G1 · Approve design** | After design, before any build | `plan` | `client_sales` + `client_marketing_lead` (2) | 72 h | No | Design doc T2, changes from the Pith default, open questions |
| **G1b · Confirm platform** | After G1 | `plan` | `ops_lead` | 24 h | No | Platform rule result, licence tier, data residency note |
| **G2 · Go live** | After tests pass | `go_live` | `ops_lead` | 24 h | No | Test report T5 (0 blockers, 0 consent failures), go-live checklist T6 signed by the client ops owner |
| **G3 · Score or routing change** | Monthly tuning, or any change to thresholds, stages or routing | `plan` | `client_sales` + `client_marketing_lead` (2) | 5 days | No | Scoring Analyst proposal with data |
| **G-IMP · List import** | Import over 500 rows, or any third-party list | `data_change` * | `ops_lead` | 48 h | Yes, if ≤ 500 rows and first-party | Import profile: rows, countries, lawful basis, Art. 14 need |
| **G-MERGE · Fuzzy merge** | Duplicate pair matched only on name + company | `data_change` * | `ops_lead` or `client_approver` | 72 h | No | Both records side by side (masked), field differences |
| **G-DSR · Data subject request** | Access, delete or correct request | `data_change` * | `client_legal` | 72 h (inside the legal deadline) | No | DSR pack: systems, data found, action, deadline |
| **G-SUPPRESS · Bulk suppression of live data** | Before go-live clean: contacts with no lawful basis | `data_change` * | `client_approver` | 72 h | No | Count by market and reason, sample (masked) |

\* `data_change` was added to the engine on 21 Oct 2026 at our request (default role `ops_lead`, 72 h).

Nurture copy goes through the Email marketing service's `copy` gate, not a crm_ops gate. The after-hours auto-reply in W6 uses a template approved once at G2.

**What an agent in this service can never do alone** (plan, "Governance and risk", plus this service):

1. Change a live score threshold, lifecycle stage definition or routing rule.
2. Merge records that match only on name and company.
3. Delete or export personal data.
4. Import a third-party list.
5. Send any message to a contact. (Removals and opt-out syncs are always allowed, guardrail G10.)

## 2. KPIs

Shared codes come from `enums.json` → `kpis`. Service-only codes use `crm_ops.<name>` (engine naming rule). The service sends daily values with `engine/metric.recorded`. Targets are Pith planning targets, not measured benchmarks.

| KPI | Code | Formula | Target | Cadence |
|---|---|---|---|---|
| Lead response time (hot) | `lead_response_minutes` | Median business minutes from MQL to first logged touch, grade A | ≤ 5 | Daily |
| SLA met rate | `crm_ops.sla_met_rate` | MQLs touched inside their SLA ÷ all MQLs | ≥ 90% | Daily |
| MQLs | `mqls` | Count of new MQLs | Client plan | Daily |
| SQLs | `sqls` | Count of new SQLs | Client plan | Daily |
| MQL to SQL rate | `crm_ops.mql_to_sql_rate` | SQLs from the MQL cohort ÷ MQLs in the cohort (90-day window) | 25% to 40% | Monthly |
| Hot vs warm lift | `crm_ops.hot_warm_ratio` | SQL rate of grade A ÷ SQL rate of grade B | ≥ 3 | Monthly |
| Sales rejection rate | `crm_ops.rejection_rate` | Rejected MQLs ÷ MQLs worked | ≤ 20% | Monthly |
| Duplicate rate | `duplicate_rate` | Exact duplicate contacts ÷ contacts | < 1% | Daily |
| Incomplete record rate | `crm_ops.incomplete_rate` | Contacts missing a required field ÷ contacts | < 5% | Weekly |
| Consent coverage | `consent_coverage` | Marketable contacts with a valid consent record for their country ÷ marketable contacts | 100% | Daily |
| Flow error rate | `flow_error_rate` | Failed workflow steps ÷ all workflow steps (24 h) | < 0.5% | Daily |
| Source coverage | `crm_ops.source_coverage` | Closed-won revenue with original source and Pith service source ÷ all closed-won revenue | ≥ 95% | Monthly |
| Sync lag | `crm_ops.sync_lag_minutes` | Median minutes from engine `consent.changed` to CRM mirror | ≤ 5 | Daily |
| Data quality score | `crm_ops.data_quality_score` | See section 3 | ≥ 85 | Weekly |
| Gate SLA met | `gate_sla_met` | crm_ops gates decided inside SLA ÷ all crm_ops gates | ≥ 90% | Weekly |

## 3. Data quality score (0 to 100)

Weighted sum of 5 parts. Each part is the share of records that pass (0 to 1).

| Part | Weight | Pass rule |
|---|---|---|
| Consent | 30 | Marketable contact has a valid consent record for its country |
| Uniqueness | 20 | Not an exact duplicate |
| Completeness | 20 | Has all required fields (email or phone, country, lifecycle stage, source; B2B adds company, size band, seniority) |
| Validity | 15 | Email not bounced; phone in E.164; country is ISO 3166-1 |
| Freshness | 15 | Updated or engaged in the last 365 days |

Score = 30·consent + 20·uniqueness + 20·completeness + 15·validity + 15·freshness.
