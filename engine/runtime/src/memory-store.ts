// A store that keeps everything in the process. For tests, the simulator and local development.
import type { ActionRecord, Approval, ApprovalFilter, EngineEvent, RunFilter, RunState, Store, Workflow } from "./types.ts";

const copy = <T>(v: T): T => structuredClone(v);
const ACTIVE = ["running", "waiting_approval", "waiting_event"];

export class MemoryStore implements Store {
  private workflows = new Map<string, Workflow[]>();
  private runs = new Map<string, RunState>();
  private approvals = new Map<string, Approval>();
  readonly actions: ActionRecord[] = [];
  readonly events: EngineEvent[] = [];

  async putWorkflow(wf: Workflow): Promise<void> {
    const list = (this.workflows.get(wf.id) ?? []).filter((w) => w.version !== wf.version);
    this.workflows.set(wf.id, [...list, copy(wf)].sort((a, b) => a.version - b.version));
  }
  async getWorkflow(id: string, version?: number): Promise<Workflow | undefined> {
    const list = this.workflows.get(id) ?? [];
    return version == null ? list.at(-1) : list.find((w) => w.version === version);
  }
  async listWorkflows(): Promise<Workflow[]> {
    return [...this.workflows.values()].map((l) => l.at(-1)!);
  }
  async saveRun(run: RunState): Promise<void> {
    this.runs.set(run.id, copy(run));
  }
  async getRun(id: string): Promise<RunState | undefined> {
    const r = this.runs.get(id);
    return r && copy(r);
  }
  async listRuns(f: RunFilter = {}): Promise<RunState[]> {
    const all = [...this.runs.values()].filter(
      (r) => (!f.client_id || r.client_id === f.client_id) && (!f.service || r.service === f.service) && (!f.status || r.status === f.status) && (!f.workflow_id || r.workflow_id === f.workflow_id),
    );
    return all.sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, f.limit ?? 200).map(copy);
  }
  async runsWaitingFor(event: string): Promise<string[]> {
    return [...this.runs.values()].filter((r) => ACTIVE.includes(r.status) && r.waiting_events.includes(event)).map((r) => r.id);
  }
  async runsDue(now: Date): Promise<string[]> {
    return [...this.runs.values()].filter((r) => ACTIVE.includes(r.status) && r.next_wake_at && Date.parse(r.next_wake_at) <= now.getTime()).map((r) => r.id);
  }
  async saveApproval(a: Approval): Promise<void> {
    this.approvals.set(a.id, copy(a));
  }
  async getApproval(id: string): Promise<Approval | undefined> {
    const a = this.approvals.get(id);
    return a && copy(a);
  }
  async listApprovals(f: ApprovalFilter = {}): Promise<Approval[]> {
    return [...this.approvals.values()]
      .filter(
        (a) =>
          (!f.client_id || a.client_id === f.client_id) && (!f.status || a.status === f.status) && (!f.kind || a.kind === f.kind) &&
          (!f.service || a.service === f.service) && (!f.role || a.required_roles.includes(f.role)) && (!f.run_id || a.run_id === f.run_id),
      )
      .sort((a, b) => a.sla_due_at.localeCompare(b.sla_due_at))
      .map(copy);
  }
  async logAction(a: ActionRecord): Promise<void> {
    this.actions.push(copy(a));
  }
  async listActions(run_id: string): Promise<ActionRecord[]> {
    return this.actions.filter((a) => a.run_id === run_id).map(copy);
  }
  async logEvent(e: EngineEvent): Promise<void> {
    this.events.push(copy(e));
  }
  async listEvents(f: { name?: string; run_id?: string; limit?: number } = {}): Promise<EngineEvent[]> {
    return this.events.filter((e) => (!f.name || e.name === f.name) && (!f.run_id || e.data.run_id === f.run_id)).slice(-(f.limit ?? 500)).map(copy);
  }
}
