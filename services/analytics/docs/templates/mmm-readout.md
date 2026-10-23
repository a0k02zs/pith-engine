# Marketing mix model readout · {{client_name}} · {{quarter}}

Status: **draft for gate G6**. All numbers are "estimated (MMM)".

## Summary
- Model period: {{start}} to {{end}} ({{weeks}} weeks). Markets: {{markets}}.
- Model quality: R² {{r2}}; error on the last 8 held-out weeks (MAPE) {{mape}}%.
- Share of revenue that marketing drove (not the baseline): {{marketing_share}}% (90% interval {{lo}}–{{hi}}%).
- Main advice: {{one_line}}.

## Channel return

| Channel | Spend in period | Average ROI (median) | 90% interval | Marginal ROI | Saturation | Prior from test? |
|---------|-----------------|----------------------|--------------|--------------|------------|------------------|

*Average ROI: revenue per 1 unit of spend across all spend. Marginal ROI: revenue from the next 1 unit. Budget advice uses marginal ROI.*

## Response curves
{{chart: spend vs incremental revenue per channel, current spend marked}}

## Budget scenarios · Draft for approval

| Scenario | Total budget | Change by channel | Expected revenue (median) | 90% interval |
|----------|--------------|-------------------|---------------------------|--------------|
| A · Same budget, new split | | | | |
| B · Budget −10% | | | | |
| C · Budget +10% | | | | |

Rule: no channel moves more than 25% in 1 quarter without a test.

## Where the model is weak
- {{channels_with_wide_intervals}}
- Proposed test to tighten them: {{test}}.

## Method
Google Meridian (Bayesian MMM), weekly data, adstock and saturation per channel, controls: {{controls}}, holidays per market. Priors from tests: {{tests}}.
