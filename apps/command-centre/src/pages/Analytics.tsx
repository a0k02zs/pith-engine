import { useState } from "react";
import type { Client, ServiceInfo } from "../../server/types";
import { useApi } from "../api";
import { BarList, LineChart } from "../components/charts";
import { Card, Loading, PageHead } from "../components/ui";
import { compact, gbp, label } from "../format";

const KPIS = ["revenue", "spend", "leads", "conversions", "sessions", "clicks", "pipeline_value"];
const MONEY = new Set(["revenue", "spend", "pipeline_value"]);

export function AnalyticsPage() {
  const [kpi, setKpi] = useState("revenue");
  const [client, setClient] = useState("");
  const [days, setDays] = useState(28);
  const clients = useApi<Client[]>("/clients");
  const services = useApi<ServiceInfo[]>("/services");
  const from = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
  const base = `/metrics?kpi=${kpi}&from=${from}${client ? `&client_id=${client}` : ""}`;
  const daily = useApi<Array<Record<string, number | string>>>(`${base}&group_by=date`);
  const bySvc = useApi<Array<Record<string, number | string>>>(`${base}&group_by=service`);
  const byMkt = useApi<Array<Record<string, number | string>>>(`${base}&group_by=market`);
  const byClient = useApi<Array<Record<string, number | string>>>(`${base}&group_by=client_id`);
  const fmt = MONEY.has(kpi) ? gbp : compact;
  const sname = Object.fromEntries((services.data ?? []).map((s) => [s.code, s.name]));
  const cname = Object.fromEntries((clients.data ?? []).map((c) => [c.id, c.name]));
  return (
    <>
      <PageHead title="Analytics" sub="Daily KPIs from engine metric events (canonical codes in enums.json). Test data." />
      <div className="toolbar">
        <select value={kpi} onChange={(e) => setKpi(e.target.value)} aria-label="KPI">{KPIS.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
        <select value={client} onChange={(e) => setClient(e.target.value)} aria-label="Client">
          <option value="">All clients</option>
          {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
          {[7, 14, 28, 56].map((d) => <option key={d} value={d}>Last {d} days</option>)}
        </select>
      </div>
      <Card title={`${label(kpi)} by day`}>
        {daily.data ? <LineChart rows={daily.data} format={fmt} series={[{ key: kpi, label: label(kpi), color: "var(--c1)" }]} /> : <Loading />}
      </Card>
      <div className="grid-3">
        <Card title="By service">{bySvc.data ? (bySvc.data.length ? <BarList format={fmt} items={bySvc.data.map((r) => ({ label: sname[String(r.service)] ?? String(r.service), value: Number(r[kpi] ?? 0), href: `/services/${r.service}` }))} /> : <p className="muted">No service reports this KPI.</p>) : <Loading />}</Card>
        <Card title="By market">{byMkt.data ? <BarList format={fmt} items={byMkt.data.map((r) => ({ label: String(r.market), value: Number(r[kpi] ?? 0) }))} /> : <Loading />}</Card>
        <Card title="By client">{byClient.data ? <BarList format={fmt} items={byClient.data.map((r) => ({ label: cname[String(r.client_id)] ?? "?", value: Number(r[kpi] ?? 0), href: `/clients/${r.client_id}` }))} /> : <Loading />}</Card>
      </div>
    </>
  );
}
