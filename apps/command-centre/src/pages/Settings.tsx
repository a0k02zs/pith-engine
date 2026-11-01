import type { AuditEntry, User } from "../../server/types";
import { currentUserId, setCurrentUserId, useApi } from "../api";
import { Card, Loading, PageHead, Pill } from "../components/ui";
import { ago, label } from "../format";

interface Meta {
  contract_version: string;
  market_groups: Record<string, string[]>;
  market_launch_order: string[];
  roles: string[];
  tool_risk_meaning: Record<string, string>;
  users: User[];
  workflow_count: number;
}

export function SettingsPage() {
  const meta = useApi<Meta>("/meta");
  const audit = useApi<AuditEntry[]>("/audit");
  if (!meta.data) return <Loading error={meta.error} />;
  const m = meta.data;
  return (
    <>
      <PageHead title="Settings" sub="Who you act as, the engine contract this app reads, and the audit log." />
      <div className="grid-2">
        <Card title="Act as">
          <p className="muted small">Test users. In production, Google sign-in (Cloud Run with IAP) sets the user and the engine holds the roles.</p>
          <ul className="list">
            {m.users.map((u) => (
              <li key={u.id}>
                <label className="check">
                  <input type="radio" name="user" checked={currentUserId() === u.id} onChange={() => setCurrentUserId(u.id)} />
                  <b>{u.name}</b>
                </label>
                <div className="small muted">{u.note}</div>
                <div className="row wrap gap-s">{u.roles.map((r) => <Pill key={r}>{r}</Pill>)}</div>
              </li>
            ))}
          </ul>
        </Card>
        <div className="stack">
          <Card title="Engine contract">
            <dl className="kv">
              <dt>Version</dt><dd>{m.contract_version}</dd>
              <dt>Pipelines loaded</dt><dd>{m.workflow_count} from services/*/workflows</dd>
              <dt>Market launch order</dt><dd>{m.market_launch_order.join(" → ")}</dd>
              {Object.entries(m.market_groups).map(([g, cs]) => <span key={g} className="contents"><dt>{g}</dt><dd className="small">{cs.join(", ")}</dd></span>)}
            </dl>
          </Card>
          <Card title="Tool risk levels">
            <dl className="kv">{Object.entries(m.tool_risk_meaning).map(([k, v]) => <span key={k} className="contents"><dt className="mono">{k}</dt><dd className="small">{v}</dd></span>)}</dl>
          </Card>
        </div>
      </div>
      <Card title="Audit log (this session)">
        {!audit.data ? <Loading /> : audit.data.length === 0 ? <p className="muted">No actions yet.</p> : (
          <table className="table">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>{audit.data.map((a) => <tr key={a.id}><td className="small">{ago(a.at)}</td><td>{a.actor}</td><td className="mono small">{a.action}</td><td className="small">{a.detail}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
      <p className="muted small">Roles in the contract: {m.roles.map(label).join(", ")}.</p>
    </>
  );
}
