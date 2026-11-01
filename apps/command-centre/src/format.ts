export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
export const num = (n: number) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(n);
export const compact = (n: number) => new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export function pctChange(now: number, before: number) {
  if (!before) return null;
  return ((now - before) / before) * 100;
}

export function ago(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  const m = Math.round(ms / 60000);
  if (Math.abs(m) < 60) return m >= 0 ? `${m} min ago` : `in ${-m} min`;
  const h = Math.round(m / 60);
  if (Math.abs(h) < 48) return h >= 0 ? `${h} h ago` : `in ${-h} h`;
  const d = Math.round(h / 24);
  return d >= 0 ? `${d} days ago` : `in ${-d} days`;
}

export function dueIn(iso: string) {
  const ms = Date.parse(iso) - Date.now();
  const h = ms / 3_600_000;
  if (h < 0) return `${Math.round(-h)} h overdue`;
  if (h < 1) return `due in ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `due in ${Math.round(h)} h`;
  return `due in ${Math.round(h / 24)} days`;
}

export function label(s: string) {
  const t = s.replace(/[_.]+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const MONEY_KPIS = new Set(["revenue", "spend", "pipeline_value", "attributed_revenue", "payout_amount"]);
export const kpiValue = (k: string, n: number) => (MONEY_KPIS.has(k) ? `£${compact(n)}` : compact(n));
