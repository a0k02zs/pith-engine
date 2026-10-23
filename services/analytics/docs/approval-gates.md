# Approval gates · service 12

All gates are approval items in the engine approval inbox. No private approval flow. Each item shows the draft, the agent's confidence, the data-quality score and the compliance result.

| Gate | Engine approval kind | What is approved | Approvers (roles) | SLA | Can it be skipped? |
|------|----------------------|------------------|-------------------|-----|--------------------|
| G1 Audit sign-off | `plan` | The measurement audit and the fix list | `analytics_lead` | 48 h | No |
| G2 Tracking plan | `plan` | Events, conversions, values, consent mapping, lookback windows | `analytics_lead` + `client_marketing_lead` | 72 h | No |
| G3 Tracking go-live | `go_live` | Publish of the tag container, server container, conversion API links | `analytics_lead` + `ops_lead` | 24 h | No. Also needs a compliance `check` pass |
| G4 Report review | `report` | Weekly report, monthly ROI report, test readout, any number sent to the client | `strategist` | Weekly 8 h, monthly 48 h | No. The engine allows skips only for copy, creative, content and template gates. |
| G5 Test design | `plan`, then `budget_change` | Test design (holdout, regions, dates, cost), then the spend change itself | `strategist` + `client_marketing_lead`; then `performance_marketer` | 72 h, then 8 h | No |
| G6 MMM and budget advice | `plan` | MMM fit, channel ROI, budget scenarios sent to the client | `analytics_lead` + `strategist` | 72 h | No |

Idea for later: a weekly report with 4 clean weeks, no alert and no budget advice could skip G4. This needs an engine change, so it is not in v0.1.

## What the agent attaches to each gate

- **G1:** audit file, score per area, top 10 fixes with effort and value, screenshots of tag tests.
- **G2:** tracking plan YAML, diff from the last version, list of personal data fields, consent category per event.
- **G3:** container version diff, test results from the test site (each event fires, each value is right, consent states respected), compliance check result.
- **G4:** report draft, data-quality score, list of numbers with their label (observed, modelled, estimated, platform-reported), and any anomaly found.
- **G5:** test design file, power calculation, expected cost of paused spend.
- **G6:** model fit (R², MAPE on holdout weeks), channel ROI with 90% credible intervals, prior sources, scenario table.

## Blocks that stop a gate

The workflow stops and opens an incident, not a gate, when:
- Tracking coverage falls under 80% (see `kpis.md`).
- Warehouse revenue and order-system revenue differ by more than 5% for the week.
- A consent check fails for any market.
- MMM fit fails: MAPE over 15% on holdout weeks, or a channel ROI interval crosses zero with a point estimate over 3.
