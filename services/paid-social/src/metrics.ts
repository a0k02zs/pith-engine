/** Builds payloads for engine/metric.recorded (engine/contracts/schemas/metric-event.json). */

export const PLATFORM_SOURCE = { meta: "meta_ads", linkedin: "linkedin_ads", tiktok: "tiktok_ads", snapchat: "snapchat_ads" } as const;

export interface KpiInput {
  client_id: string;
  kpi: string;
  value: number;
  date: string;
  platform: keyof typeof PLATFORM_SOURCE;
  market: string;
  currency?: string;
  campaign_id?: string;
  variant_id?: string;
  occurred_at?: string;
}

/** Shared codes are in enums.kpis; a service-only code is "paid_social.<name>" (enums.kpi_naming_rule). */
export function isValidKpiCode(code: string, sharedKpis: string[]): boolean {
  return sharedKpis.includes(code) || /^paid_social\.[a-z0-9_]+$/.test(code);
}

export function kpiEvent(k: KpiInput): Record<string, unknown> {
  if (!Number.isFinite(k.value)) throw new RangeError(`KPI ${k.kpi} has no finite value`);
  const e: Record<string, unknown> = {
    client_id: k.client_id,
    service: "paid_social",
    kind: "kpi",
    kpi: k.kpi,
    value: k.value,
    date: k.date,
    channel: "paid_ad",
    platform: k.platform,
    market: k.market,
    occurred_at: k.occurred_at ?? new Date().toISOString(),
    source: PLATFORM_SOURCE[k.platform],
  };
  if (k.currency) e.currency = k.currency;
  if (k.campaign_id) e.campaign_id = k.campaign_id;
  if (k.variant_id) e.variant_id = k.variant_id;
  return e;
}

export interface DailyTotals {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

/** The daily KPI set for 1 campaign. Ratios are left out when their base is 0, so no event carries NaN or Infinity. */
export function dailyKpis(base: Omit<KpiInput, "kpi" | "value">, t: DailyTotals): Record<string, unknown>[] {
  const values: [string, number | null][] = [
    ["spend", t.spend],
    ["impressions", t.impressions],
    ["reach", t.reach],
    ["clicks", t.clicks],
    ["conversions", t.conversions],
    ["revenue", t.revenue],
    ["ctr", t.impressions > 0 ? t.clicks / t.impressions : null],
    ["cvr", t.clicks > 0 ? t.conversions / t.clicks : null],
    ["cpa", t.conversions > 0 ? t.spend / t.conversions : null],
    ["roas", t.spend > 0 ? t.revenue / t.spend : null],
    ["frequency", t.reach > 0 ? t.impressions / t.reach : null],
  ];
  return values.filter(([, v]) => v !== null).map(([kpi, value]) => kpiEvent({ ...base, kpi, value: value as number }));
}
