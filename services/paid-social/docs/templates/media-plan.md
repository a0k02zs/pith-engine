# Monthly media plan: {client}, {month}

Approved at gate G1. The optimizer agent reads the approved version as its limits.

| Market | Platform | Stage | Monthly budget | Daily cap | Target KPI | Target value | Notes |
|---|---|---|---|---|---|---|---|
| | | prospect | | | | | |
| | | retarget | | | | | |
| | | test | | | | | 10 to 20% of total |

- Total monthly budget (client currency):
- Approved by (client budget owner, date):
- Checked by (Pith performance marketer, date):
- Dates with known cost rises (sales, Ramadan, Q4):
- Lift test this quarter (platform, method, dates):

Machine-readable copy for the workflow (stored with the approval item):

```json
{
  "client_id": "cl_123",
  "month": "2026-11",
  "currency": "GBP",
  "total_budget": 30000,
  "test_share": 0.15,
  "lines": [
    {"market": "GB", "platform": "meta", "stage": "prospect", "budget": 18000, "kpi": "cpa", "target": 25},
    {"market": "GB", "platform": "meta", "stage": "retarget", "budget": 7500, "kpi": "cpa", "target": 15},
    {"market": "GB", "platform": "meta", "stage": "test", "budget": 4500, "kpi": "cpa", "target": 25}
  ],
  "max_daily_move_pct": 20,
  "autopause_cpa_multiple": 1.5,
  "autopause_days": 3
}
```
