# Approval Gates

7 gates. Each gate goes to the shared approval inbox with the draft, the brand score and the compliance result. Gates run through the engine approval inbox (`engine/specs/approval-inbox.md`). A gate that times out sends `engine/approval.overdue` and escalates. It never approves itself.

| Gate | Engine kind | When | Approver | What they approve | SLA | On timeout |
|---|---|---|---|---|---|---|
| G1 Brief accepted | `plan` | After intake | Pith account lead | Brief is complete; risks known | 24 h | Remind, then escalate to head of growth |
| G2 Concept and budget | `plan` (strategist + client_approver), then `budget` (2 of strategist, client_finance, client_approver) | After strategy | Pith strategist **and** client owner | 1 concept, total budget, split, markets, dates | 48 h | Hold the campaign; no work on assets |
| G3 Creative and claims | `copy` / `creative` / `script`, `claim` for new claims | Inside each channel service | Channel lead; client for new claims and hero assets | Copy, design, video, creator content | Set by each channel (default 48 h) | Channel sends `issue` event |
| G4 Go-live | `go_live` | After QA checklist | Pith account lead | All checks pass, or written exceptions | 24 h | Launch date moves |
| G5 Budget change | `budget_change` | During flight, when a move breaks agent limits | Strategist; client owner too if the total changes | Moves over 20% a day, new channel, new market, any total change | 8 h | Keep current budget |
| G6 Crisis | `escalation` | Negative press, complaint spike, spend anomaly | Pith account lead | Pause, statement, restart | 1 h | Posts and ads in that market stay paused |
| G7 Final report | `report` | 5 days after flight end | Pith strategist | Report accuracy and lessons before client and brain | 48 h | Remind |

## Skip rules

- The engine allows skips only for `copy`, `creative`, `content` and `template` gates. G2, G4, G5, G6 and G7 can never be skipped. Inside channels, a repeat asset with an approved template and no new claims can skip its copy gate.
- Optimizer moves inside limits need no gate. They appear in the daily log and the weekly report.

## Audit

Every gate decision is logged with approver, time, version of the item and comment. Logs are kept for at least 2 years, or longer if a market law asks.
