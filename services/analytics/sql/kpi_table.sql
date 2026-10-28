-- kpi_table: the KPI table for the weekly and monthly reports (prompts/report.md).
-- This period, the prior period, the same period last year and the target, per market and KPI, each with a label.
-- Dialect: BigQuery. Sources: engine.metrics_daily, kpi_targets (client view from the client brain:
-- kpi, market, period_start, period_end, target).
-- Params: @client_id, @start_date, @end_date (this period, inclusive).
-- Ratio KPIs are computed from their parts, never averaged over days.

WITH bounds AS (
  SELECT
    @start_date AS cur_start, @end_date AS cur_end,
    DATE_SUB(@start_date, INTERVAL DATE_DIFF(@end_date, @start_date, DAY) + 1 DAY) AS prev_start,
    DATE_SUB(@start_date, INTERVAL 1 DAY) AS prev_end,
    DATE_SUB(@start_date, INTERVAL 1 YEAR) AS ly_start,
    DATE_SUB(@end_date, INTERVAL 1 YEAR) AS ly_end
),
base AS (                                         -- additive KPIs only; channel '*' rows are the totals
  SELECT
    m.market, m.kpi, m.source,
    CASE
      WHEN m.date BETWEEN b.cur_start AND b.cur_end THEN 'current'
      WHEN m.date BETWEEN b.prev_start AND b.prev_end THEN 'prior'
      WHEN m.date BETWEEN b.ly_start AND b.ly_end THEN 'last_year'
    END AS period,
    m.value
  FROM engine.metrics_daily m CROSS JOIN bounds b
  WHERE m.client_id = @client_id
    AND m.channel = '*' AND m.campaign_id = '*'
    AND m.kpi IN ('spend', 'revenue', 'conversions', 'leads', 'clicks', 'impressions', 'sessions', 'pipeline_value')
    AND (m.date BETWEEN b.cur_start AND b.cur_end
      OR m.date BETWEEN b.prev_start AND b.prev_end
      OR m.date BETWEEN b.ly_start AND b.ly_end)
),
sums AS (
  SELECT market, kpi, period, SUM(value) AS value,
         -- label from the source: model output is estimated, ad platforms are platform-reported, the rest observed
         CASE WHEN LOGICAL_OR(source = 'model') THEN 'estimated'
              WHEN LOGICAL_OR(source IN ('meta_ads', 'google_ads', 'linkedin_ads', 'tiktok_ads')) THEN 'platform-reported'
              ELSE 'observed' END AS label
  FROM base GROUP BY 1, 2, 3
),
wide AS (
  SELECT market, period,
    SUM(IF(kpi = 'spend', value, 0)) AS spend,
    SUM(IF(kpi = 'revenue', value, 0)) AS revenue,
    SUM(IF(kpi = 'conversions', value, 0)) AS conversions,
    SUM(IF(kpi = 'clicks', value, 0)) AS clicks,
    SUM(IF(kpi = 'impressions', value, 0)) AS impressions,
    SUM(IF(kpi = 'sessions', value, 0)) AS sessions
  FROM sums GROUP BY 1, 2
),
ratios AS (                                       -- ratio KPIs from their parts
  SELECT market, period, 'roas' AS kpi, SAFE_DIVIDE(revenue, spend) AS value, 'observed' AS label FROM wide
  UNION ALL SELECT market, period, 'cpa', SAFE_DIVIDE(spend, conversions), 'observed' FROM wide
  UNION ALL SELECT market, period, 'ctr', SAFE_DIVIDE(clicks, impressions), 'observed' FROM wide
  UNION ALL SELECT market, period, 'cvr', SAFE_DIVIDE(conversions, sessions), 'observed' FROM wide
),
all_kpis AS (
  SELECT market, kpi, period, value, label FROM sums
  UNION ALL SELECT market, kpi, period, value, label FROM ratios
),
tgt AS (
  SELECT market, kpi, SUM(target) AS target       -- a target for a ratio KPI must be a single row for the period
  FROM kpi_targets
  WHERE period_start <= @end_date AND period_end >= @start_date
  GROUP BY 1, 2
)
SELECT
  k.market, k.kpi,
  MAX(IF(k.period = 'current', k.value, NULL))   AS current_value,
  MAX(IF(k.period = 'prior', k.value, NULL))     AS prior_value,
  MAX(IF(k.period = 'last_year', k.value, NULL)) AS last_year_value,
  ANY_VALUE(t.target)                            AS target,
  SAFE_DIVIDE(MAX(IF(k.period = 'current', k.value, NULL)) - MAX(IF(k.period = 'prior', k.value, NULL)),
              MAX(IF(k.period = 'prior', k.value, NULL)))  AS change_vs_prior,
  MAX(IF(k.period = 'current', k.label, NULL))   AS label
FROM all_kpis k
LEFT JOIN tgt t USING (market, kpi)
GROUP BY k.market, k.kpi
ORDER BY k.market, k.kpi
