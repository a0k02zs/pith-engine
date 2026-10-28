-- daily_kpi_forecast: expected value and 90% band per market, channel and KPI, for the anomaly agent (prompts/alerts.md).
-- Dialect: BigQuery with BigQuery ML. Source: engine.metrics_daily. Model: ARIMA_PLUS, 1 series per market, channel and KPI.
-- Params: @client_id, @as_of (the last full day). The model trains on the 365 days before the last 56, so the last 56
-- days are scored against a forecast that did not see them.
-- Run as 2 statements: the CREATE MODEL (weekly), then the SELECT (daily).

CREATE OR REPLACE MODEL analytics_models.kpi_forecast
OPTIONS (
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'date',
  time_series_data_col = 'value',
  time_series_id_col = ['market', 'channel', 'kpi'],
  holiday_region = 'GLOBAL',            -- local holidays, Ramadan and Eid come in as change-log rows, not from BigQuery ML
  auto_arima = TRUE,
  data_frequency = 'DAILY'
) AS
SELECT date, market, channel, kpi, SUM(value) AS value
FROM engine.metrics_daily
WHERE client_id = @client_id
  AND kpi IN ('spend', 'revenue', 'conversions', 'clicks', 'impressions')
  AND campaign_id = '*'
  AND date BETWEEN DATE_SUB(@as_of, INTERVAL 420 DAY) AND DATE_SUB(@as_of, INTERVAL 56 DAY)
GROUP BY 1, 2, 3, 4;

WITH fc AS (
  SELECT DATE(forecast_timestamp) AS date, market, channel, kpi,
         forecast_value AS expected,
         prediction_interval_lower_bound AS band_low,
         prediction_interval_upper_bound AS band_high
  FROM ML.FORECAST(MODEL analytics_models.kpi_forecast, STRUCT(56 AS horizon, 0.9 AS confidence_level))
),
actual AS (
  SELECT date, market, channel, kpi, SUM(value) AS observed
  FROM engine.metrics_daily
  WHERE client_id = @client_id AND campaign_id = '*'
    AND date BETWEEN DATE_SUB(@as_of, INTERVAL 55 DAY) AND @as_of
  GROUP BY 1, 2, 3, 4
),
ratio AS (                                         -- cpa and roas from the parts; the band comes from the parts too
  SELECT a.date, a.market, a.channel, kpi_name AS kpi,
         CASE kpi_name WHEN 'cpa' THEN SAFE_DIVIDE(s.observed, c.observed) ELSE SAFE_DIVIDE(r.observed, s.observed) END AS observed,
         CASE kpi_name WHEN 'cpa' THEN SAFE_DIVIDE(fs.expected, fc_c.expected) ELSE SAFE_DIVIDE(fr.expected, fs.expected) END AS expected,
         CAST(NULL AS FLOAT64) AS band_low, CAST(NULL AS FLOAT64) AS band_high
  FROM (SELECT DISTINCT date, market, channel FROM actual) a
  CROSS JOIN UNNEST(['cpa', 'roas']) AS kpi_name
  LEFT JOIN actual s ON s.date = a.date AND s.market = a.market AND s.channel = a.channel AND s.kpi = 'spend'
  LEFT JOIN actual c ON c.date = a.date AND c.market = a.market AND c.channel = a.channel AND c.kpi = 'conversions'
  LEFT JOIN actual r ON r.date = a.date AND r.market = a.market AND r.channel = a.channel AND r.kpi = 'revenue'
  LEFT JOIN fc fs ON fs.date = a.date AND fs.market = a.market AND fs.channel = a.channel AND fs.kpi = 'spend'
  LEFT JOIN fc fc_c ON fc_c.date = a.date AND fc_c.market = a.market AND fc_c.channel = a.channel AND fc_c.kpi = 'conversions'
  LEFT JOIN fc fr ON fr.date = a.date AND fr.market = a.market AND fr.channel = a.channel AND fr.kpi = 'revenue'
)
SELECT a.date, a.market, a.channel, a.kpi, a.observed, f.expected, f.band_low, f.band_high
FROM actual a
JOIN fc f USING (date, market, channel, kpi)
UNION ALL
SELECT date, market, channel, kpi, observed, expected, band_low, band_high FROM ratio
ORDER BY market, channel, kpi, date
-- The anomaly agent applies the rules (2 days outside the band, or 1 day outside 2 times the band width).
-- cpa and roas have no band; the agent judges them through spend, conversions and revenue.
