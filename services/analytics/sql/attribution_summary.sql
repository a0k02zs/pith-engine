-- attribution_summary: attributed conversions and revenue by channel and model for a period, with spend and ROAS.
-- Dialect: BigQuery. Inputs: fct_attribution, int_touchpoints, engine.conversions, engine.metrics_daily (kpi = 'spend').
-- Params: @client_id, @start_date, @end_date (inclusive).
-- Revenue is deduplicated: each conversion's value is split by credit, so totals per model equal attributed revenue once.

WITH conv AS (
  SELECT id AS conversion_id, value
  FROM engine.conversions
  WHERE client_id = @client_id
    AND DATE(occurred_at) BETWEEN @start_date AND @end_date
),
credited AS (
  SELECT a.model, tp.channel, SUM(a.credit) AS conversions, SUM(a.credit * c.value) AS revenue
  FROM fct_attribution a
  JOIN conv c USING (conversion_id)
  JOIN (SELECT DISTINCT conversion_id, touchpoint_id, channel FROM int_touchpoints) tp USING (conversion_id, touchpoint_id)
  GROUP BY 1, 2
),
unattributed AS (
  SELECT m.model, 'unattributed' AS channel, COUNT(*) AS conversions, SUM(c.value) AS revenue
  FROM conv c
  CROSS JOIN (SELECT DISTINCT model FROM fct_attribution) m
  WHERE c.conversion_id NOT IN (SELECT conversion_id FROM fct_attribution)
  GROUP BY 1, 2
),
spend AS (
  SELECT channel, SUM(value) AS spend
  FROM engine.metrics_daily
  WHERE client_id = @client_id AND kpi = 'spend' AND date BETWEEN @start_date AND @end_date
  GROUP BY 1
)
SELECT
  x.model, x.channel, x.conversions, x.revenue,
  s.spend,
  SAFE_DIVIDE(x.revenue, s.spend) AS roas,
  'estimated' AS label   -- model output; see playbook.md section 7
FROM (SELECT * FROM credited UNION ALL SELECT * FROM unattributed) x
LEFT JOIN spend s USING (channel)
ORDER BY x.model, x.revenue DESC
