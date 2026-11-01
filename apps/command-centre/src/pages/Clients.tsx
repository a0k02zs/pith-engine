import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Client, Overview, Run, ServiceInfo } from "../../server/types";
import { post, useApi } from "../api";
import { LineChart } from "../components/charts";
import { Card, Loading, Modal, PageHead, Pill, Stat, useToast } from "../components/ui";
import { gbp, label, num, pctChange } from "../format";
import { ClientConnections } from "./ClientConnections";
import { ClientStrategy } from "./ClientStrategy";
import { RunsTable } from "./Runs";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "strategy", label: "Strategy" },
  { id: "connections", label: "Accounts and links" },
] as const;

export function ClientsPage() {
  const clients = useApi<Client[]>("/clients");
  if (!clients.data) return <Loading error={clients.error} />;
  return (
    <>
      <PageHead title="Clients" sub="Test clients until real client data exists. Each one covers different markets and services." />
      <div className="tiles tiles-l">
        {clients.data.map((c) => (
          <Link key={c.id} to={`/clients/${c.id}`} className={`tile ${c.paused ? "tile-action" : ""}`}>
            <div className="tile-top"><Pill>{c.model}</Pill>{c.paused ? <Pill tone="bad">Paused</Pill> : <Pill tone="good">Live</Pill>}</div>
            <b>{c.name}</b>
            <div className="small muted">{c.industry} · {c.markets.join(", ")} · {c.services.length} services</div>
            <div className="small">Account lead {c.account_lead}</div>
          </Link>
        ))}
      </div>
    </>
  );
}

export function ClientDetailPage() {
  const { id } = useParams();
  const client = useApi<Client>(`/clients/${id}`);
  const ov = useApi<Overview>(`/overview?client_id=${id}`);
  const runs = useApi<Run[]>(`/runs?client_id=${id}`);
  const services = useApi<ServiceInfo[]>("/services");
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get("tab"))?.id ?? "overview";
  const [dialog, setDialog] = useState<"pause" | "resume" | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  if (!client.data || !ov.data || !services.data) return <Loading error={client.error} />;
  const c = client.data, o = ov.data;
  const svc = services.data.filter((s) => c.services.includes(s.code));

  async function submit() {
    setErr(null);
    try {
      await post(`/clients/${c.id}/${dialog}`, { reason });
      toast.show(dialog === "pause" ? "Paused. Sends, posts, publishes and spend are held." : "Resumed. Held steps are released.");
      setDialog(null);
      setReason("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <>
      <PageHead title={c.name} sub={<>{c.model} · {c.industry} · markets {c.markets.join(", ")} ({c.market_groups.join(", ")}) · account lead {c.account_lead} · billing {c.currency}</>}
        actions={c.paused
          ? <button className="btn btn-primary" onClick={() => setDialog("resume")}>Resume client</button>
          : <button className="btn btn-bad" onClick={() => setDialog("pause")}>Pause everything</button>} />
      {c.paused && <div className="notice notice-bad">Paused: {c.paused_reason}. Steps that send, publish, spend, sign or pay are held in every service. Removals still run (G10).</div>}
      <div className="tabs" role="tablist" aria-label="Client sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? " on" : ""}`}
            onClick={() => setParams(t.id === "overview" ? {} : { tab: t.id }, { replace: true })}>{t.label}</button>
        ))}
      </div>
      {tab === "strategy" && <ClientStrategy client={c} />}
      {tab === "connections" && <ClientConnections client={c} />}
      {tab === "overview" && <>
      <div className="stats">
        <Stat label="Spend (28 days)" value={gbp(o.totals.spend)} delta={pctChange(o.totals.spend, o.previous.spend)} />
        <Stat label="Revenue" value={gbp(o.totals.revenue)} delta={pctChange(o.totals.revenue, o.previous.revenue)} />
        <Stat label="Leads" value={num(o.totals.leads)} delta={pctChange(o.totals.leads, o.previous.leads)} />
        <Stat label="Open approvals" value={o.approvals.open} hint={`${o.approvals.overdue} overdue`} />
      </div>
      <div className="grid-2 wide-left">
        <Card title="Revenue and spend">
          <LineChart rows={o.daily} format={gbp} series={[{ key: "revenue", label: "Revenue", color: "var(--c1)" }, { key: "spend", label: "Spend", color: "var(--c2)" }]} />
        </Card>
        <Card title={`Services (${svc.length})`}>
          <ul className="list">
            {svc.map((s) => {
              const h = o.services.find((x) => x.code === s.code)!;
              return (
                <li key={s.code} className="row between">
                  <Link to={`/services/${s.code}`}><span className={`dot dot-${h.health}`} /> {s.name}</Link>
                  <span className="small muted">{h.runs_active} active · {h.approvals_open} to approve</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
      <Card title="Runs" className="flush">{runs.data ? <RunsTable runs={runs.data} clients={[c]} /> : <Loading />}</Card>
      </>}
      {dialog && (
        <Modal title={dialog === "pause" ? `Pause ${c.name}` : `Resume ${c.name}`} onClose={() => setDialog(null)}>
          <p>{dialog === "pause"
            ? "This runs the engine action client.pause_scheduled. Every scheduled send, post, pitch and ad set for this client stops in all services. Use it for a crisis."
            : "Resuming needs an escalation decision. Write down who decided and why. Only an account lead or a Pith admin can resume."}</p>
          <label className="field">
            <span>{dialog === "pause" ? "Reason" : "Escalation decision"}</span>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {err && <div className="notice notice-bad">{err}</div>}
          <div className="row end">
            <button className="btn" onClick={() => setDialog(null)}>Cancel</button>
            <button className={`btn ${dialog === "pause" ? "btn-bad" : "btn-primary"}`} disabled={!reason.trim()} onClick={submit}>
              {dialog === "pause" ? "Pause everything" : "Resume"}
            </button>
          </div>
        </Modal>
      )}
      {toast.node}
    </>
  );
}

export { label };
