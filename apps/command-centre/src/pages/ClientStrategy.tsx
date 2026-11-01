import { useState } from "react";
import { Link } from "react-router-dom";
import type { ClientBrain, Strategy } from "../../server/strategy";
import type { Client } from "../../server/types";
import { post, send, useApi } from "../api";
import { Icon } from "../components/icons";
import { Card, Loading, Modal, Pill, useToast } from "../components/ui";
import { kpiValue, label, num } from "../format";

const STATUS: Record<Strategy["status"], { tone: string; text: string }> = {
  draft: { tone: "muted", text: "Draft" },
  in_review: { tone: "warn", text: "Waiting for approval" },
  approved: { tone: "good", text: "Approved" },
  changes_requested: { tone: "warn", text: "Changes requested" },
  rejected: { tone: "bad", text: "Rejected" },
};

export function ClientStrategy({ client }: { client: Client }) {
  const s = useApi<Strategy>(`/clients/${client.id}/strategy`);
  const brain = useApi<ClientBrain>(`/clients/${client.id}/brain`);
  const integ = useApi<{ claude: boolean }>("/integrations");
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  if (!s.data || !brain.data) return <Loading error={s.error ?? brain.error} />;
  const st = s.data, b = brain.data;
  const money = (n: number) => `${st.budget.currency} ${num(n)}`;
  const locked = st.status === "in_review";

  async function act(path: string, done: string) {
    setBusy(path);
    try {
      await post(`/clients/${client.id}/strategy/${path}`);
      toast.show(done);
    } catch (e) {
      toast.show((e as Error).message, "bad");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <Card className="hero-card">
        <div className="row between wrap">
          <div className="row gap-s wrap">
            <Pill tone={STATUS[st.status].tone}>{STATUS[st.status].text}</Pill>
            <Pill>Version {st.version}</Pill>
            <Pill tone="info">{st.source === "playbooks" ? "From Pith playbooks" : "Playbooks + Claude"}</Pill>
          </div>
          <div className="row wrap">
            <button className="btn btn-sm" onClick={() => setEdit(true)} disabled={locked}>Edit client brain</button>
            <button className="btn btn-sm" disabled={locked || busy !== null} onClick={() => act("regenerate", "New version made from the brain and playbooks.")}><Icon name="refresh" size={14} /> New version</button>
            <button className="btn btn-sm" disabled={locked || busy !== null} title={integ.data?.claude ? "" : "Needs ANTHROPIC_API_KEY on the server"} onClick={() => act("improve", "Claude added notes to the plan.")}>
              <Icon name="sparkles" size={14} /> {busy === "improve" ? "Claude is thinking…" : "Improve with Claude"}
            </button>
            <button className="btn btn-sm btn-primary" disabled={locked || st.status === "approved" || busy !== null} onClick={() => act("submit", "Sent for approval: account lead, strategist or client approver (2 people).")}>Send for approval</button>
          </div>
        </div>
        <p className="lead">{st.summary}</p>
        {st.approval_id && <Link to={`/approvals/${st.approval_id}?filter=all`} className="small">Open the approval</Link>}
        {!integ.data?.claude && <p className="small muted">Improve with Claude needs ANTHROPIC_API_KEY on the server. The playbook plan works without it.</p>}
      </Card>

      {st.claude_notes && (
        <Card title={<span className="row gap-s"><Icon name="sparkles" /> Claude's notes</span>}>
          <p>{st.claude_notes.summary}</p>
          <div className="grid-2">
            <div><h3>Quick wins (first 14 days)</h3><ul className="facts">{st.claude_notes.quick_wins.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>More risks to watch</h3><ul className="facts">{st.claude_notes.risks.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
        </Card>
      )}

      <div className="grid-2">
        <Card title="Who and what">
          <dl className="kv">
            <dt>Positioning</dt><dd>{b.positioning || <span className="muted">Not set</span>}</dd>
            <dt>Audience</dt><dd>{b.audience || <span className="muted">Not set</span>}</dd>
            <dt>Tone</dt><dd>{b.tone || <span className="muted">Not set</span>}</dd>
            <dt>Offers</dt><dd>{b.offers.join(", ") || "None"}</dd>
            <dt>Competitors</dt><dd>{b.competitors.join(", ") || "None"}</dd>
            <dt>Budget</dt><dd>{money(st.budget.monthly)} a month</dd>
          </dl>
        </Card>
        <Card title="Objectives (90 days)">
          <table className="table compact">
            <thead><tr><th>Goal</th><th>KPI</th><th className="num">Last 28 days</th><th className="num">Target</th></tr></thead>
            <tbody>{st.objectives.map((o) => (
              <tr key={o.goal}><td>{o.goal}</td><td className="small">{label(o.kpi)}</td><td className="num">{kpiValue(o.kpi, o.baseline_28d)}</td><td className="num"><b>{kpiValue(o.kpi, o.target_28d)}</b></td></tr>
            ))}</tbody>
          </table>
        </Card>
      </div>

      <Card title={`Plays by service (${st.plays.length})`} className="flush">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Service</th><th>Why for this client</th><th>Pipelines to run</th><th className="num">Budget a month</th></tr></thead>
            <tbody>{st.plays.map((p) => (
              <tr key={p.service}>
                <td><Link to={`/services/${p.service}`}><b>{p.service_name}</b></Link><div className="small muted">{p.cadence}</div></td>
                <td>{p.why}{st.claude_notes?.play_notes[p.service] && <div className="small claude-note"><Icon name="sparkles" size={12} /> {st.claude_notes.play_notes[p.service]}</div>}</td>
                <td><div className="row wrap gap-s">{p.pipelines.map((w) => <span key={w.id} className="chip mono" title={w.description}>{w.id}</span>)}</div></td>
                <td className="num"><b>{money(p.budget)}</b><div className="bar-mini"><span style={{ width: `${Math.min(100, p.budget_pct * 3)}%` }} /></div><span className="small muted">{p.budget_pct}%</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Markets and rules">
          <ol className="market-list">
            {st.markets.map((m) => (
              <li key={m.country}>
                <div className="row between"><b>{m.country} <span className="muted small">{m.group}</span></b><Pill tone={m.phase === 1 ? "good" : "info"}>Phase {m.phase}</Pill></div>
                <div className="small">{m.laws.join(" · ")}</div>
                {m.disclosure_labels.length > 0 && <div className="small muted">Ad labels: {m.disclosure_labels.join(", ")}</div>}
                {m.key_rules.length > 0 && <ul className="small rules">{m.key_rules.map((r) => <li key={r.id}><span className="mono">{r.id}</span> {r.message}</li>)}</ul>}
              </li>
            ))}
          </ol>
        </Card>
        <Card title="90-day roadmap">
          <ol className="roadmap">
            {st.roadmap.map((r) => (
              <li key={r.phase}>
                <div className="roadmap-phase">{r.phase}</div>
                <b>{r.focus}</b>
                <ul className="facts small">{r.items.map((x) => <li key={x}>{x}</li>)}</ul>
              </li>
            ))}
          </ol>
          <h3>Risks</h3>
          <ul className="facts small">{st.risks.map((x) => <li key={x}>{x}</li>)}</ul>
        </Card>
      </div>

      {edit && <BrainEditor client={client} brain={b} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); toast.show("Brain saved. The plan is rebuilt from it."); }} />}
      {toast.node}
    </div>
  );
}

function BrainEditor({ client, brain, onClose, onSaved }: { client: Client; brain: ClientBrain; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    positioning: brain.positioning, audience: brain.audience, tone: brain.tone, notes: brain.notes,
    goals: brain.goals.join("\n"), offers: brain.offers.join("\n"), competitors: brain.competitors.join("\n"), monthly_budget: String(brain.monthly_budget),
  });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={`Client brain: ${client.name}`} onClose={onClose}>
      <form onSubmit={async (e) => {
        e.preventDefault();
        try {
          await send("PUT", `/clients/${client.id}/brain`, f);
          onSaved();
        } catch (x) {
          setErr((x as Error).message);
        }
      }}>
        <label className="field"><span>Positioning</span><textarea rows={2} value={f.positioning} onChange={set("positioning")} /></label>
        <label className="field"><span>Audience</span><textarea rows={2} value={f.audience} onChange={set("audience")} /></label>
        <label className="field"><span>Goals (1 a line, the first 3 become objectives)</span><textarea rows={3} value={f.goals} onChange={set("goals")} /></label>
        <div className="grid-2">
          <label className="field"><span>Monthly budget ({client.currency})</span><input type="text" inputMode="numeric" value={f.monthly_budget} onChange={set("monthly_budget")} /></label>
          <label className="field"><span>Tone</span><input type="text" value={f.tone} onChange={set("tone")} /></label>
        </div>
        <div className="grid-2">
          <label className="field"><span>Offers (1 a line)</span><textarea rows={2} value={f.offers} onChange={set("offers")} /></label>
          <label className="field"><span>Competitors (1 a line)</span><textarea rows={2} value={f.competitors} onChange={set("competitors")} /></label>
        </div>
        <label className="field"><span>Notes and constraints</span><textarea rows={2} value={f.notes} onChange={set("notes")} /></label>
        {err && <div className="notice notice-bad">{err}</div>}
        <div className="row end"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary">Save and rebuild plan</button></div>
      </form>
    </Modal>
  );
}
