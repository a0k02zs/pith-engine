// Shared types for the command centre API and UI.
// Field names follow engine/contracts (approval-item.json, openapi.yaml /runs, events.md).

export type ServiceCode =
  | "email" | "campaigns" | "video" | "social" | "search" | "influencer"
  | "content" | "abm" | "crm_ops" | "messaging" | "paid_social" | "analytics"
  | "brand" | "pr" | "affiliate" | "events" | "cro" | "community";

export type StepType = "agent" | "tool" | "check" | "gate" | "wait" | "branch" | "emit" | "subflow" | "task";
export type ToolRisk = "read" | "write_internal" | "write_external" | "remove" | "spend" | "send" | "sign" | "pay";

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string | null;
  needs: string[];
  gate: {
    approval_kind: string;
    required_roles: string[];
    required_count: number;
    sla_hours: number;
    skip_if: string | null;
    on_changes: string | null;
  } | null;
  tool: { name: string; action: string; risk: ToolRisk } | null;
  check: { kinds: string[] } | null;
}

export interface WorkflowDef {
  id: string;
  version: number;
  service: ServiceCode;
  folder: string;
  file: string;
  description: string;
  trigger: { cron?: string; event?: string; manual?: boolean | object };
  inputs: unknown;
  steps: WorkflowStep[];
}

export interface ServiceInfo {
  code: ServiceCode;
  number: number;
  name: string;
  lead_role: string;
  kpis: string[];
  workflow_count: number;
}

export type ClientModel = "B2B" | "B2C";

export interface Client {
  id: string;
  name: string;
  model: ClientModel;
  industry: string;
  markets: string[];
  market_groups: string[];
  services: ServiceCode[];
  account_lead: string;
  currency: string;
  paused: boolean;
  paused_reason: string | null;
  test_data: true;
}

export type RunStatus = "running" | "waiting_approval" | "waiting_event" | "succeeded" | "failed" | "cancelled";
export type StepStatus = "pending" | "running" | "waiting" | "held" | "succeeded" | "skipped" | "failed" | "cancelled";

export interface StepRun {
  id: string;
  type: StepType;
  name: string | null;
  status: StepStatus;
  started_at: string | null;
  finished_at: string | null;
  note: string | null;
  approval_id: string | null;
  risk: ToolRisk | null;
}

export interface Run {
  id: string;
  client_id: string;
  workflow_id: string;
  version: number;
  service: ServiceCode;
  status: RunStatus;
  markets: string[];
  started_at: string;
  updated_at: string;
  finished_at: string | null;
  triggered_by: string;
  cost_usd: number;
  steps: StepRun[];
}

export type ApprovalStatus = "open" | "approved" | "rejected" | "changes_requested" | "expired" | "cancelled";
export type Decision = "approved" | "rejected" | "changes_requested";

export interface ApprovalDecision {
  decided_by: string;
  role: string;
  decision: Decision;
  comment?: string;
  at: string;
}

export interface ApprovalItem {
  id: string;
  client_id: string;
  run_id: string | null;
  step_id: string | null;
  service: ServiceCode;
  kind: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  brand_score: number | null;
  compliance: { check_id: string; outcome: "pass" | "warn" | "block"; findings_count: number } | null;
  required_roles: string[];
  required_count: number;
  priority: "low" | "normal" | "high" | "urgent";
  sla_due_at: string;
  status: ApprovalStatus;
  decisions: ApprovalDecision[];
  created_at: string;
  closed_at: string | null;
}

export interface MetricRow {
  date: string;
  client_id: string;
  service: ServiceCode;
  market: string;
  kpi: string;
  value: number;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  client_id: string | null;
  target: string | null;
  detail: string;
}

export interface User {
  id: string;
  name: string;
  roles: string[];
  note: string;
}

export interface Overview {
  totals: { spend: number; revenue: number; leads: number; conversions: number; roas: number };
  previous: { spend: number; revenue: number; leads: number; conversions: number; roas: number };
  approvals: { open: number; overdue: number; urgent: number; due_24h: number };
  runs: Record<RunStatus, number>;
  services: Array<{
    code: ServiceCode;
    name: string;
    number: number;
    runs_active: number;
    runs_failed_7d: number;
    approvals_open: number;
    approvals_overdue: number;
    health: "good" | "watch" | "action";
  }>;
  daily: Array<{ date: string; spend: number; revenue: number; leads: number }>;
  attention: Array<{ kind: "approval" | "run" | "client"; id: string; title: string; detail: string; severity: "action" | "watch" }>;
}
