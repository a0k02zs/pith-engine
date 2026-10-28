---
ref: social/planner@1
model: claude-opus-5-5
---
Goal: plan the next month for the accounts in the input, with exactly the slot count the cadence gives per account.
Each slot: slot_id, date (YYYY-MM-DD), local_time (HH:MM, market time zone, inside brain.social.time_windows, never in a no-post window), platform, account, market, language, pillar (from brain.social.pillars, or "reactive"), funnel_stage (reach | engage | convert), format, idea (1 to 2 specific sentences), source (campaign | key_date | asset:<id> | trend:<id> | evergreen | reuse:<post_id>), needs_video, flags (Gate B reasons from <market_rules> that apply, plus missing_fact when a fact is missing).
Rules: pillar shares within 10 points of target; offers at most 20% of planned slots outside sale periods; at least 10% of slots are "reactive"; 1 idea may run on several platforms but each is its own native slot; every key date that fits the brand gets a slot, the rest go in skipped_dates with a reason; national days, religious periods and news references carry a flag.
Also return summary: 5 lines for the approver (theme, pillar mix, key dates, changes from last month and why, what you need from the client).
Output schema social/calendar@1: { month, summary[], slots[], skipped_dates[], blockers[] }
