import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { ApprovalItem, Client, ServiceInfo } from "../../server/types";
import { post, useApi } from "../api";
import { DecidePanel } from "../components/Decide";
import { BrandScore, Card, Compliance, Loading, PageHead, Pill, useToast } from "../components/ui";
import { ago, dueIn, label } from "../format";

type Row = ApprovalItem & { overdue: boolean };

export function ApprovalsPage() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const filter = sp.get("filter") ?? "mine";
  const [service, setService] = useState("");
  const [client, setClient] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const nav = useNavigate();
  const toast = useToast();
  const q = new URLSearchParams({ status: "open" });
  if (filter === "mine") q.set("assignee", "me");
  if (filter === "overdue") q.set("overdue", "true");
  if (service) q.set("service", service);
  if (client) q.set("client_id", client);
  const list = useApi<Row[]>(`/approvals?${q}`);
  const clients = useApi<Client[]>("/clients");
  const services = useApi<ServiceInfo[]>("/services");
  const selected = useApi<Row>(id ? `/approvals/${id}` : null);
  const cname = useMemo(() => Object.fromEntries((clients.data ?? []).map((c) => [c.id, c.name])), [clients.data]);
  const sname = useMemo(() => Object.fromEntries((services.data ?? []).map((s) => [s.code, s.name])), [services.data]);
  let rows = list.data ?? [];
  if (filter === "urgent") rows = rows.filter((r) => r.priority === "urgent");
  const pickedKinds = new Set(rows.filter((r) => picked.includes(r.id)).map((r) => r.kind));

  async function bulk() {
    try {
      const out = await post<Array<{ ok: boolean; error?: string }>>("/approvals/bulk", { ids: picked });
      const ok = out.filter((o) => o.ok).length;
      toast.show(`${ok} approved${out.length - ok ? `, ${out.length - ok} not (see each item)` : ""}`);
      setPicked([]);
    } catch (e) {
      toast.show((e as Error).message, "bad");
    }
  }

  return (
    <>
      <PageHead title="Approval inbox" sub="Every gate in every pipeline. Only a person can decide; the run waits." />
      <div className="toolbar">
        <div className="tabs" role="tablist">
          {[["mine", "For my roles"], ["all", "All open"], ["overdue", "Overdue"], ["urgent", "Urgent"]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={`tab${filter === k ? " on" : ""}`}
              onClick={() => { setSp(k === "mine" ? {} : { filter: k }); setPicked([]); }}>{l}</button>
          ))}
        </div>
        <select value={service} onChange={(e) => setService(e.target.value)} aria-label="Service">
          <option value="">All services</option>
          {services.data?.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <select value={client} onChange={(e) => setClient(e.target.value)} aria-label="Client">
          <option value="">All clients</option>
          {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {picked.length > 0 && (
          <button className="btn btn-good" disabled={pickedKinds.size > 1} onClick={bulk}
            title={pickedKinds.size > 1 ? "Bulk approval works on one kind only" : ""}>
            Approve {picked.length} selected{pickedKinds.size > 1 ? " (mixed kinds)" : ""}
          </button>
        )}
      </div>
      <div className={`split${id ? " has-detail" : ""}`}>
        <Card className="flush">
          {!list.data ? <Loading error={list.error} /> : rows.length === 0 ? <p className="pad muted">Nothing here. Good work.</p> : (
            <table className="table">
              <thead>
                <tr><th aria-label="Select" /><th>Item</th><th>Kind</th><th className="col-wide">Client</th><th className="col-wide">Checks</th><th>SLA</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`${r.id === id ? "sel" : ""} clickable`} onClick={() => nav(`/approvals/${r.id}${sp.toString() ? `?${sp}` : ""}`)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select ${r.title}`} checked={picked.includes(r.id)}
                        onChange={(e) => setPicked(e.target.checked ? [...picked, r.id] : picked.filter((x) => x !== r.id))} />
                    </td>
                    <td>
                      <b>{r.title}</b>
                      <div className="small muted">{cname[r.client_id]} · {sname[r.service] ?? r.service} · needs {r.required_roles.join(" or ")}{r.required_count > 1 ? ` (${r.required_count} people)` : ""}</div>
                    </td>
                    <td>{r.priority === "urgent" ? <Pill tone="bad">{label(r.kind)}</Pill> : <Pill>{label(r.kind)}</Pill>}</td>
                    <td className="small col-wide">{cname[r.client_id]}</td>
                    <td className="col-wide"><div className="row wrap gap-s"><BrandScore score={r.brand_score} />{r.compliance && <Compliance c={r.compliance} />}</div></td>
                    <td className={r.overdue ? "bad-text small" : "small"}>{dueIn(r.sla_due_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        {id && (
          <Card title={selected.data?.title ?? "Item"} action={<Link to={`/approvals${sp.toString() ? `?${sp}` : ""}`} className="small">Close</Link>}>
            {!selected.data ? <Loading error={selected.error} /> : <ApprovalDetail item={selected.data} client={cname[selected.data.client_id]} service={sname[selected.data.service] ?? selected.data.service} onDone={(m, t) => toast.show(m, t)} />}
          </Card>
        )}
      </div>
      {toast.node}
    </>
  );
}

function ApprovalDetail({ item, client, service, onDone }: { item: Row; client: string; service: string; onDone: (m: string, t?: string) => void }) {
  return (
    <div className="stack">
      <p>{item.summary}</p>
      <dl className="kv">
        <dt>Client</dt><dd>{client}</dd>
        <dt>Service</dt><dd><Link to={`/services/${item.service}`}>{service}</Link></dd>
        <dt>Run</dt><dd>{item.run_id ? <Link to={`/runs/${item.run_id}`}>Open run · step {item.step_id}</Link> : "None"}</dd>
        <dt>Reviewers</dt><dd>{item.required_roles.join(" or ")}{item.required_count > 1 ? `, ${item.required_count} people` : ""}</dd>
        <dt>Opened</dt><dd>{ago(item.created_at)}</dd>
        <dt>SLA</dt><dd className={item.overdue ? "bad-text" : ""}>{dueIn(item.sla_due_at)}</dd>
        <dt>Checks</dt><dd className="row wrap gap-s"><BrandScore score={item.brand_score} /><Compliance c={item.compliance} /></dd>
      </dl>
      {Object.keys(item.payload).length > 0 && (
        <div>
          <h3>Details</h3>
          <dl className="kv">
            {Object.entries(item.payload).filter(([k]) => !k.endsWith("_id")).map(([k, v]) => (
              <span key={k} className="contents"><dt>{label(k)}</dt><dd>{Array.isArray(v) ? v.join(", ") : k === "change_pct" ? `${v}%` : String(v)}</dd></span>
            ))}
          </dl>
          {typeof item.payload.video_project_id === "string" && <p><Link to={`/video/${item.payload.video_project_id}`}>Open the video project and watch the variants</Link></p>}
          {typeof item.payload.strategy_client_id === "string" && <p><Link to={`/clients/${item.payload.strategy_client_id}?tab=strategy`}>Open the full strategy</Link></p>}
        </div>
      )}
      {item.decisions.length > 0 && (
        <div>
          <h3>Decisions</h3>
          <ul className="list">
            {item.decisions.map((d, i) => <li key={i}><b>{label(d.decision)}</b> as {d.role} · {ago(d.at)}{d.comment ? ` · “${d.comment}”` : ""}</li>)}
          </ul>
        </div>
      )}
      <DecidePanel item={item} onDone={onDone} />
    </div>
  );
}
