-- pith_service_roi: spend, Pith fees, results and ROI per Pith service for the monthly ROI report (prompts/report.md, rule 5).
-- Dialect: BigQuery. Sources: engine.metrics_daily (media spend and service KPIs), attribution_summary-style credit from
-- fct_attribution, and pith_fees (client view from billing: service, month, fee, currency).
-- Params: @client_id, @month (first day of the month), @model (attribution model for credited revenue, default 'position_based').

WITH m AS (
  SELECT @month AS start_date, DATE_SUB(DATE_ADD(@month, INTERVAL 1 MONTH), INTERVAL 1 DAY) AS end_date
),
media AS (
  SELECT d.service, SUM(d.value) AS media_spend
  FROM engine.metrics_daily d CROSS JOIN m
  WHERE d.client_id = @client_id AND d.kpi = 'spend' AND d.campaign_id = '*' AND d.channel != '*'
    AND d.date BETWEEN m.start_date AND m.end_date
  GROUP BY 1
),
fees AS (
  SELECT service, SUM(fee) AS pith_fee
  FROM pith_fees
  WHERE month = @month
  GROUP BY 1
),
credit AS (                                         -- credited revenue per service; touchpoints carry the service code
  SELECT tp.service, SUM(a.credit) AS conversions, SUM(a.credit * c.value) AS revenue
  FROM fct_attribution a
  JOIN engine.conversions c ON c.id = a.conversion_id
  JOIN (SELECT DISTINCT conversion_id, touchpoint_id, service FROM int_touchpoints) tp USING (conversion_id, touchpoint_id)
  CROSS JOIN m
  WHERE a.model = @model AND c.client_id = @client_id
    AND DATE(c.occurred_at) BETWEEN m.start_date AND m.end_date
  GROUP BY 1
)
SELECT
  s.service,
  COALESCE(media.media_spend, 0) AS media_spend,
  COALESCE(fees.pith_fee, 0)     AS pith_fee,
  COALESCE(media.media_spend, 0) + COALESCE(fees.pith_fee, 0) AS total_cost,
  COALESCE(credit.conversions, 0) AS credited_conversions,
  COALESCE(credit.revenue, 0)     AS credited_revenue,
  SAFE_DIVIDE(COALESCE(credit.revenue, 0), COALESCE(media.media_spend, 0) + COALESCE(fees.pith_fee, 0)) AS roi,
  @model AS model,
  'estimated' AS label             -- credited revenue is model output; the report says which model
FROM (SELECT service FROM media UNION DISTINCT SELECT service FROM fees UNION DISTINCT SELECT service FROM credit) s
LEFT JOIN media USING (service)
LEFT JOIN fees USING (service)
LEFT JOIN credit USING (service)
ORDER BY total_cost DESC
-- Services with no attributable revenue (brand, PR, analytics itself) show roi 0 or NULL. The report explains them
-- with their own KPIs and the MMM, not with this column.
