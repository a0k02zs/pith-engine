import { Link } from "react-router-dom";
import type { Overview } from "../../server/types";
import { useApi } from "../api";
import { LineChart } from "../components/charts";
import { Card, Loading, PageHead, Pill, Stat } from "../components/ui";
import { gbp, num, pctChange } from "../format";

export function DeckPage() {
  const { data, error } = useApi<Overview>("/overview");
  if (!data) return <Loading error={error} />;
  const t = data.totals, p = data.previous;
  const active = data.runs.running + data.runs.waiting_approval + data.runs.waiting_event;
  return (
    <>
      <PageHead title="Command deck" sub="All clients and all 18 services, last 28 days. Money in GBP." />
      <div className="stats">
        <Stat label="Spend" value={gbp(t.spend)} delta={pctChange(t.spend, p.spend)} />
        <Stat label="Revenue" value={gbp(t.revenue)} delta={pctChange(t.revenue, p.revenue)} />
        <Stat label="ROAS" value={`${t.roas.toFixed(2)}×`} delta={pctChange(t.roas, p.roas)} />
        <Stat label="Leads" value={num(t.leads)} delta={pctChange(t.leads, p.leads)} />
      </div>
      <div className="grid-2">
        <Card title="Needs you now" action={<Link to="/approvals" className="small">Open inbox →</Link>}>
          <div className="row gap-l pad-b">
            <Link to="/approvals?filter=overdue" className="mini-stat bad"><b>{data.approvals.overdue}</b> overdue</Link>
            <Link to="/approvals?filter=urgent" className="mini-stat warn"><b>{data.approvals.urgent}</b> urgent</Link>
            <Link to="/approvals" className="mini-stat"><b>{data.approvals.due_24h}</b> due in 24 h</Link>
            <Link to="/approvals" className="mini-stat"><b>{data.approvals.open}</b> open</Link>
          </div>
          {data.attention.length === 0 ? <p className="muted">Nothing needs you.</p> : (
            <ul className="list">
              {data.attention.slice(0, 8).map((a) => (
                <li key={a.kind + a.id}>
                  <Link to={a.kind === "approval" ? `/approvals/${a.id}` : a.kind === "run" ? `/runs/${a.id}` : `/clients/${a.id}`}>
                    <Pill tone={a.severity === "action" ? "bad" : "warn"}>{a.kind}</Pill> {a.title}
                  </Link>
                  <div className="muted small">{a.detail}</div>
                </li>
              ))}
            </ul>
          )}
          {data.attention.length > 8 && <p className="small muted">{data.attention.length - 8} more in the <Link to="/approvals?filter=overdue">inbox</Link> and <Link to="/runs">runs</Link>.</p>}
        </Card>
        <Card title="Pipelines" action={<Link to="/runs" className="small">All runs →</Link>}>
          <div className="stats stats-tight">
            <Stat label="Active runs" value={active} />
            <Stat label="Need approval" value={data.runs.waiting_approval} />
            <Stat label="Waiting for event or task" value={data.runs.waiting_event} />
            <Stat label="Failed" value={data.runs.failed} />
          </div>
          <LineChart rows={data.daily} height={150} format={(n) => gbp(n)}
            series={[{ key: "revenue", label: "Revenue", color: "var(--c1)" }, { key: "spend", label: "Spend", color: "var(--c2)" }]} />
        </Card>
      </div>
      <Card title="Service health" action={<span className="small muted">Good, watch or action, from failed runs and overdue approvals</span>}>
        <div className="tiles">
          {data.services.map((s) => (
            <Link key={s.code} to={`/services/${s.code}`} className={`tile tile-${s.health}`}>
              <div className="tile-top"><span className="muted small">#{s.number}</span><span className={`dot dot-${s.health}`} aria-label={s.health} /></div>
              <b>{s.name}</b>
              <div className="small muted">{s.runs_active} active · {s.approvals_open} to approve{s.approvals_overdue ? ` · ${s.approvals_overdue} overdue` : ""}{s.runs_failed_7d ? ` · ${s.runs_failed_7d} failed` : ""}</div>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
