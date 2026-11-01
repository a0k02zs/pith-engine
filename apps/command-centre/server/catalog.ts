import catalogJson from "./generated/catalog.json" with { type: "json" };
import type { ServiceCode, ServiceInfo, WorkflowDef } from "./types.js";

export interface Catalog {
  contract_version: string;
  services: Record<ServiceCode, number>;
  market_groups: Record<string, string[]>;
  market_launch_order: string[];
  roles: string[];
  approval_kinds: string[];
  kpis: Record<string, string>;
  tool_risk_meaning: Record<string, string>;
  compliance: Record<string, MarketRules | null>;
  workflows: WorkflowDef[];
}

export interface MarketRules {
  group: string | null;
  laws: string[];
  disclosure_labels: string[];
  rules: Array<{ id: string; severity: string; message: string; channels: string[] }>;
}

export const catalog = catalogJson as unknown as Catalog;

// Display names from the Pith M plan (18 services). Lead roles from enums.json roles.
// Headline KPIs are canonical codes from enums.json kpis (count or money only, so they can be summed).
const META: Record<ServiceCode, { name: string; lead_role: string; kpis: string[] }> = {
  email: { name: "Email marketing", lead_role: "account_lead", kpis: ["sends", "clicks", "revenue"] },
  campaigns: { name: "Multi-channel campaigns", lead_role: "strategist", kpis: ["spend", "conversions", "revenue"] },
  video: { name: "Video production", lead_role: "creative_lead", kpis: ["impressions", "clicks", "spend"] },
  social: { name: "Organic social media", lead_role: "social_lead", kpis: ["impressions", "clicks", "follower_growth"] },
  search: { name: "SEO, SEM and GEO", lead_role: "seo_lead", kpis: ["organic_sessions_nonbrand", "clicks", "spend"] },
  influencer: { name: "Influencer marketing", lead_role: "influencer_lead", kpis: ["reach", "clicks", "spend"] },
  content: { name: "Content marketing", lead_role: "content_lead", kpis: ["pages_published", "sessions", "leads"] },
  abm: { name: "Account-based marketing", lead_role: "account_lead", kpis: ["meetings_booked", "opportunities", "pipeline_value"] },
  crm_ops: { name: "Marketing automation and CRM ops", lead_role: "ops_lead", kpis: ["leads", "mqls", "sqls"] },
  messaging: { name: "SMS, WhatsApp and push", lead_role: "ops_lead", kpis: ["sends", "clicks", "revenue"] },
  paid_social: { name: "Performance and paid social", lead_role: "performance_marketer", kpis: ["spend", "conversions", "revenue"] },
  analytics: { name: "Analytics and attribution", lead_role: "analytics_lead", kpis: ["attributed_revenue", "conversions", "sessions"] },
  brand: { name: "Brand strategy and design", lead_role: "creative_lead", kpis: ["reach", "sessions", "leads"] },
  pr: { name: "PR and thought leadership", lead_role: "pr_lead", kpis: ["media_mentions_tier1", "reach", "sessions"] },
  affiliate: { name: "Affiliate and partner", lead_role: "account_lead", kpis: ["clicks", "conversions", "payout_amount"] },
  events: { name: "Events and webinars", lead_role: "account_lead", kpis: ["registrations", "attendees", "leads"] },
  cro: { name: "CRO and landing pages", lead_role: "cro_lead", kpis: ["sessions", "conversions", "revenue"] },
  community: { name: "Community and UGC", lead_role: "community_manager", kpis: ["review_count", "ugc_reuse_count", "sessions"] },
};

export const SERVICE_CODES = (Object.entries(catalog.services) as [ServiceCode, number][])
  .sort((a, b) => a[1] - b[1])
  .map(([code]) => code);

export function serviceInfo(code: ServiceCode): ServiceInfo {
  const m = META[code];
  return {
    code,
    number: catalog.services[code],
    name: m.name,
    lead_role: m.lead_role,
    kpis: m.kpis,
    workflow_count: catalog.workflows.filter((w) => w.service === code).length,
  };
}

export const SERVICES: ServiceInfo[] = SERVICE_CODES.map(serviceInfo);

export function workflowById(id: string): WorkflowDef | undefined {
  return catalog.workflows.find((w) => w.id === id);
}

export function marketGroupOf(country: string): string | undefined {
  return Object.entries(catalog.market_groups).find(([, cs]) => cs.includes(country))?.[0];
}

/** Compliance rules for one country. A market not listed uses its group default (compliance-rules.json "resolution"). */
export function complianceFor(country: string): MarketRules | null {
  const own = catalog.compliance[country];
  if (own) return own;
  const group = marketGroupOf(country);
  if (group === "EU") return catalog.compliance.EU_DEFAULT ?? null;
  if (group === "GCC") return catalog.compliance.GCC_DEFAULT ?? null;
  return null;
}
