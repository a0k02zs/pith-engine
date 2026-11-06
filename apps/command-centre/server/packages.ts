import packagesJson from "./generated/packages.json" with { type: "json" };

// Sellable packages: region x industry x tier. Source of truth: packages/build-catalog.mjs at the
// repo root (writes packages/catalog.json). Prices are indicative; the head of growth sets them.
export type PriorityLevel = "high" | "medium" | "low";

export interface PackageLine { service: string; number: number; service_name: string; tier: string; tier_name: string; monthly_gbp: number; setup_gbp: number; foundation?: boolean }
export interface PackagePrice {
  currency: string; symbol: string; label: string; country: string;
  monthly: number; setup: number; first_year: number; monthly_gbp_equiv: number;
  addons: Array<{ id: string; name: string; monthly: number; setup: number; note: string | null }>;
}
export interface SellablePackage {
  id: string; region: string; industry: string; tier: string; name: string; term_months: number;
  priority: PriorityLevel; lines: PackageLine[]; list_monthly_gbp: number; bundle_discount_gbp: number; prices: PackagePrice[];
}
export interface PackageRegion {
  id: string; name: string; launch: number; countries: string[]; lead_country: string;
  prices: Array<{ currency: string; symbol: string; fx: number; factor: number; label: string }>;
  language: string; channels: { B2B: string; B2C: string }; compliance: string[]; key_dates: string;
  addons: Array<{ id: string; name: string; gbp: number; setup?: number; when: string; required: boolean; note?: string }>;
  priority: Record<string, [PriorityLevel, string]>;
}
export interface PackageIndustry {
  id: string; name: string; segment: "B2B" | "B2C"; examples: string; goal: string; kpis: string[];
  regulated?: { name: string; gbp: number; why: string };
}
export interface PackageCatalog {
  version: string; as_of: string; status: string; notes: string[];
  tiers: Record<string, { name: string; discount: number; term_months: number; for: string }>;
  services: Record<string, { number: number; name: string; tiers: Record<string, { name: string; monthly_gbp: number; setup_gbp: number }> }>;
  industries: PackageIndustry[]; regions: PackageRegion[]; packages: SellablePackage[];
}

export const packageCatalog = packagesJson as unknown as PackageCatalog;

/** Everything except the 120 expanded packages: enough for the picker and the priority grid. */
export function packageSummary() {
  const { packages, ...rest } = packageCatalog;
  return { ...rest, package_count: packages.length };
}

/** The 3 tiers for one region and industry, in tier order. Empty if either id is unknown. */
export function packagesFor(region: string, industry: string): SellablePackage[] {
  const order = Object.keys(packageCatalog.tiers);
  return packageCatalog.packages
    .filter((p) => p.region === region && p.industry === industry)
    .sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
}
