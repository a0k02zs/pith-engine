import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ApprovalItem, Client, Overview, Run, ServiceInfo, WorkflowDef } from "../../server/types";
import { useApi } from "../api";
import { BarList, LineChart } from "../components/charts";
import { Icon } from "../components/icons";
import { StartRunDialog } from "../components/StartRun";
import type { ServiceLinks } from "../../server/links";
import { Card, Loading, PageHead, Pill, Stat } from "../components/ui";
import { kpiValue, label } from "../format";
import { RunsTable } from "./Runs";

export function ServicesPage() {
  const services = useApi<ServiceInfo[]>("/services");
  const ov = useApi<Overview>("/overview");
  if (!services.data || !ov.data) return <Loading error={services.error ?? ov.error} />;
  const health = Object.fromEntries(ov.data.services.map((s) => [s.code, s]));
  return (
    <>
      <PageHead title="Services" sub="The 18 Pith services. Open one to run its pipelines." />
      <div className="tiles tiles-l">
        {services.data.map((s) => {
          const h = health[s.code];
          return (
            <Link key={s.code} to={`/services/${s.code}`} className={`tile tile-${h.health}`}>
              <div className="tile-top"><span className="muted small">Service {s.number}</span><span className={`dot dot-${h.health}`} aria-label={h.health} /></div>
              <b>{s.name}</b>
              <div className="small muted">{s.workflow_count} pipelines · lead {label(s.lead_role)}</div>
              <div className="small">{h.runs_active} active runs · {h.approvals_open} to approve</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

type ServiceDetail = ServiceInfo & { workflows: WorkflowDef[]; clients: string[] };

function triggerText(t: WorkflowDef["trigger"]) {
  const parts: string[] = [];
  if (t.cron) parts.push(`schedule ${t.cron}`);
  if (t.event) parts.push(`event ${t.event}`);
  if (t.manual) parts.push("manual");
  return parts.join(" · ");
}

export function ServicePage() {
  const { code } = useParams();
  const svc = useApi<ServiceDetail>(`/services/${code}`);
  const runs = useApi<Run[]>(`/runs?service=${code}`);
  const appr = useApi<ApprovalItem[]>(`/approvals?status=open&service=${code}`);
  const clients = useApi<Client[]>("/clients");
  const from = new Date(Date.now() - 27 * 864e5).toISOString().slice(0, 10);
  const daily = useApi<Array<Record<string, number | string>>>(`/metrics?service=${code}&from=${from}&group_by=date`);
  const byClient = useApi<Array<Record<string, number | string>>>(`/metrics?service=${code}&from=${from}&group_by=client_id`);
  const links = useApi<ServiceLinks>(`/services/${code}/links`);
  const [start, setStart] = useState<WorkflowDef | null>(null);
  const [tab, setTab] = useState<"pipelines" | "runs" | "approvals">("pipelines");
  if (!svc.data || !clients.data) return <Loading error={svc.error} />;
  const s = svc.data;
  const cname = Object.fromEntries(clients.data.map((c) => [c.id, c.name]));
  const totals = Object.fromEntries(s.kpis.map((k) => [k, (daily.data ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0)]));
  const colors = ["var(--c1)", "var(--c2)", "var(--c3)"];
  return (
    <>
      <PageHead title={`${s.number}. ${s.name}`} sub={<>Lead role {label(s.lead_role)} · {s.workflows.length} pipelines · {s.clients.length} clients · code <span className="mono">{s.code}</span></>} />
      <div className="stats">
        {s.kpis.map((k) => <Stat key={k} label={`${label(k)} (28 days)`} value={kpiValue(k, totals[k] ?? 0)} />)}
        <Stat label="Active runs" value={(runs.data ?? []).filter((r) => ["running", "waiting_approval", "waiting_event"].includes(r.status)).length} hint={`${appr.data?.length ?? 0} approvals open`} />
      </div>
      <div className="grid-2 wide-left">
        <Card title="Daily KPIs">
          {daily.data ? <LineChart rows={daily.data} series={s.kpis.map((k, i) => ({ key: k, label: label(k), color: colors[i] }))} /> : <Loading />}
        </Card>
        <Card title={`${label(s.kpis[0])} by client`}>
          {byClient.data ? <BarList format={(n) => kpiValue(s.kpis[0], n)} items={byClient.data.map((r) => ({ label: cname[String(r.client_id)] ?? "?", value: Number(r[s.kpis[0]] ?? 0), href: `/clients/${r.client_id}` }))} /> : <Loading />}
        </Card>
      </div>
      {links.data && (
        <Card title="Tools for this service" action={<span className="small muted">Opens in a new tab</span>}>
          <div className="tool-grid">
            {links.data.platforms.map((p) => (
              <a key={p.id} className="tool" href={p.url} target="_blank" rel="noopener noreferrer">
                <span className="tool-name">{p.name} <Icon name="external" size={13} /></span>
                <span className="small muted">{p.what}</span>
              </a>
            ))}
            {links.data.build_pack.map((b) => (
              <a key={b.url} className="tool tool-repo" href={b.url} target="_blank" rel="noopener noreferrer">
                <span className="tool-name">{b.label} <Icon name="external" size={13} /></span>
                <span className="small muted">pith-engine on GitHub</span>
              </a>
            ))}
          </div>
          {s.code === "video" && <p className="small"><Link to="/video">Make an AI ad in Video studio (beta)</Link> with Runway and Higgsfield.</p>}
          <p className="small muted">To open a client's own ad accounts, save the client's account IDs under Clients, Accounts and links.</p>
        </Card>
      )}
      <div className="tabs" role="tablist">
        {(["pipelines", "runs", "approvals"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
            {label(t)} {t === "pipelines" ? `(${s.workflows.length})` : t === "runs" ? `(${runs.data?.length ?? 0})` : `(${appr.data?.length ?? 0})`}
          </button>
        ))}
      </div>
      {tab === "pipelines" && (
        <Card className="flush">
          <table className="table">
            <thead><tr><th>Pipeline</th><th>Trigger</th><th>Steps</th><th>Gates</th><th /></tr></thead>
            <tbody>
              {s.workflows.map((w) => {
                const gates = w.steps.filter((x) => x.gate);
                return (
                  <tr key={w.id}>
                    <td><b className="mono">{w.id}</b><div className="small muted clamp">{w.description}</div></td>
                    <td className="small">{triggerText(w.trigger)}</td>
                    <td>{w.steps.length}</td>
                    <td><div className="row wrap gap-s">{[...new Set(gates.map((g) => g.gate!.approval_kind))].map((k) => <Pill key={k}>{label(k)}</Pill>)}</div></td>
                    <td><button className="btn btn-sm btn-primary" onClick={() => setStart(w)}>Start run</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {tab === "runs" && <Card className="flush">{runs.data ? <RunsTable runs={runs.data} clients={clients.data} /> : <Loading />}</Card>}
      {tab === "approvals" && (
        <Card className="flush">
          {(appr.data ?? []).length === 0 ? <p className="pad muted">No open approvals.</p> : (
            <ul className="list pad">
              {appr.data!.map((a) => <li key={a.id}><Link to={`/approvals/${a.id}?filter=all`}><b>{a.title}</b></Link><div className="small muted">{cname[a.client_id]} · {label(a.kind)}</div></li>)}
            </ul>
          )}
        </Card>
      )}
      {start && <StartRunDialog workflow={start} clients={clients.data} onClose={() => setStart(null)} />}
    </>
  );
}
