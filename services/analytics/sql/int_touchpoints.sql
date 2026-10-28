-- int_touchpoints: every touchpoint that can get credit for a conversion, inside the lookback window.
-- Dialect: BigQuery. Source tables are engine tables replicated to the client's regional dataset:
--   engine.touchpoints, engine.conversions (see engine/db/001_core.sql).
-- One row per (conversion, touchpoint). Identity: contact_id when known, else anonymous_id.
-- Params: @lookback_days (30 B2C, 90 B2B; from the tracking plan), @client_id.

WITH conv AS (
  SELECT id AS conversion_id, client_id, contact_id, anonymous_id, kind, value, currency, occurred_at AS converted_at
  FROM engine.conversions
  WHERE client_id = @client_id
),
tp AS (
  SELECT id AS touchpoint_id, client_id, contact_id, anonymous_id, service, channel, campaign_id, occurred_at
  FROM engine.touchpoints
  WHERE client_id = @client_id
),
joined AS (
  SELECT
    c.conversion_id, c.kind, c.value, c.currency, c.converted_at,
    t.touchpoint_id, t.service, t.channel, t.campaign_id, t.occurred_at
  FROM conv c
  JOIN tp t
    ON (c.contact_id IS NOT NULL AND t.contact_id = c.contact_id)
    OR (c.contact_id IS NULL AND c.anonymous_id IS NOT NULL AND t.anonymous_id = c.anonymous_id)
  WHERE t.occurred_at <= c.converted_at
    AND t.occurred_at >= TIMESTAMP_SUB(c.converted_at, INTERVAL @lookback_days DAY)
)
SELECT
  *,
  ROW_NUMBER() OVER (PARTITION BY conversion_id ORDER BY occurred_at, touchpoint_id)       AS position,
  COUNT(*)     OVER (PARTITION BY conversion_id)                                           AS path_length,
  -- last non-direct: rank touches that are not 'direct', latest first
  IF(channel = 'direct', NULL,
     ROW_NUMBER() OVER (PARTITION BY conversion_id, channel = 'direct' ORDER BY occurred_at DESC, touchpoint_id DESC)) AS nondirect_rank_desc,
  COUNTIF(channel != 'direct') OVER (PARTITION BY conversion_id)                           AS nondirect_count,
  TIMESTAMP_DIFF(converted_at, occurred_at, HOUR) / 24.0                                   AS days_before
FROM joined
