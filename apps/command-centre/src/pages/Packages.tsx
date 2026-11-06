import { useSearchParams } from "react-router-dom";
import type { PackageCatalog, PriorityLevel, SellablePackage } from "../../server/packages";
import { useApi } from "../api";
import { Card, Loading, PageHead, Pill } from "../components/ui";

type Summary = Omit<PackageCatalog, "packages"> & { package_count: number };

const TONE: Record<PriorityLevel, string> = { high: "good", medium: "info", low: "muted" };

// Sellable packages by region and industry. The URL holds the choice (?region=UK&industry=b2b_saas&cur=GBP)
// so a link to one package can be shared.
export function PackagesPage() {
  const [q, setQ] = useSearchParams();
  const sum = useApi<Summary>("/packages");
  const region = q.get("region") ?? "UK";
  const industry = q.get("industry") ?? "b2b_saas";
  const list = useApi<SellablePackage[]>(`/packages/${region}/${industry}`);
  const set = (patch: Record<string, string>) => setQ({ region, industry, ...(q.get("cur") ? { cur: q.get("cur")! } : {}), ...patch });

  if (!sum.data) return <Loading error={sum.error} />;
  const s = sum.data;
  const r = s.regions.find((x) => x.id === region) ?? s.regions[0];
  const ind = s.industries.find((x) => x.id === industry) ?? s.industries[0];
  const cur = r.prices.some((p) => p.currency === q.get("cur")) ? q.get("cur")! : r.prices[0].currency;
  const [prio, why] = r.priority[ind.id];

  return (
    <>
      <PageHead
        title="Packages"
        sub={<>Packages by market and industry, v{s.version} ({s.as_of}). <b>Indicative prices</b>: the head of growth sets final prices. Fees exclude media and creator spend.</>}
      />
      <div className="toolbar">
        <select aria-label="Region" value={r.id} onChange={(e) => set({ region: e.target.value, cur: "" })}>
          {s.regions.map((x) => <option key={x.id} value={x.id}>{x.launch}. {x.name}</option>)}
        </select>
        <select aria-label="Industry" value={ind.id} onChange={(e) => set({ industry: e.target.value })}>
          {(["B2B", "B2C"] as const).map((seg) => (
            <optgroup key={seg} label={seg}>
              {s.industries.filter((x) => x.segment === seg).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </optgroup>
          ))}
        </select>
        {r.prices.length > 1 && (
          <select aria-label="Currency" value={cur} onChange={(e) => set({ cur: e.target.value })}>
            {r.prices.map((p) => <option key={p.currency} value={p.currency}>{p.currency} · {p.label}</option>)}
          </select>
        )}
        <Pill tone={TONE[prio]}>{prio} priority</Pill>
      </div>
      <p className="muted">{why}. Goal: {ind.goal}.{ind.regulated ? ` Includes ${ind.regulated.name}.` : ""}</p>

      {list.data ? (
        <div className="grid-3">
          {list.data.map((p) => {
            const pr = p.prices.find((x) => x.currency === cur) ?? p.prices[0];
            const fmt = (v: number) => `${pr.symbol}${v.toLocaleString("en-GB")}`;
            const t = s.tiers[p.tier];
            return (
              <Card key={p.id} title={t.name} action={<span className="muted small">{p.term_months} months min.</span>}>
                <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }} aria-label={`${fmt(pr.monthly)} per month`}>
                  {fmt(pr.monthly)} <span className="muted small">/ month</span>
                </div>
                <dl className="kv">
                  <dt>Setup (one-off)</dt><dd className="num">{fmt(pr.setup)}</dd>
                  <dt>First year</dt><dd className="num">{fmt(pr.first_year)}</dd>
                  <dt>Bundle discount</dt><dd className="num">{Math.round(t.discount * 100)}%</dd>
                </dl>
                <ul className="plain-list" style={{ marginTop: 10 }}>
                  {p.lines.map((l) => (
                    <li key={l.service}>
                      {l.service_name} <span className="muted">· {l.tier_name}{l.foundation ? " · foundation" : ""}</span>
                    </li>
                  ))}
                </ul>
                {pr.addons.length > 0 && (
                  <p className="small muted">
                    Add-ons in the price: {pr.addons.map((a) => `${a.name}${a.monthly ? ` ${fmt(a.monthly)}/mo` : ""}${a.setup ? ` + ${fmt(a.setup)} once` : ""}`).join("; ")}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      ) : <Loading error={list.error} />}

      <Card title="Where to lead">
        <div className="table-wrap">
          <table className="table compact">
            <thead>
              <tr><th>Industry</th>{s.regions.map((x) => <th key={x.id}>{x.id}</th>)}</tr>
            </thead>
            <tbody>
              {s.industries.map((i) => (
                <tr key={i.id}>
                  <td>{i.name} <span className="muted small">{i.segment}</span></td>
                  {s.regions.map((x) => {
                    const [lvl, reason] = x.priority[i.id];
                    const sel = x.id === r.id && i.id === ind.id;
                    return (
                      <td key={x.id} style={sel ? { background: "var(--info-bg)" } : undefined}>
                        <button className="link-btn" title={reason} aria-label={`${i.name} in ${x.name}: ${lvl} priority`} onClick={() => setQ({ region: x.id, industry: i.id })}>
                          <Pill tone={TONE[lvl]}>{lvl}</Pill>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid-2">
        <Card title={`${r.name}: rules every package follows`}>
          <p className="muted">{r.language}</p>
          <ul>{r.compliance.map((c) => <li key={c}>{c}</li>)}</ul>
        </Card>
        <Card title="Regional add-ons">
          <ul>
            {r.addons.map((a) => (
              <li key={a.id}>{a.name}: <b>{a.required ? "required" : "optional"}</b>{a.note ? `. ${a.note}` : ""}</li>
            ))}
          </ul>
          <p className="small muted">{s.notes.join(" ")}</p>
        </Card>
      </div>
    </>
  );
}
