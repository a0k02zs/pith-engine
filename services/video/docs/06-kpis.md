# 06 · KPIs, targets and reporting

KPI codes match `engine/contracts/enums.json` (`kpis`). `fatigue_flag` is a derived flag, not a KPI code.
Targets are **starting targets** for this plan. They are estimates, not measured data. The
`performance-analyst` resets them per client after 8 weeks of results.

## 1. Creative performance (per video, per platform, per market)

| KPI key | Name | Formula | Starting target |
|---|---|---|---|
| `hook_rate` | Hook rate | 3-second views ÷ impressions | ≥ 25% (Reels/TikTok ads), ≥ 15% (LinkedIn) |
| `hold_rate` | Hold rate | 15-second views (ThruPlays) ÷ 3-second views | ≥ 30% |
| `completion_rate` | Completion rate | 100% views ÷ 3-second views | ≥ 15% for 15 s ads |
| `avg_watch_minutes` | Average watch time | Total watch minutes ÷ plays | ≥ 40% of length |
| `ctr` | Click-through rate | Link clicks ÷ impressions | ≥ 0.8% (Meta), ≥ 0.5% (LinkedIn) |
| `cpa` | Cost per acquisition | Spend ÷ conversions | Client target from the brief |
| `cpl` | Cost per lead (B2B) | Spend ÷ leads | Client target from the brief |
| `test_win_rate` | Creative win rate | Variants that beat control ÷ variants tested | ≥ 20% |
| `fatigue_flag` | Fatigue flag | Hook rate down 25% vs first week, or frequency > 3 in 7 days | Flag → refresh brief |

Minimum sample: 1,000 impressions per variant before any ranking. Compare only within the same
platform, placement and market.

## 2. Production operations (per job)

| KPI key | Name | Formula | Starting target |
|---|---|---|---|
| `days_brief_to_delivery` | Brief to delivery | Working days from brief accepted to G4 approved | A: ≤ 3 · B: ≤ 10 · C: ≤ 15 |
| `cost_per_finished_video` | Cost per finished video | Job cost ÷ approved exports (count each ratio once) | Track A: lowest; set per package |
| `first_pass_approval_rate` | First-pass approval rate | Scripts approved at G1 with no rework ÷ scripts sent | ≥ 70% |
| `revision_rounds` | Revision rounds | Average rounds per job at G1 + G4 | ≤ 1.5 |
| `gate_sla_met` | Gate service level met | Gates decided inside SLA ÷ all gates | ≥ 90% |
| `qc_first_pass_rate` | QC first pass | Exports with QC pass first time ÷ exports | ≥ 85% |
| `video_reuse_rate` | Reuse rate | Clips made from existing long videos ÷ all videos | ≥ 40% (B2B) |

## 3. Compliance and rights (target 100% or 0)

| KPI key | Name | Target |
|---|---|---|
| `consent_coverage` | Videos with a valid consent record for every person shown or heard | 100% |
| `disclosure_compliance` | Videos with every required AI and ad label | 100% |
| `licence_coverage` | Music, stock and talent assets with a licence ID | 100% |
| `expired_assets_live` | Live placements using an expired licence or revoked consent | 0 |
| `takedown_hours` | Hours from take-down request to removal | ≤ 24 |

## 4. Cost model inputs (to set package prices)

Per job, the `production-planner` records: agent and model cost, AI tool credits (video, avatar,
voice), stock and music fees, creator fees, crew day rates, editor hours, native reviewer hours,
and project management hours. The weekly report shows actual against estimate. After 20 jobs per
track, Pith sets package prices from the median cost plus target margin.

## 5. Weekly video report (written by `performance-analyst`, checked by the strategist)

1. Summary: 3 lines on what worked and what changes next week.
2. Top 5 videos and bottom 5 videos by the brief's main KPI, per market.
3. Hook and angle table: hook type, videos, impressions, hook rate, hold rate, CPA.
4. Fatigue list and the refresh briefs it created.
5. Operations: jobs delivered, days to delivery, gate SLA, QC first pass.
6. Compliance: coverage figures and any open take-down.
7. New learnings added to the client brain, each with its evidence.
