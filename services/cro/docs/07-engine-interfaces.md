# CRO and Landing Pages: Engine Interfaces

Status: v1, 21 Oct 2026. Built against engine contract v0.1.0 (`/mnt/project-files/engine/`). Service code: `cro` (17).

## 1. What CRO reads

| Need | Engine interface |
|---|---|
| Brand voice, approved claims, banned terms, products, offers, past tests | `GET /clients/{id}/brain?market=` → `brand-profile.json` |
| Past learnings for a page type or theme | Brain search (top 8 results in every agent step, `specs/workflow.md` §6) |
| Lead stage for B2B guardrails (SQL rate) | `engine/conversion.recorded` (kinds lead, mql, sql) |
| Behaviour events on the page | `engine/client.event` |
| Country rules for page text and forms | `POST /compliance/check` → `compliance-check-result.json` |

CRO never reads contact lists. It works with anonymous visitors, aggregate counts and segment definitions.

## 2. What CRO writes

| Output | Engine interface |
|---|---|
| Approvals G1 to G5 | `gate` steps → approval items with shared kinds `plan`, `creative`, `copy`, `claim`, `go_live`, `test_winner`, `escalation` |
| Page and variant files | `artifact.json` (a page is an artifact with channel `landing_page`) |
| Daily and final KPIs | `engine/metric.recorded` |
| Page live | `engine/outbound.recorded`, `type=posted` |
| Learnings | `POST /clients/{id}/learnings` |
| Own events | `svc.cro/*`, listed in `06-kpis.md` section 3 |

## 3. Guardrails that apply

| Engine guardrail | How CRO meets it |
|---|---|
| G3 New claim or price | Variant copy goes through the `compliance` check; a new claim, price or offer opens a `claim` gate (G2c) |
| G6 Compliance before publish | Every `write_external` step has a `compliance` check before it (validated, see section 5) |
| G9 Live site changes | Starting a test, shipping a winner and publishing a page each need a `go_live` gate with `ops_lead` or `client_developer` |
| G10 Removals | Pausing a test (all traffic to control) is risk `remove`, so the monitor can stop a broken test with no gate |

## 4. Requests sent to the engine thread

These are minor additions. CRO works without them today, using `warn` results and manual QA.

1. **Rule `G-DARK-PATTERN`:** block fake countdowns, fake scarcity, pre-ticked consent, confirmshaming and hidden fees on `web_page` and `landing_page` (UK DMCC Act 2024, EU UCPD, FTC Act).
2. **Rule `G-TEST-COOKIE`:** in markets with cookie consent (UK, EU, Canada, GCC, Singapore), an experiment or heatmap tool must load only after consent. `UK-COOKIE` and `EU-COOKIE` may already cover this; please confirm.
3. **Price rules:** `SG-GST-PRICE` (GST-inclusive consumer prices), `GCC-VAT-PRICE` (VAT-inclusive in AE, SA, BH, OM), `UK-DRIP-PRICE` (mandatory fees in the headline price), `CA-DRIP-PRICE` (Competition Act).
4. **Rule `QC-TRACKING-OFF`:** Quebec Law 25, tracking tools off by default.
5. **Tool risk note:** confirm that `experiment.pause` (all traffic back to the approved control) counts as risk `remove` under G10.

## 5. How to check the workflows

All 4 files in `workflow/` validate against `engine/contracts/schemas/workflow-definition.json`. The check also confirms: every `needs` and `goto` target exists; every gate kind and role is in `enums.json`; `skip_if` is used only on `copy` and `creative`; every `write_external` step has a `compliance` check and a `go_live` gate before it. Run:

```
python3 tools/validate-workflows.py
```
