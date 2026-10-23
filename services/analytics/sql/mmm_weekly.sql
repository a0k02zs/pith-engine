-- mmm_weekly: one row per week and market, with revenue (KPI), spend per channel (media), and controls.
-- Dialect: BigQuery. Input: engine.metrics_daily. Output feeds mmm/meridian-config.yaml.
-- Weeks start on Monday (ISO). Markets with a Sunday week (see markets.md) still use ISO weeks in the MMM so all markets align;
-- the holiday controls carry the local calendar.
-- Params: @client_id, @start_date, @end_date.

WITH d AS (
  SELECT DATE_TRUNC(date, ISOWEEK) AS week, market, service, channel, kpi, value
  FROM engine.metrics_daily
  WHERE client_id = @client_id
    AND date BETWEEN @start_date AND @end_date
    AND kpi IN ('revenue', 'spend', 'sends', 'impressions', 'conversions')
)
SELECT
  week,
  market,
  SUM(IF(kpi = 'revenue' AND channel = '*', value, 0))                       AS revenue,
  SUM(IF(kpi = 'conversions' AND channel = '*', value, 0))                   AS conversions,
  -- media spend columns: paid spend is channel 'paid_ad' (enums.channels), split by the Pith service code that ran it
  SUM(IF(kpi = 'spend' AND channel = 'paid_ad' AND service = 'search', value, 0))      AS spend_paid_search,
  SUM(IF(kpi = 'spend' AND channel = 'paid_ad' AND service = 'paid_social', value, 0)) AS spend_paid_social,
  SUM(IF(kpi = 'spend' AND service = 'video', value, 0))                     AS spend_video,
  SUM(IF(kpi = 'spend' AND channel = 'influencer_post', value, 0))           AS spend_influencer,
  SUM(IF(kpi = 'spend' AND channel = 'affiliate_link', value, 0))            AS spend_affiliate,
  SUM(IF(kpi = 'spend' AND channel = 'offline', value, 0))                   AS spend_offline,   -- client-supplied (TV, OOH); not an engine channel
  -- non-paid channels enter as volume, not spend
  SUM(IF(kpi = 'sends' AND channel = 'email', value, 0))                     AS volume_email_sends,
  SUM(IF(kpi = 'impressions' AND channel = 'social_post', value, 0))         AS volume_social_organic
FROM d
GROUP BY week, market
ORDER BY market, week
-- Controls (price index, promotions, holidays incl. Ramadan and Eid, stock-outs) are joined in the Python job from
-- the client brain and the holiday calendar; they are not in metrics_daily.
