-- geo_daily_52w: 52 weeks of daily conversions and spend by region, for the test designer (prompts/test_design.md).
-- Dialect: BigQuery. Sources: engine.conversions joined to engine.contacts for the region, engine.metrics_daily for spend.
-- Region: contacts.subdivision (ISO 3166-2) when set, else contacts.country. UK ITV regions and US DMAs come from a
-- mapping view geo_units(subdivision, unit) when the client has one; otherwise the subdivision is the unit.
-- Params: @client_id, @as_of, @market (ISO 3166-1 alpha-2), @kind ('purchase' or 'closed_won').

WITH conv AS (
  SELECT DATE(c.occurred_at) AS day,
         COALESCE(g.unit, ct.subdivision, ct.country) AS unit,
         c.value
  FROM engine.conversions c
  JOIN engine.contacts ct ON ct.id = c.contact_id
  LEFT JOIN geo_units g ON g.subdivision = ct.subdivision
  WHERE c.client_id = @client_id AND c.kind = @kind AND ct.country = @market
    AND DATE(c.occurred_at) BETWEEN DATE_SUB(@as_of, INTERVAL 364 DAY) AND @as_of
),
conv_daily AS (
  SELECT day, unit, COUNT(*) AS conversions, SUM(value) AS revenue
  FROM conv GROUP BY 1, 2
),
spend_daily AS (                                     -- metrics_daily.market holds the subdivision when the platform reports one
  SELECT d.date AS day, COALESCE(g.unit, d.market) AS unit, SUM(d.value) AS spend
  FROM engine.metrics_daily d
  LEFT JOIN geo_units g ON g.subdivision = d.market     -- same mapping as conversions, so the units match
  WHERE d.client_id = @client_id AND d.kpi = 'spend' AND d.channel != '*' AND d.campaign_id = '*'
    AND STARTS_WITH(d.market, CONCAT(@market, '-'))     -- national rows cannot be split by region and are left out
    AND d.date BETWEEN DATE_SUB(@as_of, INTERVAL 364 DAY) AND @as_of
  GROUP BY 1, 2
)
SELECT
  day, unit,
  COALESCE(c.conversions, 0) AS conversions,
  COALESCE(c.revenue, 0)     AS revenue,
  COALESCE(s.spend, 0)       AS spend
FROM conv_daily c
FULL OUTER JOIN spend_daily s USING (day, unit)
ORDER BY unit, day
-- Contacts with no contact_id (anonymous conversions) have no region and are left out; the designer gets their
-- share as a note. Singapore has no geo units (docs/markets.md); the designer uses an audience holdout there.
