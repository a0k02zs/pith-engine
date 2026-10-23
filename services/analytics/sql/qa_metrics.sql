-- qa_metrics: daily inputs for the data-qa agent (agents/data-qa.md).
-- Dialect: BigQuery. Sources: order system or CRM export (source_orders), engine.conversions, engine.metrics_daily,
-- and load timestamps from the dataset's __TABLES__ metadata.
-- Params: @client_id, @start_date, @end_date.

WITH src AS (                       -- truth: order system (B2C) or CRM closed-won/opportunities (B2B)
  SELECT DATE(created_at) AS day, market, COUNT(*) AS orders_source, SUM(net_value) AS revenue_source
  FROM source_orders
  WHERE DATE(created_at) BETWEEN @start_date AND @end_date
  GROUP BY 1, 2
),
wh AS (
  SELECT DATE(c.occurred_at) AS day, COALESCE(ct.country, 'unknown') AS market,
         COUNT(*) AS orders_warehouse, SUM(c.value) AS revenue_warehouse
  FROM engine.conversions c
  LEFT JOIN engine.contacts ct ON ct.id = c.contact_id
  WHERE c.client_id = @client_id AND c.kind IN ('purchase', 'closed_won')
    AND DATE(c.occurred_at) BETWEEN @start_date AND @end_date
  GROUP BY 1, 2
),
spend AS (
  SELECT date AS day, market, TO_JSON_STRING(ARRAY_AGG(STRUCT(channel, value))) AS spend_by_platform
  FROM engine.metrics_daily
  WHERE client_id = @client_id AND kpi = 'spend' AND date BETWEEN @start_date AND @end_date
  GROUP BY 1, 2
)
SELECT
  day, market,
  src.orders_source, wh.orders_warehouse,
  SAFE_DIVIDE(wh.orders_warehouse, src.orders_source)  AS match_rate,
  src.revenue_source, wh.revenue_warehouse,
  SAFE_DIVIDE(ABS(wh.revenue_warehouse - src.revenue_source), src.revenue_source) AS revenue_gap,
  spend.spend_by_platform
FROM src
FULL OUTER JOIN wh USING (day, market)
LEFT JOIN spend USING (day, market)
ORDER BY day, market
-- utm coverage, consent rate and event volumes come from the GA4 export (events_*) in a second query
-- owned by the engine's measurement part; freshness comes from INFORMATION_SCHEMA. Both are added to the agent input.
