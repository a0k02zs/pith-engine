import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Client } from "../../server/types";
import type { EngineStatus, Platform, VideoProject } from "../../server/video";
import { post, send, useApi } from "../api";
import { Icon } from "../components/icons";
import { Card, Loading, PageHead, Pill, useToast } from "../components/ui";
import { ago } from "../format";

const PLATFORMS: Array<{ id: Platform; name: string }> = [
  { id: "meta_reels", name: "Instagram and Facebook Reels" },
  { id: "meta_feed", name: "Facebook and Instagram feed" },
  { id: "tiktok", name: "TikTok" },
  { id: "youtube_shorts", name: "YouTube Shorts" },
];

const STATUS: Record<VideoProject["status"], { tone: string; text: string }> = {
  brief: { tone: "muted", text: "Brief" },
  storyboard: { tone: "info", text: "Storyboard" },
  generating: { tone: "info", text: "Generating" },
  review: { tone: "warn", text: "Pick a variant" },
  in_approval: { tone: "warn", text: "Waiting for approval" },
  approved: { tone: "good", text: "Approved" },
  changes_requested: { tone: "warn", text: "Changes requested" },
  rejected: { tone: "bad", text: "Rejected" },
  exported: { tone: "good", text: "Exported" },
};

function Engines({ engines }: { engines: EngineStatus[] }) {
  return (
    <div className="engine-row">
      {engines.map((e) => (
        <div key={e.id} className={`engine ${e.live ? "live" : ""}`}>
          <span className={`dot ${e.live ? "dot-good" : "dot-watch"}`} />
          <b>{e.name}</b>
          <span className="small muted">{e.note}</span>
        </div>
      ))}
    </div>
  );
}

export function VideoStudioPage() {
  const projects = useApi<VideoProject[]>("/video/projects");
  const clients = useApi<Client[]>("/clients");
  const integ = useApi<{ engines: EngineStatus[] }>("/integrations");
  const [params, setParams] = useSearchParams();
  const open = params.get("new") === "1";
  if (!projects.data || !clients.data || !integ.data) return <Loading error={projects.error} />;
  const cname = Object.fromEntries(clients.data.map((c) => [c.id, c.name]));
  const eligible = clients.data.filter((c) => c.services.includes("video"));
  return (
    <>
      <PageHead title="Video studio" sub={<>AI ads made with Runway and Higgsfield. Brief, script and storyboard, 3 variants, client approval, then export with AI labels. <Pill tone="info">Beta</Pill></>}
        actions={<button className="btn btn-primary" onClick={() => setParams({ new: "1" })}><Icon name="plus" size={16} /> New AI ad</button>} />
      <Card title="Engines">
        <Engines engines={integ.data.engines} />
        <p className="small muted">API keys stay on the server and never reach the browser. A live job also needs a key frame image URL, because both engines animate an image. Without them the studio simulates the jobs so the team can try the flow.</p>
      </Card>
      {open && <BriefForm clients={eligible} onClose={() => setParams({})} />}
      <Card title={`Projects (${projects.data.length})`} className="flush">
        {projects.data.length === 0 ? (
          <div className="empty">
            <Icon name="video" size={28} />
            <p>No AI ads yet. Start with a brief: what it sells, who it is for, and where it runs.</p>
            <button className="btn btn-primary" onClick={() => setParams({ new: "1" })}>New AI ad</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Ad</th><th>Client</th><th>Status</th><th>Updated</th></tr></thead>
              <tbody>{projects.data.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/video/${p.id}`}><b>{p.brief.title}</b></Link><div className="small muted">{p.brief.duration_s}s · {p.brief.aspect} · {p.brief.platforms.length} platforms</div></td>
                  <td>{cname[p.client_id]}</td>
                  <td><Pill tone={STATUS[p.status].tone}>{STATUS[p.status].text}</Pill></td>
                  <td className="small muted">{ago(p.updated_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function BriefForm({ clients, onClose }: { clients: Client[]; onClose: () => void }) {
  const nav = useNavigate();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const client = clients.find((c) => c.id === clientId);
  const [f, setF] = useState({ title: "", product: "", audience: "", objective: "conversions", duration_s: 15, aspect: "9:16", offer: "", cta: "Shop now", style: "", key_frame_url: "", likeness_consent_ref: "" });
  const [platforms, setPlatforms] = useState<Platform[]>(["meta_reels", "tiktok"]);
  const [markets, setMarkets] = useState<string[]>(client?.markets ?? []);
  const [likeness, setLikeness] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setMarkets(client?.markets ?? []), [clientId]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  if (!clients.length) return <Card><p>No client buys video production yet. Add the service to a client first.</p></Card>;
  return (
    <Card title="New AI ad: brief" action={<button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>}>
      <form className="brief-form" onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        try {
          const p = await post<VideoProject>("/video/projects", { ...f, client_id: clientId, platforms, markets, uses_real_likeness: likeness, duration_s: Number(f.duration_s) });
          nav(`/video/${p.id}`);
        } catch (x) {
          setErr((x as Error).message);
        }
      }}>
        <div className="grid-2">
          <label className="field"><span>Client</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
          <label className="field"><span>Ad name (optional)</span><input type="text" value={f.title} onChange={set("title")} placeholder="Spring starter kit" /></label>
        </div>
        <div className="grid-2">
          <label className="field"><span>What it sells</span><input type="text" value={f.product} onChange={set("product")} placeholder="Calm Barrier Serum" required /></label>
          <label className="field"><span>Who it is for</span><input type="text" value={f.audience} onChange={set("audience")} placeholder="Women 22-40 with sensitive skin" required /></label>
        </div>
        <div className="grid-3">
          <label className="field"><span>Goal</span>
            <select value={f.objective} onChange={set("objective")}><option value="awareness">Awareness</option><option value="consideration">Consideration</option><option value="conversions">Conversions</option></select>
          </label>
          <label className="field"><span>Length</span>
            <select value={f.duration_s} onChange={set("duration_s")}><option value={15}>15 seconds (4 shots)</option><option value={30}>30 seconds (6 shots)</option></select>
          </label>
          <label className="field"><span>Shape</span>
            <select value={f.aspect} onChange={set("aspect")}><option value="9:16">9:16 vertical</option><option value="1:1">1:1 square</option><option value="16:9">16:9 wide</option></select>
          </label>
        </div>
        <fieldset className="field"><legend>Platforms</legend>
          <div className="row wrap">{PLATFORMS.map((p) => (
            <label key={p.id} className="check chip-check"><input type="checkbox" checked={platforms.includes(p.id)} onChange={() => setPlatforms(toggle(platforms, p.id))} /> {p.name}</label>
          ))}</div>
        </fieldset>
        <fieldset className="field"><legend>Markets</legend>
          <div className="row wrap">{(client?.markets ?? []).map((m) => (
            <label key={m} className="check chip-check"><input type="checkbox" checked={markets.includes(m)} onChange={() => setMarkets(toggle(markets, m))} /> {m}</label>
          ))}</div>
        </fieldset>
        <div className="grid-3">
          <label className="field"><span>Offer</span><input type="text" value={f.offer} onChange={set("offer")} placeholder="Starter kit" /></label>
          <label className="field"><span>Call to action</span><input type="text" value={f.cta} onChange={set("cta")} /></label>
          <label className="field"><span>Look and feel</span><input type="text" value={f.style} onChange={set("style")} placeholder="bright, natural light, premium" /></label>
        </div>
        <label className="field"><span>Key frame image URL (needed for live generation)</span>
          <input type="text" inputMode="url" value={f.key_frame_url} onChange={set("key_frame_url")} placeholder="https://… product photo the client owns" />
          <small className="muted">Use an image the client owns or has rights to. Runway and Higgsfield animate it.</small>
        </label>
        <label className="check"><input type="checkbox" checked={likeness} onChange={(e) => setLikeness(e.target.checked)} /> The ad uses a real person's face or voice (avatar, voice clone, or a real creator)</label>
        {likeness && <label className="field"><span>Written consent reference</span><input type="text" value={f.likeness_consent_ref} onChange={set("likeness_consent_ref")} placeholder="Release form ID or contract link" /><small className="muted">Required before generation (rule G8).</small></label>}
        {err && <div className="notice notice-bad">{err}</div>}
        <div className="row end"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary">Create brief</button></div>
      </form>
    </Card>
  );
}

const STEPS = ["Brief", "Storyboard", "Variants", "Approval", "Export"];
function stepOf(s: VideoProject["status"]) {
  return { brief: 0, storyboard: 1, generating: 2, review: 2, changes_requested: 2, in_approval: 3, rejected: 3, approved: 4, exported: 5 }[s];
}

export function VideoProjectPage() {
  const { id } = useParams();
  const p = useApi<VideoProject>(`/video/projects/${id}`);
  const clients = useApi<Client[]>("/clients");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const status = p.data?.status;
  useEffect(() => {
    if (status !== "generating") return;
    const t = window.setTimeout(() => void post(`/video/projects/${id}/refresh`).catch(() => undefined), 1500);
    return () => window.clearTimeout(t);
  }, [status, id, p.data?.updated_at]);
  if (!p.data || !clients.data) return <Loading error={p.error} />;
  const v = p.data;
  const client = clients.data.find((c) => c.id === v.client_id);
  const step = stepOf(v.status);
  const locked = ["in_approval", "approved", "exported"].includes(v.status);
  const picked = v.variants.find((x) => x.selected);

  async function act(path: string, body: unknown = {}, done?: string) {
    setBusy(true);
    try {
      await post(`/video/projects/${v.id}/${path}`, body);
      if (done) toast.show(done);
    } catch (e) {
      toast.show((e as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title={v.brief.title} sub={<>{client?.name} · {v.brief.duration_s}s · {v.brief.aspect} · {v.brief.markets.join(", ")} · <Pill tone={STATUS[v.status].tone}>{STATUS[v.status].text}</Pill></>} />
      <ol className="stepper" aria-label="Progress">
        {STEPS.map((s, i) => <li key={s} className={i < step ? "done" : i === step ? "now" : ""} aria-current={i === step ? "step" : undefined}><span>{i < step ? <Icon name="check" size={14} /> : i + 1}</span>{s}</li>)}
      </ol>
      {v.status === "changes_requested" && <div className="notice notice-warn"><b>Changes requested:</b> {v.last_comment ?? "No comment."} Change the storyboard and generate again.</div>}
      {v.status === "rejected" && <div className="notice notice-bad"><b>Rejected:</b> {v.last_comment ?? "No comment."} Start a new brief.</div>}

      <div className="grid-2 wide-left">
        <Card title="Brief">
          <dl className="kv">
            <dt>Sells</dt><dd>{v.brief.product}</dd>
            <dt>For</dt><dd>{v.brief.audience}</dd>
            <dt>Goal</dt><dd>{v.brief.objective}</dd>
            <dt>Platforms</dt><dd>{v.brief.platforms.map((x) => PLATFORMS.find((y) => y.id === x)?.name).join(", ")}</dd>
            <dt>Offer</dt><dd>{v.brief.offer || "None"} · CTA "{v.brief.cta}"</dd>
            <dt>Key frame</dt><dd>{v.brief.key_frame_url ? <a href={v.brief.key_frame_url} target="_blank" rel="noopener noreferrer">Image <Icon name="external" size={12} /></a> : <span className="muted">None, so jobs are simulated</span>}</dd>
          </dl>
        </Card>
        <Card title={<span className="row gap-s"><Icon name="shield" /> Checks</span>} action={<Pill tone={v.checks.outcome === "pass" ? "good" : v.checks.outcome === "warn" ? "warn" : "bad"}>{v.checks.outcome}</Pill>}>
          <ul className="check-list">
            {v.checks.findings.map((f, i) => <li key={i} className={`sev-${f.severity}`}><span className="mono small">{f.rule}</span> {f.message}</li>)}
          </ul>
          <h3>AI labels at publish</h3>
          <ul className="facts small">{v.checks.ai_labels.map((l) => <li key={l.platform + l.label}><b>{l.platform}:</b> {l.label}</li>)}</ul>
        </Card>
      </div>

      <Card title="Script and storyboard" action={!locked && <button className="btn btn-sm" disabled={busy} onClick={() => act("storyboard", {}, "Storyboard written.")}><Icon name="sparkles" size={14} /> {v.shots.length ? "Write again" : "Write script and storyboard"}</button>}>
        {!v.script ? <p className="muted">The app writes a hook, a voice-over line per shot and a storyboard from the brief and the client's tone. Each shot goes to the engine that suits it: Higgsfield for people and camera moves, Runway for product and scene shots. You can change it.</p> : (
          <>
            <p><b>Hook:</b> {v.script.hook} <span className="muted">· CTA: {v.script.cta}</span></p>
            <div className="shots">
              {v.shots.map((s) => (
                <div key={s.id} className="shot">
                  <div className="row between"><b>Shot {s.n}</b><span className="small muted">{s.seconds}s · {s.camera}</span></div>
                  <div className="small">{s.visual}</div>
                  <div className="small muted">On screen: "{s.on_screen_text}"</div>
                  <label className="field compact"><span>Engine</span>
                    <select value={s.engine} disabled={locked || busy} onChange={(e) => void send("PUT", `/video/projects/${v.id}/shots`, { shots: [{ id: s.id, engine: e.target.value }] })}>
                      <option value="runway">Runway</option><option value="higgsfield">Higgsfield</option>
                    </select>
                  </label>
                  <details><summary className="small">Prompt</summary><p className="small mono prompt">{s.prompt}</p></details>
                </div>
              ))}
            </div>
            {!locked && <div className="row end"><button className="btn btn-primary" disabled={busy || v.checks.outcome === "block"} onClick={() => act("generate", {}, "Generating 3 variants.")}><Icon name="video" size={16} /> Generate 3 variants</button></div>}
            {v.checks.outcome === "block" && <p className="small bad-text">Generation is blocked until the checks pass.</p>}
          </>
        )}
      </Card>

      {v.variants.length > 0 && (
        <Card title="Variants" action={v.status === "generating" ? <span className="small muted row gap-s"><span className="spinner" aria-hidden /> Generating…</span> : null}>
          <div className="variants">
            {v.variants.map((x) => {
              const done = x.jobs.filter((j) => j.status === "succeeded").length;
              const live = x.jobs.some((j) => j.mode === "live");
              const out = x.jobs.find((j) => j.output_url)?.output_url;
              return (
                <div key={x.id} className={`variant${x.selected ? " picked" : ""}`}>
                  <div className={`poster ar-${v.brief.aspect.replace(":", "-")}`}>
                    {out ? <video src={out} controls muted playsInline poster={x.poster} /> : <img src={x.poster} alt={`${x.label} preview`} />}
                  </div>
                  <b>{x.label}</b>
                  <div className="small muted">{done}/{x.jobs.length} shots ready · {x.gen_seconds}s of generation · {live ? "live" : "simulated"}</div>
                  {x.preview_score !== null && <div className="small">Preview score {x.preview_score} <span className="muted">(simulated)</span></div>}
                  {x.jobs.some((j) => j.error) && <div className="small bad-text">{x.jobs.find((j) => j.error)?.error}</div>}
                  {["review", "changes_requested"].includes(v.status) && x.status === "ready" && (
                    <button className={`btn btn-sm ${x.selected ? "btn-good" : ""}`} disabled={busy} onClick={() => act("select", { variant_id: x.id })}>{x.selected ? <><Icon name="check" size={14} /> Picked</> : "Pick this one"}</button>
                  )}
                </div>
              );
            })}
          </div>
          {picked && ["review", "changes_requested"].includes(v.status) && (
            <div className="row end"><button className="btn btn-primary" disabled={busy} onClick={() => act("submit", {}, "Sent for approval: creative lead and client approver.")}>Send for client approval</button></div>
          )}
        </Card>
      )}

      {v.approval_id && (
        <Card title="Approval">
          <p>{v.status === "in_approval" ? "Waiting for 2 people: the creative lead and the client approver. Nothing can change while it waits." : `Decision: ${STATUS[v.status].text}.`}</p>
          <Link to={`/approvals/${v.approval_id}?filter=all`}>Open the approval</Link>
        </Card>
      )}

      {v.status === "approved" && <div className="row end"><button className="btn btn-primary" disabled={busy} onClick={() => act("export", {}, "Exported. Social and paid can publish it now.")}><Icon name="download" size={16} /> Export for publishing</button></div>}
      {v.export && (
        <Card title="Export">
          <p className="small">{v.export.handoff}</p>
          <table className="table compact">
            <thead><tr><th>Platform</th><th>Shape</th><th>AI label</th><th>File</th></tr></thead>
            <tbody>{v.export.files.map((f) => (
              <tr key={f.platform}><td>{f.platform}</td><td>{f.aspect}</td><td className="small">{f.label}</td><td>{f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer">Open</a> : <span className="muted small">Simulated, no file</span>}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      {toast.node}
    </>
  );
}
