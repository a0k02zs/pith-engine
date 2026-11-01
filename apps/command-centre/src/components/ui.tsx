import { useState, type ReactNode } from "react";
import type { RunStatus, StepStatus } from "../../server/types";
import { label } from "../format";

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

const RUN_TONE: Record<RunStatus, string> = {
  running: "info", waiting_approval: "warn", waiting_event: "info", succeeded: "good", failed: "bad", cancelled: "muted",
};
const STEP_TONE: Record<StepStatus, string> = {
  pending: "muted", running: "info", waiting: "warn", held: "bad", succeeded: "good", skipped: "muted", failed: "bad", cancelled: "muted",
};

export function Pill({ tone = "muted", children }: { tone?: string; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function RunStatusPill({ status }: { status: RunStatus }) {
  const text = status === "waiting_approval" ? "Needs approval" : status === "waiting_event" ? "Waiting" : label(status);
  return <Pill tone={RUN_TONE[status]}>{text}</Pill>;
}

export function StepStatusPill({ status }: { status: StepStatus }) {
  return <Pill tone={STEP_TONE[status]}>{label(status)}</Pill>;
}

export function Compliance({ c }: { c: { outcome: "pass" | "warn" | "block"; findings_count: number } | null }) {
  if (!c) return <span className="muted">No check</span>;
  const tone = c.outcome === "pass" ? "good" : c.outcome === "warn" ? "warn" : "bad";
  return (
    <Pill tone={tone}>
      Compliance {c.outcome}
      {c.findings_count ? ` · ${c.findings_count}` : ""}
    </Pill>
  );
}

export function BrandScore({ score }: { score: number | null }) {
  if (score === null) return null;
  const tone = score >= 85 ? "good" : score >= 80 ? "warn" : "bad";
  return <Pill tone={tone}>Brand {score}</Pill>;
}

export function Loading({ error }: { error?: string | null }) {
  return <div className={error ? "notice notice-bad" : "muted pad"}>{error ?? "Loading…"}</div>;
}

export function Stat({ label: l, value, delta, hint }: { label: string; value: ReactNode; delta?: number | null; hint?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{l}</div>
      <div className="stat-value">{value}</div>
      {delta !== undefined && delta !== null && (
        <div className={`stat-delta ${delta >= 0 ? "up" : "down"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% <span className="muted">vs previous 28 days</span>
        </div>
      )}
      {hint && <div className="muted small">{hint}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="card-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<{ text: string; tone: string } | null>(null);
  const show = (text: string, tone = "good") => {
    setMsg({ text, tone });
    window.setTimeout(() => setMsg(null), 4000);
  };
  const node = msg ? <div className={`toast toast-${msg.tone}`} role="status">{msg.text}</div> : null;
  return { show, node };
}
