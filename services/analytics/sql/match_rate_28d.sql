-- match_rate_28d: 28 days of conversions from the order system, GA4 and the engine, for the onboarding audit (prompts/audit.md).
-- Dialect: BigQuery. Sources: source_orders (client view, as in qa_metrics.sql), the GA4 export (ga4.events_*),
-- engine.conversions and engine.contacts.
-- Params: @client_id, @end_date (the window is the 28 days that end on it), @main_event (GA4 event name of the main conversion).

WITH days AS (
  SELECT day FROM UNNEST(GENERATE_DATE_ARRAY(DATE_SUB(@end_date, INTERVAL 27 DAY), @end_date)) AS day
),
src AS (
  SELECT DATE(created_at) AS day, COUNT(*) AS orders_source, SUM(net_value) AS revenue_source
  FROM source_orders
  WHERE DATE(created_at) BETWEEN DATE_SUB(@end_date, INTERVAL 27 DAY) AND @end_date
  GROUP BY 1
),
ga4 AS (
  SELECT PARSE_DATE('%Y%m%d', event_date) AS day, COUNT(*) AS orders_ga4,
         SUM(ecommerce.purchase_revenue) AS revenue_ga4
  FROM `ga4.events_*`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(@end_date, INTERVAL 27 DAY)) AND FORMAT_DATE('%Y%m%d', @end_date)
    AND event_name = @main_event
  GROUP BY 1
),
wh AS (
  SELECT DATE(occurred_at) AS day, COUNT(*) AS orders_warehouse
  FROM engine.conversions
  WHERE client_id = @client_id AND kind IN ('purchase', 'closed_won')
    AND DATE(occurred_at) BETWEEN DATE_SUB(@end_date, INTERVAL 27 DAY) AND @end_date
  GROUP BY 1
)
SELECT
  d.day,
  COALESCE(src.orders_source, 0)    AS orders_source,
  COALESCE(ga4.orders_ga4, 0)       AS orders_ga4,
  COALESCE(wh.orders_warehouse, 0)  AS orders_warehouse,
  SAFE_DIVIDE(ga4.orders_ga4, src.orders_source)       AS match_rate_ga4,        -- audit area 3: target 0.95 to 1.02
  SAFE_DIVIDE(wh.orders_warehouse, src.orders_source)  AS match_rate_warehouse,
  src.revenue_source, ga4.revenue_ga4
FROM days d
LEFT JOIN src USING (day)
LEFT JOIN ga4 USING (day)
LEFT JOIN wh USING (day)
ORDER BY d.day
-- The audit agent also gets the 28-day totals: SUM(orders_ga4) / SUM(orders_source). A day with no source orders
-- has a NULL rate, so one quiet day does not count as a failure.
