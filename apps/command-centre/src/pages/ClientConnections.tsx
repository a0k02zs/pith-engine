import { useState } from "react";
import type { ClientConnections as Conn } from "../../server/connections";
import type { ClientLink } from "../../server/links";
import type { Client } from "../../server/types";
import { post, send, useApi } from "../api";
import { Icon } from "../components/icons";
import { Card, Loading, Modal, Pill, useToast } from "../components/ui";
import { ago } from "../format";

type View = Conn & { meta: Conn["meta"] & { has_token: boolean } };
interface Integrations { meta_oauth: boolean; token_key_persistent: boolean; claude: boolean }

const FORMS: Array<{ key: keyof Conn; title: string; fields: Array<{ f: string; label: string; ph: string; hint: string }> }> = [
  { key: "google_ads", title: "Google Ads", fields: [{ f: "customer_id", label: "Customer ID", ph: "123-456-7890", hint: "Top right of Google Ads, 10 digits." }] },
  { key: "ga4", title: "Google Analytics 4 and Search Console", fields: [
    { f: "property_id", label: "GA4 property ID", ph: "345678901", hint: "Admin > Property details." },
    { f: "site_url", label: "Website", ph: "https://example.com/", hint: "As it is in Search Console." },
  ] },
  { key: "linkedin", title: "LinkedIn Campaign Manager", fields: [{ f: "ad_account_id", label: "Ad account ID", ph: "508123456", hint: "Campaign Manager > Accounts." }] },
  { key: "tiktok", title: "TikTok Ads", fields: [{ f: "advertiser_id", label: "Advertiser ID", ph: "7012345678901234567", hint: "TikTok Ads Manager > account info." }] },
  { key: "hubspot", title: "HubSpot", fields: [{ f: "portal_id", label: "Portal (Hub) ID", ph: "24123456", hint: "Account menu, next to the account name." }] },
];

const META_FIELDS = [
  { f: "business_id", label: "Business Manager ID", ph: "1234567890123456", hint: "Business settings > Business info." },
  { f: "ad_account_id", label: "Ad account ID", ph: "act_1234567890", hint: "Ads Manager > account menu. With or without act_." },
  { f: "page_id", label: "Facebook Page ID", ph: "1029384756", hint: "Page > About > Page transparency." },
  { f: "instagram_id", label: "Instagram account ID", ph: "17841400000000000", hint: "Business settings > Instagram accounts." },
  { f: "pixel_id", label: "Pixel (dataset) ID", ph: "1234567890", hint: "Events Manager > Data sources." },
];

const STATUS: Record<string, { tone: string; text: string }> = {
  not_connected: { tone: "muted", text: "Not connected" },
  ids_saved: { tone: "info", text: "IDs saved" },
  connected: { tone: "good", text: "Connected" },
  error: { tone: "bad", text: "Needs attention" },
};

export function ClientConnections({ client }: { client: Client }) {
  const conn = useApi<View>(`/clients/${client.id}/connections`);
  const links = useApi<ClientLink[]>(`/clients/${client.id}/links`);
  const integ = useApi<Integrations>("/integrations");
  const toast = useToast();
  const [drop, setDrop] = useState<string | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  if (!conn.data || !integ.data) return <Loading error={conn.error} />;
  const c = conn.data, m = c.meta;

  async function signIn() {
    setMetaErr(null);
    try {
      const r = await post<{ url: string }>("/oauth/meta/start", { client_id: client.id });
      window.location.assign(r.url);
    } catch (e) {
      setMetaErr((e as Error).message);
    }
  }
  async function verify() {
    try {
      await post(`/clients/${client.id}/connections/meta/verify`);
      toast.show("Meta ad account checked.");
    } catch (e) {
      toast.show((e as Error).message, "bad");
    }
  }

  return (
    <div className="stack">
      <div className="notice row gap-m">
        <Icon name="shield" />
        <div>Pith never asks for a client's password. The client grants access in Meta or Google. The access token is encrypted on the server and never shown in the app or sent to the browser. Account IDs are not secret.</div>
      </div>
      <div className="grid-2 wide-left">
        <Card title={<span className="row gap-s"><span className="platform-mark meta">f</span> Meta (Facebook and Instagram)</span>}
          action={<Pill tone={STATUS[m.status].tone}>{STATUS[m.status].text}</Pill>}>
          <IdForm clientId={client.id} platform="meta" fields={META_FIELDS} values={m as unknown as Record<string, string | null>} onSaved={() => toast.show("Meta IDs saved.")} />
          <div className="divider" />
          <h3>Access</h3>
          {m.has_token ? (
            <dl className="kv">
              <dt>Granted by</dt><dd>{m.connected_by} · {m.connected_at ? ago(m.connected_at) : ""}</dd>
              <dt>Token</dt><dd><Icon name="lock" size={14} /> Encrypted on the server{m.token_expires_at ? `, expires ${m.token_expires_at.slice(0, 10)}` : ""}</dd>
              {m.verified && <><dt>Ad account</dt><dd>{m.verified.name} · {m.verified.currency} · status {m.verified.account_status === 1 ? "active" : m.verified.account_status}</dd></>}
            </dl>
          ) : <p className="muted small">Sign in with Meta to let Pith read results and manage ads in this client's accounts. The client, or a person with admin access to the client's Business Manager, signs in.</p>}
          {m.last_error && <div className="notice notice-bad">{m.last_error}</div>}
          {metaErr && <div className="notice notice-warn">{metaErr}</div>}
          {!integ.data.meta_oauth && !metaErr && <p className="small muted">Meta sign-in is not set up on this server yet, so the button explains what is missing. Saved IDs already make the deep links below work.</p>}
          <div className="row wrap end">
            {m.has_token && <button className="btn" onClick={verify}><Icon name="refresh" size={16} /> Check access</button>}
            {(m.has_token || m.status !== "not_connected") && <button className="btn btn-bad" onClick={() => setDrop("meta")}>Disconnect</button>}
            <button className="btn btn-primary" onClick={signIn}><Icon name="plug" size={16} /> {m.has_token ? "Sign in again" : "Sign in with Meta"}</button>
          </div>
        </Card>
        <Card title="Open the client's accounts">
          {!links.data ? <Loading /> : (
            <ul className="link-list">
              {links.data.map((l) => (
                <li key={l.platform}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="ext-link">
                    <span>{l.name}</span>
                    <Icon name="external" size={14} />
                  </a>
                  <span className="small muted">{l.deep ? "Opens this client's account" : `Opens the home page. Save the ${l.needs} for a direct link.`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="grid-auto">
        {FORMS.map((f) => {
          const v = c[f.key] as unknown as Record<string, string | null> & { status: string };
          return (
            <Card key={f.key} title={f.title} action={<Pill tone={STATUS[v.status].tone}>{STATUS[v.status].text}</Pill>}>
              <IdForm clientId={client.id} platform={f.key} fields={f.fields} values={v} onSaved={() => toast.show(`${f.title} saved.`)} />
              {v.status !== "not_connected" && <button className="btn btn-sm btn-ghost" onClick={() => setDrop(f.key)}>Clear</button>}
            </Card>
          );
        })}
      </div>
      <p className="small muted">Google, LinkedIn, TikTok and HubSpot sign-in come next. Today the app saves their IDs for deep links and for the services that read them.</p>
      {drop && (
        <Modal title="Disconnect this account?" onClose={() => setDrop(null)}>
          <p>The app deletes the saved IDs{drop === "meta" ? " and the encrypted Meta token" : ""} for {client.name}. Services stop reading this account until someone connects it again.</p>
          <div className="row end">
            <button className="btn" onClick={() => setDrop(null)}>Keep it</button>
            <button className="btn btn-bad" onClick={async () => { await send("DELETE", `/clients/${client.id}/connections/${drop}`); setDrop(null); toast.show("Disconnected."); }}>Disconnect</button>
          </div>
        </Modal>
      )}
      {toast.node}
    </div>
  );
}

function IdForm({ clientId, platform, fields, values, onSaved }: {
  clientId: string; platform: string; fields: Array<{ f: string; label: string; ph: string; hint: string }>;
  values: Record<string, string | null>; onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((x) => [x.f, values[x.f] ?? ""])));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = fields.some((x) => (values[x.f] ?? "") !== form[x.f]);
  return (
    <form className="id-form" onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      setBusy(true);
      try {
        await send("PUT", `/clients/${clientId}/connections/${platform}`, form);
        onSaved();
      } catch (x) {
        setErr((x as Error).message);
      } finally {
        setBusy(false);
      }
    }}>
      {fields.map((x) => (
        <label key={x.f} className="field">
          <span>{x.label}</span>
          <input type="text" inputMode={x.f === "site_url" ? "url" : "numeric"} className="mono" value={form[x.f]} placeholder={x.ph} autoComplete="off"
            onChange={(e) => setForm({ ...form, [x.f]: e.target.value })} />
          <small className="muted">{x.hint}</small>
        </label>
      ))}
      {err && <div className="notice notice-bad">{err}</div>}
      <div className="row end"><button className="btn btn-sm" disabled={!dirty || busy}>{busy ? "Saving…" : "Save IDs"}</button></div>
    </form>
  );
}
