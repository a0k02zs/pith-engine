"""Run the service 12 SQL models in DuckDB on sample data.

BigQuery SQL is transpiled with sqlglot. Run from anywhere: python3 services/analytics/sql/test_sql.py
Needs: pip install duckdb sqlglot. daily_kpi_forecast uses BigQuery ML, so it is only parsed here.
"""
import os, sys, duckdb, sqlglot, datetime as dt
SQL = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
def load(name, params, subs=()):
    s = open(f"{SQL}/{name}.sql").read()
    for a, b in subs: s = s.replace(a, b)
    for k in sorted(params, key=len, reverse=True): s = s.replace("@" + k, params[k])
    return sqlglot.transpile(s, read="bigquery", write="duckdb")[0]

con = duckdb.connect()
con.execute("create schema engine")
con.execute("create table engine.metrics_daily(client_id varchar, date date, service varchar, kpi varchar, market varchar, channel varchar, campaign_id varchar, value double, currency varchar, source varchar)")
con.execute("create table engine.conversions(id varchar, client_id varchar, contact_id varchar, anonymous_id varchar, kind varchar, value double, currency varchar, occurred_at timestamp)")
con.execute("create table engine.contacts(id varchar, country varchar, subdivision varchar)")
con.execute("create table source_orders(created_at timestamp, market varchar, net_value double)")
con.execute("create table ga4_events(event_date varchar, event_name varchar, purchase_revenue double)")
con.execute("create table kpi_targets(kpi varchar, market varchar, period_start date, period_end date, target double)")
con.execute("create table pith_fees(service varchar, month date, fee double)")
con.execute("create table geo_units(subdivision varchar, unit varchar)")
C = "'c1'"
d0 = dt.date(2026, 9, 1)
rows = []
for i in range(60):
    d = d0 + dt.timedelta(i)
    for svc, ch, sp in [("search", "paid_ad", 100), ("paid_social", "paid_ad", 50)]:
        rows.append(("c1", d, svc, "spend", "GB", ch, "*", sp + i, "GBP", "google_ads"))
    rows += [("c1", d, "analytics", "spend", "GB", "*", "*", 150 + 2 * i, "GBP", "engine"),
             ("c1", d, "analytics", "revenue", "GB", "*", "*", 600 + 3 * i, "GBP", "engine"),
             ("c1", d, "analytics", "conversions", "GB", "*", "*", 10, None, "engine"),
             ("c1", d, "analytics", "clicks", "GB", "*", "*", 300, None, "ga4"),
             ("c1", d, "analytics", "impressions", "GB", "*", "*", 10000, None, "ga4"),
             ("c1", d, "analytics", "sessions", "GB", "*", "*", 500, None, "ga4"),
             ("c1", d, "search", "spend", "GB-ENG", "paid_ad", "*", 80, "GBP", "google_ads")]
con.executemany("insert into engine.metrics_daily values (?,?,?,?,?,?,?,?,?,?)", rows)
conv = []
for i in range(30):   # 25 customers acquired in Sept, each buys again in Oct
    conv.append((f"s{i}", "c1", f"p{i}", None, "purchase", 40.0, "GBP", dt.datetime(2026, 9, 1 + i % 28, 12)))
    conv.append((f"o{i}", "c1", f"p{i}", None, "purchase", 40.0, "GBP", dt.datetime(2026, 10, 1 + i % 28, 12)))
con.executemany("insert into engine.conversions values (?,?,?,?,?,?,?,?)", conv)
con.executemany("insert into engine.contacts values (?,?,?)", [(f"p{i}", "GB", "GB-ENG" if i % 2 else "GB-SCT") for i in range(30)])
con.executemany("insert into source_orders values (?,?,?)", [(c[7], "GB", c[5]) for c in conv])
con.executemany("insert into ga4_events values (?,?,?)", [(c[7].strftime("%Y%m%d"), "purchase", c[5]) for c in conv[:55]])
con.execute("insert into kpi_targets values ('revenue','GB','2026-10-01','2026-10-31', 25000), ('roas','GB','2026-10-01','2026-10-31', 3.5)")
con.execute("insert into pith_fees values ('search','2026-10-01',2000),('paid_social','2026-10-01',1500),('analytics','2026-10-01',3000)")
con.execute("insert into geo_units values ('GB-ENG','england')")

def q(sql): return con.execute(sql).fetchall()
ok = True
def check(name, cond, msg):
    global ok
    print(("PASS " if cond else "FAIL ") + name + ": " + msg); ok &= bool(cond)

# match_rate_28d (the GA4 wildcard table is replaced by a plain table in DuckDB)
s = load("match_rate_28d", {"client_id": C, "end_date": "DATE '2026-10-28'", "main_event": "'purchase'"},
         [("`ga4.events_*`", "ga4_events"), ("_TABLE_SUFFIX", "event_date"), ("ecommerce.purchase_revenue", "purchase_revenue")])
r = q(s); check("match_rate_28d", len(r) == 28 and all(x[1] >= 0 for x in r), f"{len(r)} days; first {r[0][:6]}")
tot = q(f"select sum(orders_source), sum(orders_ga4) from ({s})")[0]
check("match_rate_28d totals", tot[0] == 30 and tot[1] == 27, f"source {tot[0]}, ga4 {tot[1]} (30 Oct orders; GA4 missed 3)")

# kpi_table
s = load("kpi_table", {"client_id": C, "start_date": "DATE '2026-10-01'", "end_date": "DATE '2026-10-30'"})
r = {(x[0], x[1]): x for x in q(s)}
rev = r[("GB", "revenue")]; roas = r[("GB", "roas")]
exp_rev = sum(600 + 3 * i for i in range(30, 60)); exp_prior = sum(600 + 3 * i for i in range(0, 30))
check("kpi_table revenue", rev[2] == exp_rev and rev[3] == exp_prior and rev[5] == 25000, f"current {rev[2]} prior {rev[3]} target {rev[5]}")
exp_roas = exp_rev / sum(150 + 2 * i for i in range(30, 60))
check("kpi_table roas from parts", abs(roas[2] - exp_roas) < 1e-9 and roas[5] == 3.5, f"roas {roas[2]:.4f} vs {exp_roas:.4f}")
check("kpi_table label", rev[7] == "observed", rev[7])

# pith_service_roi: fct_attribution and int_touchpoints stubbed with 1 credit per Oct conversion to service 'search'
con.execute("create table int_touchpoints as select id as conversion_id, 1 as touchpoint_id, 'search' as service from engine.conversions")
con.execute("create table fct_attribution as select id as conversion_id, 1 as touchpoint_id, 'position_based' as model, 1.0 as credit from engine.conversions")
s = load("pith_service_roi", {"client_id": C, "month": "DATE '2026-10-01'", "model": "'position_based'"})
r = {x[0]: x for x in q(s)}
oct_search_spend = sum(100 + i for i in range(30, 60)) + 80 * 30   # Oct 1 to 30 in data (day 60 = Oct 30)
check("pith_service_roi search", abs(r["search"][1] - oct_search_spend) < 1e-6 and r["search"][2] == 2000 and r["search"][5] == 1200,
      f"media {r['search'][1]} fee {r['search'][2]} revenue {r['search'][5]} roi {r['search'][6]:.3f}")
check("pith_service_roi fee-only service", r["analytics"][1] == 0 and r["analytics"][2] == 3000, str(r["analytics"][:7]))

# cohort_payback
s = load("cohort_payback", {"client_id": C, "start_month": "DATE '2026-09-01'", "end_month": "DATE '2026-10-01'", "kind": "'purchase'"})
r = q(s)
check("cohort_payback", len(r) == 1 and r[0][1] == 30, f"{r}")
sept_spend = sum(100 + i + 50 + i + 80 for i in range(30))
check("cohort_payback cac and ltv", abs(r[0][3] - sept_spend / 30) < 1e-6 and r[0][5] == 80, f"cac {r[0][3]:.2f} ltv {r[0][5]} payback {r[0][4]}")

# geo_daily_52w
s = load("geo_daily_52w", {"client_id": C, "as_of": "DATE '2026-10-30'", "market": "'GB'", "kind": "'purchase'"})
r = q(s)
units = sorted({x[1] for x in r})
check("geo_daily_52w units", units == ["GB-SCT", "england"], str(units))
check("geo_daily_52w conversions", sum(x[2] for x in r) == 60, f"{sum(x[2] for x in r)} conversions")
eng = [x for x in r if x[1] == "england" and str(x[0]) == "2026-10-02"]
check("geo_daily_52w spend maps to the same unit", len(eng) == 1 and eng[0][4] == 80, str(eng))

# daily_kpi_forecast: BigQuery ML cannot run here; parse only
s = open(f"{SQL}/daily_kpi_forecast.sql").read()
try:
    parsed = sqlglot.parse(s, read="bigquery"); check("daily_kpi_forecast parses", len(parsed) == 2, f"{len(parsed)} statements")
except Exception as e:
    check("daily_kpi_forecast parses", False, str(e)[:300])
sys.exit(0 if ok else 1)
