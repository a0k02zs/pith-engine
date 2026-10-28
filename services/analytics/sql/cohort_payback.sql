-- cohort_payback: payback and LTV:CAC by acquisition month for the monthly ROI report.
-- Dialect: BigQuery. Sources: engine.conversions (kind 'purchase' for B2C, 'closed_won' for B2B), engine.metrics_daily (spend).
-- A customer's cohort is the month of their first conversion. CAC = paid spend in that month / new customers that month.
-- Params: @client_id, @start_month, @end_month (first days of months), @kind ('purchase' or 'closed_won').

WITH conv AS (
  SELECT COALESCE(CAST(contact_id AS STRING), anonymous_id) AS customer, value, DATE(occurred_at) AS day
  FROM engine.conversions
  WHERE client_id = @client_id AND kind = @kind
    AND COALESCE(CAST(contact_id AS STRING), anonymous_id) IS NOT NULL
),
firsts AS (
  SELECT customer, DATE_TRUNC(MIN(day), MONTH) AS cohort
  FROM conv GROUP BY 1
),
rev AS (
  SELECT f.cohort, DATE_DIFF(DATE_TRUNC(c.day, MONTH), f.cohort, MONTH) AS month_n, SUM(c.value) AS revenue
  FROM conv c JOIN firsts f USING (customer)
  GROUP BY 1, 2
),
sizes AS (
  SELECT cohort, COUNT(*) AS customers FROM firsts GROUP BY 1
),
spend AS (
  SELECT DATE_TRUNC(date, MONTH) AS cohort, SUM(value) AS spend
  FROM engine.metrics_daily
  WHERE client_id = @client_id AND kpi = 'spend' AND channel != '*' AND campaign_id = '*'
  GROUP BY 1
),
cum AS (
  SELECT cohort, month_n,
         SUM(revenue) OVER (PARTITION BY cohort ORDER BY month_n) AS cum_revenue
  FROM rev
)
SELECT
  s.cohort,
  s.customers,
  sp.spend,
  SAFE_DIVIDE(sp.spend, s.customers) AS cac,
  -- first month in which cumulative revenue covers the cohort's spend; NULL means not yet paid back
  (SELECT MIN(c.month_n) FROM cum c WHERE c.cohort = s.cohort AND c.cum_revenue >= sp.spend) AS payback_months,
  SAFE_DIVIDE((SELECT MAX(c.cum_revenue) FROM cum c WHERE c.cohort = s.cohort), s.customers) AS ltv_to_date,
  SAFE_DIVIDE(SAFE_DIVIDE((SELECT MAX(c.cum_revenue) FROM cum c WHERE c.cohort = s.cohort), s.customers),
              SAFE_DIVIDE(sp.spend, s.customers)) AS ltv_to_cac,
  'observed' AS label               -- revenue, not margin; the report says so
FROM sizes s
LEFT JOIN spend sp USING (cohort)
WHERE s.cohort BETWEEN @start_month AND @end_month
  AND s.customers >= 20             -- minimum cell size (docs/markets.md rule 6)
ORDER BY s.cohort
