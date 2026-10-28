-- fct_attribution: rule-based credit per (conversion, touchpoint, model). Credits for each conversion and model sum to 1.
-- Dialect: BigQuery. Input: int_touchpoints. Output rows load into engine.attributions (conversion_id, touchpoint_id, model, credit).
-- Models: last_non_direct, position_based (40/20/40), time_decay (7-day half-life), linear, first_touch.
-- data_driven (Markov removal effect) is computed by the Python job `markov_attribution` and appended with model = 'data_driven'.
-- Conversions with no touchpoint in the window get no rows; they show as "unattributed" in attribution_summary.sql.

WITH t AS (SELECT * FROM int_touchpoints),

last_non_direct AS (
  SELECT conversion_id, touchpoint_id, 'last_non_direct' AS model,
    CASE
      WHEN nondirect_count = 0 AND position = path_length THEN 1.0   -- only direct touches: credit the last one
      WHEN nondirect_count > 0 AND nondirect_rank_desc = 1 THEN 1.0
      ELSE 0.0
    END AS credit
  FROM t
),

position_based AS (
  SELECT conversion_id, touchpoint_id, 'position_based' AS model,
    CASE
      WHEN path_length = 1 THEN 1.0
      WHEN path_length = 2 THEN 0.5
      WHEN position = 1 OR position = path_length THEN 0.4
      ELSE 0.2 / (path_length - 2)
    END AS credit
  FROM t
),

time_decay_raw AS (
  SELECT conversion_id, touchpoint_id, POW(0.5, days_before / 7.0) AS w FROM t
),
time_decay AS (
  SELECT conversion_id, touchpoint_id, 'time_decay' AS model,
    w / SUM(w) OVER (PARTITION BY conversion_id) AS credit
  FROM time_decay_raw
),

linear AS (
  SELECT conversion_id, touchpoint_id, 'linear' AS model, 1.0 / path_length AS credit FROM t
),

first_touch AS (
  SELECT conversion_id, touchpoint_id, 'first_touch' AS model, IF(position = 1, 1.0, 0.0) AS credit FROM t
)

SELECT * FROM last_non_direct WHERE credit > 0
UNION ALL SELECT * FROM position_based
UNION ALL SELECT * FROM time_decay
UNION ALL SELECT * FROM linear
UNION ALL SELECT * FROM first_touch WHERE credit > 0
