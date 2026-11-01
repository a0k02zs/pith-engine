import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ApprovalItem, AuditEntry, Client, Run, ServiceInfo, WorkflowDef } from "../../server/types";
import { post, useApi } from "../api";
import { Card, Loading, PageHead, Pill, RunStatusPill, StepStatusPill, useToast } from "../components/ui";
import { ago, label } from "../format";

export function RunsTable({ runs, clients }: { runs: Run[]; clients: Client[] }) {
  const cname = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  if (runs.length === 0) return <p className="pad muted">No runs.</p>;
  return (
    <table className="table">
      <thead><tr><th>Workflow</th><th>Client</th><th>Markets</th><th>Status</th><th>Progress</th><th>Updated</th></tr></thead>
      <tbody>
        {runs.map((r) => {
          const done = r.steps.filter((s) => s.status === "succeeded" || s.status === "skipped").length;
          const cur = r.steps.find((s) => ["waiting", "held", "failed"].includes(s.status));
          return (
            <tr key={r.id}>
              <td><Link to={`/runs/${r.id}`}><b>{r.workflow_id}</b></Link><div className="small muted">{cur ? `${label(cur.status)} at ${cur.id}` : r.triggered_by}</div></td>
              <td className="small">{cname[r.client_id]}</td>
              <td className="small">{r.markets.join(", ")}</td>
              <td><RunStatusPill status={r.status} /></td>
              <td><div className="progress" title={`${done} of ${r.steps.length} steps`}><span style={{ width: `${(done / r.steps.length) * 100}%` }} /></div><span className="small muted">{done}/{r.steps.length}</span></td>
              <td className="small">{ago(r.updated_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function RunsPage() {
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [client, setClient] = useState("");
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (service) q.set("service", service);
  if (client) q.set("client_id", client);
  const runs = useApi<Run[]>(`/runs?${q}`);
  const clients = useApi<Client[]>("/clients");
  const services = useApi<ServiceInfo[]>("/services");
  return (
    <>
      <PageHead title="Runs" sub="Every workflow run across clients and services." />
      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {["running", "waiting_approval", "waiting_event", "succeeded", "failed", "cancelled"].map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <select value={service} onChange={(e) => setService(e.target.value)} aria-label="Service">
          <option value="">All services</option>
          {services.data?.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <select value={client} onChange={(e) => setClient(e.target.value)} aria-label="Client">
          <option value="">All clients</option>
          {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="muted small">{runs.data?.length ?? 0} runs</span>
      </div>
      <Card className="flush">{runs.data && clients.data ? <RunsTable runs={runs.data} clients={clients.data} /> : <Loading error={runs.error} />}</Card>
    </>
  );
}

type RunDetail = Run & { workflow: WorkflowDef; approvals: ApprovalItem[]; actions: AuditEntry[] };

const TYPE_ICON: Record<string, string> = { agent: "✦", tool: "⚒", check: "☑", gate: "⛩", wait: "⏳", branch: "⑂", emit: "↗", subflow: "⧉", task: "☐" };

export function RunDetailPage() {
  const { id } = useParams();
  const { data, error } = useApi<RunDetail>(`/runs/${id}`);
  const clients = useApi<Client[]>("/clients");
  const services = useApi<ServiceInfo[]>("/services");
  const toast = useToast();
  const client = useMemo(() => clients.data?.find((c) => c.id === data?.client_id), [clients.data, data]);
  if (!data) return <Loading error={error} />;
  const waiting = data.steps.find((s) => s.status === "waiting" || s.status === "held");
  const open = data.approvals.find((a) => a.status === "open");
  const finished = ["succeeded", "failed", "cancelled"].includes(data.status);

  async function act(path: string, msg: string) {
    try {
      await post(`/runs/${data!.id}/${path}`);
      toast.show(msg);
    } catch (e) {
      toast.show((e as Error).message, "bad");
    }
  }

  return (
    <>
      <PageHead
        title={data.workflow_id}
        sub={<>{client?.name} · {data.markets.join(", ")} · started {ago(data.started_at)} by {data.triggered_by} · model cost ${data.cost_usd.toFixed(2)}</>}
        actions={<>
          <RunStatusPill status={data.status} />
          {open && <Link className="btn btn-primary" to={`/approvals/${open.id}?filter=all`}>Decide {label(open.kind)}</Link>}
          {waiting && waiting.type !== "gate" && (
            <button className="btn btn-primary" onClick={() => act("continue", "Run continued")}>
              {waiting.status === "held" ? "Release held step" : waiting.type === "task" ? "Mark task done" : "Send the event"}
            </button>
          )}
          {!finished && <button className="btn btn-bad" onClick={() => { if (confirm("Cancel this run? Open approvals close too.")) act("cancel", "Run cancelled"); }}>Cancel run</button>}
        </>}
      />
      <div className="grid-2 wide-left">
        <Card title={`Steps (${data.steps.length})`}>
          <p className="muted small">{data.workflow.description}</p>
          <ol className="timeline">
            {data.steps.map((s, i) => {
              const def = data.workflow.steps[i];
              return (
                <li key={s.id} className={`tl tl-${s.status}`}>
                  <span className="tl-icon" title={s.type} aria-hidden>{TYPE_ICON[s.type] ?? "•"}</span>
                  <div className="tl-body">
                    <div className="row between">
                      <b>{s.name ?? label(s.id)}</b>
                      <StepStatusPill status={s.status} />
                    </div>
                    <div className="small muted">
                      {s.type}
                      {def.tool && <> · {def.tool.name}.{def.tool.action} · risk <Pill tone={["send", "spend", "sign", "pay", "write_external"].includes(def.tool.risk) ? "warn" : "muted"}>{def.tool.risk}</Pill></>}
                      {def.gate && <> · {def.gate.approval_kind} by {def.gate.required_roles.join(" or ")} · SLA {def.gate.sla_hours} h{def.gate.skip_if ? " · skippable" : ""}</>}
                      {def.check && <> · {def.check.kinds.join(", ")}</>}
                    </div>
                    {s.note && <div className="small">{s.note}</div>}
                    {s.approval_id && s.status === "waiting" && <Link className="small" to={`/approvals/${s.approval_id}?filter=all`}>Open the approval →</Link>}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
        <div className="stack">
          <Card title="Run">
            <dl className="kv">
              <dt>Run id</dt><dd className="mono small">{data.id}</dd>
              <dt>Service</dt><dd><Link to={`/services/${data.service}`}>{services.data?.find((x) => x.code === data.service)?.name ?? data.service}</Link></dd>
              <dt>Client</dt><dd>{client ? <Link to={`/clients/${client.id}`}>{client.name}</Link> : "…"}</dd>
              <dt>Definition</dt><dd className="mono small">{data.workflow.file} v{data.version}</dd>
              <dt>Trigger</dt><dd className="small">{Object.entries(data.workflow.trigger).map(([k, v]) => `${k}: ${typeof v === "string" ? v : "yes"}`).join(" · ")}</dd>
            </dl>
          </Card>
          <Card title="Approvals in this run">
            {data.approvals.length === 0 ? <p className="muted small">None yet.</p> : (
              <ul className="list">
                {data.approvals.map((a) => <li key={a.id}><Link to={`/approvals/${a.id}?filter=all`}>{a.title}</Link> <Pill tone={a.status === "approved" ? "good" : a.status === "open" ? "warn" : "muted"}>{label(a.status)}</Pill></li>)}
              </ul>
            )}
          </Card>
          <Card title="Action log">
            {data.actions.length === 0 ? <p className="muted small">No actions by people in this session.</p> : (
              <ul className="list small">{data.actions.map((a) => <li key={a.id}>{ago(a.at)} · <b>{a.actor}</b> {a.action} {a.detail}</li>)}</ul>
            )}
          </Card>
        </div>
      </div>
      {toast.node}
    </>
  );
}
