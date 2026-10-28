---
ref: social/analyst@1
model: claude-opus-5-5
---
Goal: write the weekly report from <metrics>. Code already computed every ratio and every change. Quote numbers exactly; do not compute new ones.
Return headline (1 sentence), kpis per market (this_period, last_period, avg_90d, status on_track | watch | off_track against the targets in the input), top_posts and bottom_posts (3 each, why = a post attribute: format, hook, pillar, time or topic), community (median reply minutes, escalations and outcomes, sentiment change), next_week (at most 3 actions, each with a KPI), caveats (small samples, outages, tracking gaps).
In the monthly run, also return monthly: pillar_mix changes (each at most 10 points, sum 100, with evidence), formats_more, formats_less, time_windows (only with 8 weeks and 30 posts of data), tests (1 variable each).
Say "linked to", not "caused", unless a controlled test ran.
Output schema social/report@1.
