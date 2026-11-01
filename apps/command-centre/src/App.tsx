import { NavLink, Route, Routes } from "react-router-dom";
import type { Overview, User } from "../server/types";
import { currentUserId, setCurrentUserId, useApi } from "./api";
import { ApprovalsPage } from "./pages/Approvals";
import { ClientDetailPage, ClientsPage } from "./pages/Clients";
import { AnalyticsPage } from "./pages/Analytics";
import { DeckPage } from "./pages/Deck";
import { RunDetailPage, RunsPage } from "./pages/Runs";
import { ServicePage, ServicesPage } from "./pages/Services";
import { SettingsPage } from "./pages/Settings";

export function App() {
  const meta = useApi<{ users: User[]; contract_version: string }>("/meta");
  const ov = useApi<Overview>("/overview");
  const uid = currentUserId();
  const nav = [
    { to: "/", label: "Command deck", icon: "◎", end: true },
    { to: "/approvals", label: "Approvals", icon: "✓", badge: ov.data?.approvals.open, alert: (ov.data?.approvals.overdue ?? 0) > 0 },
    { to: "/runs", label: "Runs", icon: "▶" },
    { to: "/services", label: "Services", icon: "▦" },
    { to: "/clients", label: "Clients", icon: "◆" },
    { to: "/analytics", label: "Analytics", icon: "▤" },
    { to: "/settings", label: "Settings", icon: "⚙" },
  ];
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="logo">P</span>
          <div>
            <b>Pith</b> Command Centre
            <div className="small dim">Engine contract {meta.data?.contract_version ?? "…"}</div>
          </div>
        </div>
        <nav>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav${isActive ? " active" : ""}`}>
              <span className="nav-icon" aria-hidden>{n.icon}</span>
              {n.label}
              {n.badge ? <span className={`badge${n.alert ? " badge-alert" : ""}`}>{n.badge}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <label className="small dim" htmlFor="user">Signed in as</label>
          <select id="user" value={uid} onChange={(e) => setCurrentUserId(e.target.value)}>
            {meta.data?.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <div className="test-flag">Test data. No real client is connected.</div>
        </div>
      </aside>
      <main className="main">
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
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<div className="pad">Page not found.</div>} />
        </Routes>
      </main>
    </div>
  );
}
