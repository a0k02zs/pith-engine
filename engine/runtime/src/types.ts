// Types of the engine runtime. The workflow shape follows engine/contracts/schemas/workflow-definition.json.

export type StepType = "agent" | "tool" | "check" | "gate" | "wait" | "branch" | "emit" | "subflow" | "task";
export type Risk = "read" | "write_internal" | "write_external" | "remove" | "spend" | "send" | "sign" | "pay";

export interface Step {
  id: string;
  type: StepType;
  name?: string;
  needs?: string[];
  agent?: { prompt_ref?: string; model?: string; tools?: string[]; reads_brain?: boolean; output_schema?: string };
  tool?: { name: string; action?: string; risk?: Risk };
  check?: { kinds?: string[]; min_brand_score?: number };
  gate?: {
    approval_kind: string;
    required_roles?: string[];
    required_count?: number;
    sla_hours?: number;
    skip_if?: string;
    on_reject?: "fail" | "goto";
    on_changes?: string;
  };
  wait?: { event?: string; match?: string; timeout?: string };
  branch?: { cases?: { if: string; goto: string }[]; else?: string };
  emit?: { event: string };
  subflow?: { workflow_id: string; per?: string };
  task?: { title?: string; assignee_roles?: string[]; due_hours?: number; done_output_schema?: string };
  retry?: { attempts?: number; backoff?: string };
  timeout?: string;
}

export interface Workflow {
  id: string;
  version: number;
  service: string;
  description?: string;
  trigger?: { event?: string; cron?: string; manual?: boolean };
  inputs?: { properties?: Record<string, { default?: unknown }> };
  steps: Step[];
}

export type StepStatus = "pending" | "running" | "waiting" | "retry" | "succeeded" | "skipped" | "not_taken" | "failed" | "cancelled";
export type RunStatus = "running" | "waiting_approval" | "waiting_event" | "succeeded" | "failed" | "cancelled";

export interface WaitInfo {
  kind: "event" | "timer" | "approval" | "task" | "children" | "retry";
  /** Event name for kind 'event'. */
  event?: string;
  match?: string;
  /** ISO time. The wait ends (times out) or the retry starts at this time. */
  deadline?: string;
  approval_id?: string;
  children?: string[];
}

export interface StepState {
  status: StepStatus;
  /** Attempts of the current pass (retries). */
  attempt: number;
  /** How many times the step started in this run (loops). */
  runs: number;
  output?: unknown;
  error?: string;
  timed_out?: boolean;
  /** For a branch: the step ids it chose. */
  chosen?: string[];
  /** Set when a loop sends the run back to this step. The step then starts without a join. */
  forced?: boolean;
  /** Reviewer feedback from a gate that asked for changes. The step handler gets it. */
  feedback?: { gate: string; decision: string; comment?: string; edits?: unknown };
  wait?: WaitInfo;
  started_at?: string;
  ended_at?: string;
  warnings?: string[];
}

/** One row of step_runs: 1 attempt of 1 step. */
export interface StepRunRecord {
  step_id: string;
  type: StepType;
  attempt: number;
  status: "succeeded" | "failed" | "skipped" | "waiting";
  output?: unknown;
  error?: string;
  started_at: string;
  ended_at?: string;
}

export interface EngineEvent {
  id?: string;
  name: string;
  data: Record<string, unknown>;
  client_id?: string;
  at?: string;
}

export interface RunState {
  id: string;
  client_id: string;
  workflow_id: string;
  workflow_version: number;
  service: string;
  markets: string[];
  parent?: { run_id: string; step_id: string };
  status: RunStatus;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  started_by: string;
  started_at: string;
  ended_at?: string;
  trigger_event?: EngineEvent;
  steps: Record<string, StepState>;
  history: StepRunRecord[];
  /** Earliest time at which tick() must look at this run. Set on save. */
  next_wake_at?: string | null;
  /** Event names this run waits for. Set on save. */
  waiting_events: string[];
}

export interface Decision {
  decided_by: string;
  role: string;
  decision: "approved" | "rejected" | "changes_requested";
  comment?: string;
  edits?: unknown;
  at: string;
}

/** An approval inbox item. Follows engine/contracts/schemas/approval-item.json. */
export interface Approval {
  id: string;
  client_id: string;
  run_id: string;
  step_id: string;
  service: string;
  kind: string;
  title: string;
  summary?: string;
  payload: Record<string, unknown>;
  required_roles: string[];
  required_count: number;
  priority: "low" | "normal" | "high" | "urgent";
  sla_due_at: string;
  status: "open" | "approved" | "rejected" | "changes_requested" | "expired" | "cancelled";
  decisions: Decision[];
  overdue_sent?: boolean;
  created_at: string;
  closed_at?: string;
}

/** One row of agent_actions. */
export interface ActionRecord {
  client_id: string;
  run_id: string;
  step_id: string;
  actor: string;
  action: string;
  target?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  allowed: boolean;
  guardrail?: string;
  detail?: Record<string, unknown>;
  at: string;
}

/** Who calls the engine. Only a user can decide an approval. */
export interface Actor {
  kind: "user" | "service";
  id: string;
  roles: string[];
}

export interface StepContext {
  run: RunState;
  workflow: Workflow;
  step: Step;
  attempt: number;
  /** Outputs of the steps this step needs, by step id. */
  inputs: Record<string, unknown>;
  feedback?: StepState["feedback"];
  /** Stable for 1 pass of 1 step. A provider must not do the same send, spend, signature or payment 2 times for 1 key. */
  idempotency_key: string;
  now: Date;
}

export interface AgentResult {
  output: unknown;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
}

export interface CheckResult {
  outcome: "pass" | "warn" | "block";
  brand_score?: number;
  reasons?: string[];
  [key: string]: unknown;
}

/**
 * The work the runner does not do itself. An error with safe_to_retry = true tells the runner
 * that the provider did not accept the call, so a send, spend, sign or pay step may try again.
 */
export interface Handlers {
  agent(ctx: StepContext): Promise<AgentResult>;
  tool(ctx: StepContext): Promise<unknown>;
  check(ctx: StepContext): Promise<CheckResult>;
  /** G1 exception: is this spend inside the client's spend_policies? Default: no. */
  spendPolicy?(ctx: StepContext): Promise<{ allowed: boolean; reason?: string }>;
  /** Data for the `client` and `brain` names in expressions. */
  context?(run: RunState): Promise<{ client?: Record<string, unknown>; brain?: Record<string, unknown> }>;
}

export interface RunFilter {
  client_id?: string;
  service?: string;
  status?: string;
  workflow_id?: string;
  limit?: number;
}

export interface ApprovalFilter {
  client_id?: string;
  status?: string;
  kind?: string;
  service?: string;
  role?: string;
  run_id?: string;
}

/** Storage port. MemoryStore keeps everything in the process; PgStore uses engine/db. */
export interface Store {
  putWorkflow(wf: Workflow): Promise<void>;
  getWorkflow(id: string, version?: number): Promise<Workflow | undefined>;
  listWorkflows(): Promise<Workflow[]>;
  saveRun(run: RunState): Promise<void>;
  getRun(id: string): Promise<RunState | undefined>;
  listRuns(filter?: RunFilter): Promise<RunState[]>;
  /** Ids of active runs that wait for this event name. */
  runsWaitingFor(event: string): Promise<string[]>;
  /** Ids of active runs whose next_wake_at is at or before `now`. */
  runsDue(now: Date): Promise<string[]>;
  saveApproval(a: Approval): Promise<void>;
  getApproval(id: string): Promise<Approval | undefined>;
  listApprovals(filter?: ApprovalFilter): Promise<Approval[]>;
  logAction(a: ActionRecord): Promise<void>;
  listActions(run_id: string): Promise<ActionRecord[]>;
  logEvent(e: EngineEvent): Promise<void>;
  listEvents(filter?: { name?: string; run_id?: string; limit?: number }): Promise<EngineEvent[]>;
}

/** An error with an HTTP status: 403 forbidden, 404 not found, 409 conflict, 422 invalid definition. */
export class EngineError extends Error {
  status: number;
  details?: string[];
  constructor(status: number, message: string, details?: string[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
