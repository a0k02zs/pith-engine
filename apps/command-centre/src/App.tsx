import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { Client, Overview, ServiceInfo, User } from "../server/types";
import { currentUserId, setCurrentUserId, useApi } from "./api";
import { Icon, type IconName } from "./components/icons";
import { AnalyticsPage } from "./pages/Analytics";
import { ApprovalsPage } from "./pages/Approvals";
import { ClientDetailPage, ClientsPage } from "./pages/Clients";
import { DeckPage } from "./pages/Deck";
import { PackagesPage } from "./pages/Packages";
import { RunDetailPage, RunsPage } from "./pages/Runs";
import { ServicePage, ServicesPage } from "./pages/Services";
import { SettingsPage } from "./pages/Settings";
import { VideoProjectPage, VideoStudioPage } from "./pages/Video";

interface NavItem { to: string; label: string; icon: IconName; end?: boolean; badge?: number; alert?: boolean; beta?: boolean }

export function App() {
  const meta = useApi<{ users: User[]; contract_version: string }>("/meta");
  const ov = useApi<Overview>("/overview");
  const clients = useApi<Client[]>("/clients");
  const services = useApi<ServiceInfo[]>("/services");
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const uid = currentUserId();

  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const groups: Array<{ title: string; items: NavItem[] }> = [
    { title: "Operate", items: [
      { to: "/", label: "Command deck", icon: "deck", end: true },
      { to: "/approvals", label: "Approvals", icon: "approvals", badge: ov.data?.approvals.open, alert: (ov.data?.approvals.overdue ?? 0) > 0 },
      { to: "/runs", label: "Runs", icon: "runs" },
    ] },
    { title: "Work", items: [
      { to: "/services", label: "Services", icon: "services" },
      { to: "/clients", label: "Clients", icon: "clients" },
      { to: "/packages", label: "Packages", icon: "globe" },
      { to: "/video", label: "Video studio", icon: "video", beta: true },
    ] },
    { title: "Insight", items: [{ to: "/analytics", label: "Analytics", icon: "analytics" }] },
    { title: "Admin", items: [{ to: "/settings", label: "Settings", icon: "settings" }] },
  ];

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <aside className={`side${menu ? " open" : ""}`}>
        <div className="brand">
          <span className="logo" aria-hidden>P</span>
          <div className="brand-text">
            <b>Pith</b> Command Centre
            <div className="small dim">Engine contract {meta.data?.contract_version ?? "…"}</div>
          </div>
          <button className="icon-btn menu-btn" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <Icon name={menu ? "close" : "menu"} />
          </button>
        </div>
        <nav aria-label="Main">
          {groups.map((g) => (
            <div key={g.title} className="nav-group">
              <div className="nav-title">{g.title}</div>
              {g.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav${isActive ? " active" : ""}`}>
                  <Icon name={n.icon} />
                  <span>{n.label}</span>
                  {n.beta && <span className="beta">Beta</span>}
                  {n.badge ? <span className={`badge${n.alert ? " badge-alert" : ""}`} aria-label={`${n.badge} open`}>{n.badge}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <label className="small dim" htmlFor="user">Signed in as</label>
          <select id="user" value={uid} onChange={(e) => setCurrentUserId(e.target.value)}>
            {meta.data?.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <div className="test-flag">Test data. No real client account is connected.</div>
        </div>
      </aside>
      <div className="body">
        <TopBar clients={clients.data ?? []} services={services.data ?? []} onSearch={() => setPalette(true)} />
        <main className="main" id="main">
          <Routes>
            <Route path="/" element={<DeckPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/approvals/:id" element={<ApprovalsPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/runs/:id" element={<RunDetailPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/:code" element={<ServicePage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/video" element={<VideoStudioPage />} />
            <Route path="/video/:id" element={<VideoProjectPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<div className="pad">Page not found. <Link to="/">Go to the command deck</Link>.</div>} />
          </Routes>
        </main>
      </div>
      {palette && <Palette clients={clients.data ?? []} services={services.data ?? []} onClose={() => setPalette(false)} />}
    </div>
  );
}

const SECTION: Record<string, string> = {
  approvals: "Approvals", runs: "Runs", services: "Services", clients: "Clients", packages: "Packages", video: "Video studio", analytics: "Analytics", settings: "Settings",
};

function TopBar({ clients, services, onSearch }: { clients: Client[]; services: ServiceInfo[]; onSearch: () => void }) {
  const loc = useLocation();
  const nav = useNavigate();
  const parts = loc.pathname.split("/").filter(Boolean);
  const crumbs: Array<{ to: string; label: string }> = [{ to: "/", label: "Command deck" }];
  if (parts[0]) crumbs.push({ to: `/${parts[0]}`, label: SECTION[parts[0]] ?? parts[0] });
  if (parts[1]) {
    const name = parts[0] === "clients" ? clients.find((c) => c.id === parts[1])?.name
      : parts[0] === "services" ? services.find((s) => s.code === parts[1])?.name
      : parts[0] === "runs" ? "Run" : parts[0] === "approvals" ? "Approval" : parts[0] === "video" ? "Project" : parts[1];
    crumbs.push({ to: loc.pathname, label: name ?? "…" });
  }
  const clientId = parts[0] === "clients" ? parts[1] ?? "" : "";
  return (
    <header className="topbar">
      <nav aria-label="Breadcrumb" className="crumbs">
        {crumbs.map((c, i) => (
          <span key={c.to} className="crumb">
            {i > 0 && <Icon name="chevron" size={14} className="dim-icon" />}
            {i === crumbs.length - 1 ? <span aria-current="page">{c.label}</span> : <Link to={c.to}>{c.label}</Link>}
          </span>
        ))}
      </nav>
      <div className="top-actions">
        <label className="sr-only" htmlFor="client-switch">Open a client</label>
        <select id="client-switch" className="client-switch" value={clientId} onChange={(e) => nav(e.target.value ? `/clients/${e.target.value}` : "/clients")}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="search-btn" onClick={onSearch} aria-label="Search (Ctrl+K)">
          <Icon name="search" size={16} />
          <span className="search-text">Search</span>
          <kbd>Ctrl K</kbd>
        </button>
      </div>
    </header>
  );
}

interface PaletteItem { label: string; hint: string; to: string; icon: IconName }

function Palette({ clients, services, onClose }: { clients: Client[]; services: ServiceInfo[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const all = useMemo<PaletteItem[]>(() => [
    { label: "Command deck", hint: "Page", to: "/", icon: "deck" },
    { label: "Approvals waiting for me", hint: "Page", to: "/approvals", icon: "approvals" },
    { label: "Runs", hint: "Page", to: "/runs", icon: "runs" },
    { label: "New AI video ad", hint: "Video studio", to: "/video?new=1", icon: "video" },
    { label: "Packages by region and industry", hint: "Page", to: "/packages", icon: "globe" },
    { label: "Analytics", hint: "Page", to: "/analytics", icon: "analytics" },
    { label: "Settings and audit log", hint: "Page", to: "/settings", icon: "settings" },
    ...services.map((s) => ({ label: s.name, hint: `Service ${s.number}`, to: `/services/${s.code}`, icon: "services" as IconName })),
    ...clients.flatMap((c) => [
      { label: c.name, hint: `Client · ${c.markets.join(", ")}`, to: `/clients/${c.id}`, icon: "clients" as IconName },
      { label: `${c.name}: strategy`, hint: "Client strategy", to: `/clients/${c.id}?tab=strategy`, icon: "target" as IconName },
      { label: `${c.name}: connect accounts`, hint: "Meta, Google, LinkedIn, TikTok", to: `/clients/${c.id}?tab=connections`, icon: "plug" as IconName },
    ]),
  ], [clients, services]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = all.filter((x) => words.every((w) => `${x.label} ${x.hint}`.toLowerCase().includes(w))).slice(0, 12);
  const go = (it: PaletteItem | undefined) => {
    if (!it) return;
    nav(it.to);
    onClose();
  };
  return (
    <div className="modal-back palette-back" onClick={onClose}>
      <div className="palette" role="dialog" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" />
          <input ref={input} value={q} placeholder="Search pages, services and clients" aria-label="Search"
            onChange={(e) => (setQ(e.target.value), setI(0))}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") (e.preventDefault(), setI((n) => Math.min(n + 1, hits.length - 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setI((n) => Math.max(n - 1, 0)));
              if (e.key === "Enter") go(hits[i]);
            }} />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" role="listbox">
          {hits.length === 0 && <li className="muted pad">No match.</li>}
          {hits.map((h, n) => (
            <li key={h.to + h.label} role="option" aria-selected={n === i}>
              <button className={`palette-item${n === i ? " on" : ""}`} onMouseEnter={() => setI(n)} onClick={() => go(h)}>
                <Icon name={h.icon} />
                <span className="palette-label">{h.label}</span>
                <span className="small muted">{h.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
