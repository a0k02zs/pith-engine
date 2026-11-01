import { useState } from "react";
import { Link } from "react-router-dom";
import { compact } from "../format";

interface Series {
  key: string;
  label: string;
  color: string;
}

/** Line chart for daily values. Hover shows the values for a day. */
export function LineChart({ rows, series, height = 220, format = compact }: {
  rows: Array<Record<string, number | string>>;
  series: Series[];
  height?: number;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 720;
  const pad = { l: 48, r: 12, t: 12, b: 24 };
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => Number(r[s.key] ?? 0))));
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, rows.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (height - pad.t - pad.b);
  const ticks = [0, 0.5, 1].map((f) => f * max);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${w} ${height}`} role="img" aria-label={series.map((s) => s.label).join(" and ")}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * w;
          const i = Math.round(((px - pad.l) / (w - pad.l - pad.r)) * (rows.length - 1));
          setHover(Math.max(0, Math.min(rows.length - 1, i)));
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">{format(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => (i % 7 === 0 ? <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="axis">{String(r.date).slice(5)}</text> : null))}
        {series.map((s) => (
          <path key={s.key} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round"
            d={rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Number(r[s.key] ?? 0)).toFixed(1)}`).join("")} />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} className="cursor" />
            {series.map((s) => <circle key={s.key} cx={x(hover)} cy={y(Number(rows[hover][s.key] ?? 0))} r={4} fill={s.color} />)}
          </g>
        )}
      </svg>
      <div className="legend">
        {hover !== null && <span className="muted">{String(rows[hover].date)}</span>}
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} /> {s.label}
            {hover !== null && <b> {format(Number(rows[hover][s.key] ?? 0))}</b>}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars, sorted by value. */
export function BarList({ items, format = compact }: { items: Array<{ label: string; value: number; href?: string }>; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="barlist">
      {[...items].sort((a, b) => b.value - a.value).map((i) => (
        <li key={i.label}>
          <span className="barlist-label">{i.href ? <Link to={i.href}>{i.label}</Link> : i.label}</span>
          <span className="barlist-track"><span style={{ width: `${(i.value / max) * 100}%` }} /></span>
          <span className="barlist-value">{format(i.value)}</span>
        </li>
      ))}
    </ul>
  );
}
