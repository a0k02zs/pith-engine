/** The 3 packages and the 18 pipeline stages (docs/01-playbook.md §2, docs/02-pipeline.md §1). */

export type Package = "A" | "B" | "C";

export interface Stage {
  n: number;
  id: string;
  name: string;
  gate?: { approval_kind: string; required_roles: string[]; required_count: number };
  packages: Package[];
}

export const STAGES: Stage[] = [
  { n: 1, id: "intake", name: "Intake", packages: ["A", "B", "C"] },
  { n: 2, id: "audit", name: "Asset audit", packages: ["A", "B", "C"] },
  { n: 3, id: "research", name: "Market research", packages: ["B", "C"] },
  { n: 4, id: "interviews", name: "Customer interviews", packages: ["B", "C"] },
  { n: 5, id: "insights", name: "Insight brief", packages: ["B", "C"] },
  { n: 6, id: "positioning", name: "Positioning routes", packages: ["B", "C"] },
  {
    n: 7, id: "approve_positioning", name: "Positioning workshop", packages: ["B", "C"],
    gate: { approval_kind: "plan", required_roles: ["strategist", "client_approver"], required_count: 2 },
  },
  { n: 8, id: "verbal_identity", name: "Verbal identity", packages: ["A", "B", "C"] },
  {
    n: 9, id: "approve_name", name: "Name and tagline legal screen", packages: ["C"],
    gate: { approval_kind: "claim", required_roles: ["client_legal"], required_count: 1 },
  },
  { n: 10, id: "territories", name: "Visual territories", packages: ["B", "C"] },
  {
    n: 11, id: "approve_territory", name: "Territory choice", packages: ["B", "C"],
    gate: { approval_kind: "creative", required_roles: ["creative_lead", "client_approver"], required_count: 2 },
  },
  { n: 12, id: "identity_design", name: "Identity design", packages: ["B", "C"] },
  { n: 13, id: "market_adaptation", name: "Market adaptation", packages: ["C"] },
  {
    n: 14, id: "approve_identity", name: "Approve identity", packages: ["B", "C"],
    gate: { approval_kind: "design", required_roles: ["client_approver", "client_executive"], required_count: 2 },
  },
  { n: 15, id: "guidelines", name: "Guidelines and templates", packages: ["A", "B", "C"] },
  { n: 16, id: "compile_brain", name: "Brain compile and test", packages: ["A", "B", "C"] },
  {
    n: 17, id: "approve_brain", name: "Brain go-live", packages: ["A", "B", "C"],
    gate: { approval_kind: "design", required_roles: ["account_lead", "client_approver"], required_count: 2 },
  },
  { n: 18, id: "monitor", name: "Monitor", packages: ["A", "B", "C"] },
];

export interface Scope {
  package: Package;
  /** A new name or a new tagline is in scope. Adds stage 9 in Package B. */
  newNameOrTagline?: boolean;
  /** The client sells in the GCC or in Quebec. Adds stage 13 in Package B. */
  gccOrQuebec?: boolean;
}

/** The stages that run for a scope, in order. */
export function stagesFor(scope: Scope): Stage[] {
  return STAGES.filter((s) => {
    if (s.packages.includes(scope.package)) return true;
    if (scope.package !== "B") return false;
    if (s.n === 9) return Boolean(scope.newNameOrTagline);
    if (s.n === 13) return Boolean(scope.gccOrQuebec);
    return false;
  });
}

/** Target days from intake to brain go-live (docs/06-kpis.md §2, time_to_launch_days). */
export const GO_LIVE_TARGET_WORKING_DAYS: Record<Package, number> = { A: 10, B: 35, C: 60 };
