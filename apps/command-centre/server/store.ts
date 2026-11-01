// In-memory store with test data. It applies the same rules as the engine specs
// (specs/workflow.md, specs/approval-inbox.md) so the UI behaves as it will on the real engine.
// Replace this file with an engine API client when the engine runs (see README).

import { catalog, marketGroupOf, SERVICES, serviceInfo, workflowById } from "./catalog.js";
import { seedClients, seedUsers } from "./seed.js";
import type {
  ApprovalItem, AuditEntry, Client, Decision, MetricRow, Overview, Run, RunStatus,
  ServiceCode, StepRun, User, WorkflowDef, WorkflowStep,
} from "./types.js";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// approval-inbox.md §4: only these kinds may skip (data_change has 1 narrow rule, not simulated here).
const SKIPPABLE_KINDS = new Set(["copy", "creative", "content", "template"]);
// Tool risks that a crisis pause holds. "remove" is never blocked (G10); read and write_internal reach no one.
const HELD_RISKS = new Set(["send", "write_external", "spend", "sign", "pay"]);
const MONEY_KPIS = new Set(Object.entries(catalog.kpis).filter(([, u]) => u === "money").map(([k]) => k));

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StoreOptions {
  now?: number;
  seed?: number;
}

export class Store {
  clients: Client[] = [];
  users: User[] = [];
  runs: Run[] = [];
  approvals: ApprovalItem[] = [];
  metrics: MetricRow[] = [];
  audit: AuditEntry[] = [];
  /** Called when an approval with no run (a strategy plan, a video project) closes. */
  approvalHooks: Array<(item: ApprovalItem) => void> = [];
  private rand: () => number;
  private fixedNow: number | null;

  constructor(opts: StoreOptions = {}) {
    this.fixedNow = opts.now ?? null;
    this.rand = rng(opts.seed ?? 20261101);
    this.users = seedUsers();
    this.clients = seedClients(() => this.uuid());
    this.seedMetrics();
    this.seedRuns();
  }

  now(): number {
    return this.fixedNow ?? Date.now();
  }

  private iso(t: number) {
    return new Date(t).toISOString();
  }

  uuid(): string {
    const h = () => Math.floor(this.rand() * 0x10000).toString(16).padStart(4, "0");
    return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`;
  }

  private pick<T>(xs: T[]): T {
    return xs[Math.floor(this.rand() * xs.length)];
  }

  // ---------- lookups ----------

  user(id: string | undefined): User {
    const u = this.users.find((x) => x.id === id) ?? this.users[0];
    return u;
  }

  client(id: string): Client {
    const c = this.clients.find((x) => x.id === id);
    if (!c) throw new ApiError(404, "Client not found");
    return c;
  }

  run(id: string): Run {
    const r = this.runs.find((x) => x.id === id);
    if (!r) throw new ApiError(404, "Run not found");
    return r;
  }

  approval(id: string): ApprovalItem {
    const a = this.approvals.find((x) => x.id === id);
    if (!a) throw new ApiError(404, "Approval not found");
    return a;
  }

  isOverdue(a: ApprovalItem): boolean {
    return a.status === "open" && Date.parse(a.sla_due_at) < this.now();
  }

  log(actor: string, action: string, client_id: string | null, target: string | null, detail: string) {
    this.audit.unshift({ id: this.uuid(), at: this.iso(this.now()), actor, action, client_id, target, detail });
  }

  // ---------- runs ----------

  startRun(input: { client_id: string; workflow_id: string; markets?: string[] }, actor: User): Run {
    const client = this.client(input.client_id);
    const wf = workflowById(input.workflow_id);
    if (!wf) throw new ApiError(404, `Workflow ${input.workflow_id} not found`);
    if (!client.services.includes(wf.service)) {
      throw new ApiError(422, `${client.name} does not buy ${serviceInfo(wf.service).name}. Add the service to the client first.`);
    }
    const markets = input.markets && input.markets.length ? input.markets : client.markets;
    const bad = markets.filter((m) => !client.markets.includes(m));
    if (bad.length) throw new ApiError(422, `Markets not in the client's markets: ${bad.join(", ")}`);
    const run = this.createRun(client, wf, markets, this.now(), actor.name);
    this.log(actor.name, "run.started", client.id, run.id, `${wf.id} for ${markets.join(", ")}`);
    this.advance(run, this.now());
    return run;
  }

  private createRun(client: Client, wf: WorkflowDef, markets: string[], at: number, by: string): Run {
    const run: Run = {
      id: this.uuid(),
      client_id: client.id,
      workflow_id: wf.id,
      version: wf.version,
      service: wf.service,
      status: "running",
      markets,
      started_at: this.iso(at),
      updated_at: this.iso(at),
      finished_at: null,
      triggered_by: by,
      cost_usd: 0,
      steps: wf.steps.map((s) => ({
        id: s.id, type: s.type, name: s.name, status: "pending", started_at: null, finished_at: null,
        note: null, approval_id: null, risk: s.tool?.risk ?? null,
      })),
    };
    this.runs.unshift(run);
    return run;
  }

  /** Moves a run forward until it needs a person, an event, or ends. */
  advance(run: Run, at: number, opts: { skipGates?: boolean } = {}) {
    const wf = workflowById(run.workflow_id)!;
    const client = this.client(run.client_id);
    for (let i = 0; i < run.steps.length; i++) {
      const st = run.steps[i];
      if (st.status === "succeeded" || st.status === "skipped") continue;
      if (st.status === "waiting" || st.status === "held") return;
      if (st.status === "failed" || st.status === "cancelled") return;
      const def = wf.steps[i];
      st.started_at ??= this.iso(at);
      if (def.type === "gate" && def.gate) {
        if (def.gate.skip_if && SKIPPABLE_KINDS.has(def.gate.approval_kind) && opts.skipGates) {
          this.finishStep(st, "skipped", at, "Skip rule true: reused approved template, no new claims");
          continue;
        }
        const item = this.openApproval(run, def, at, client);
        st.status = "waiting";
        st.approval_id = item.id;
        st.note = `Waiting for ${def.gate.approval_kind} approval`;
        this.setStatus(run, "waiting_approval", at);
        return;
      }
      if (def.type === "tool" && def.tool && HELD_RISKS.has(def.tool.risk) && client.paused) {
        st.status = "held";
        st.note = `Held: ${client.name} is paused (crisis). Risk ${def.tool.risk} needs the client resumed.`;
        this.setStatus(run, "waiting_event", at);
        return;
      }
      if (def.type === "wait" || def.type === "task") {
        st.status = "waiting";
        st.note = def.type === "wait" ? "Waiting for an event or a time" : "Waiting for a person to finish a task";
        this.setStatus(run, "waiting_event", at);
        return;
      }
      if (def.type === "agent") run.cost_usd = round2(run.cost_usd + 0.04 + this.rand() * 0.3);
      this.finishStep(st, "succeeded", at, def.tool ? `${def.tool.name}.${def.tool.action}` : null);
    }
    this.setStatus(run, "succeeded", at);
    run.finished_at = this.iso(at);
  }

  private finishStep(st: StepRun, status: StepRun["status"], at: number, note: string | null) {
    st.status = status;
    st.started_at ??= this.iso(at);
    st.finished_at = this.iso(at);
    if (note !== null) st.note = note;
  }

  private setStatus(run: Run, status: RunStatus, at: number) {
    run.status = status;
    run.updated_at = this.iso(at);
  }

  continueRun(runId: string, actor: User): Run {
    const run = this.run(runId);
    const st = run.steps.find((s) => s.status === "waiting" || s.status === "held");
    if (!st) throw new ApiError(409, "Run is not waiting for an event or a task");
    if (st.type === "gate") throw new ApiError(409, "This step waits for an approval. Decide it in the approval inbox.");
    const client = this.client(run.client_id);
    if (st.status === "held" && client.paused) throw new ApiError(409, `${client.name} is paused. Resume the client first.`);
    const at = this.now();
    if (st.status === "held") {
      st.status = "pending";
    } else {
      this.finishStep(st, "succeeded", at, st.type === "task" ? `Task marked done by ${actor.name}` : `Event received (sent by ${actor.name})`);
    }
    this.log(actor.name, "run.continued", run.client_id, run.id, `step ${st.id}`);
    this.setStatus(run, "running", at);
    this.advance(run, at);
    return run;
  }

  cancelRun(runId: string, actor: User): Run {
    const run = this.run(runId);
    if (["succeeded", "failed", "cancelled"].includes(run.status)) throw new ApiError(409, `Run already ${run.status}`);
    const at = this.now();
    for (const st of run.steps) {
      if (st.status !== "succeeded" && st.status !== "skipped" && st.status !== "failed") {
        st.status = "cancelled";
        st.finished_at = this.iso(at);
      }
    }
    for (const a of this.approvals) {
      if (a.run_id === run.id && a.status === "open") {
        a.status = "cancelled";
        a.closed_at = this.iso(at);
      }
    }
    this.setStatus(run, "cancelled", at);
    run.finished_at = this.iso(at);
    this.log(actor.name, "run.cancelled", run.client_id, run.id, run.workflow_id);
    return run;
  }

  // ---------- approvals ----------

  /** Opens an approval that belongs to no workflow run, for example a strategy plan or an AI video. */
  openStandaloneApproval(input: {
    client_id: string; service: ServiceCode; kind: string; title: string; summary: string; payload: Record<string, unknown>;
    required_roles: string[]; required_count?: number; sla_hours: number; brand_score?: number | null;
    compliance?: ApprovalItem["compliance"]; priority?: ApprovalItem["priority"];
  }): ApprovalItem {
    const at = this.now();
    const item: ApprovalItem = {
      id: this.uuid(), client_id: input.client_id, run_id: null, step_id: null, service: input.service, kind: input.kind,
      title: input.title, summary: input.summary, payload: input.payload, brand_score: input.brand_score ?? null,
      compliance: input.compliance ?? null, required_roles: input.required_roles, required_count: input.required_count ?? 1,
      priority: input.priority ?? "normal", sla_due_at: this.iso(at + input.sla_hours * HOUR), status: "open", decisions: [],
      created_at: this.iso(at), closed_at: null,
    };
    this.approvals.unshift(item);
    return item;
  }

  private openApproval(run: Run, def: WorkflowStep, at: number, client: Client): ApprovalItem {
    const g = def.gate!;
    const wf = workflowById(run.workflow_id)!;
    const kind = g.approval_kind;
    const currency = "GBP";
    const payload: Record<string, unknown> = {};
    if (kind === "budget" || kind === "budget_change") {
      const current = Math.round(2000 + this.rand() * 18000);
      const change = kind === "budget" ? 0.5 + this.rand() : 0.21 + this.rand() * 0.3;
      payload.platform = this.pick(["meta", "google", "linkedin", "tiktok"]);
      payload.currency = currency;
      payload.current = current;
      payload.proposed = Math.round(current * (1 + change));
      payload.change_pct = Math.round(change * 100);
    } else if (kind === "contract") {
      payload.party = this.pick(["@maya.glow (test creator)", "Northbeam Partners (test)", "Dr. Lee (test expert)"]);
      payload.fee = Math.round(800 + this.rand() * 6000);
      payload.currency = currency;
      payload.usage_rights = "Organic + paid usage, 6 months, client markets";
      payload.disclosure_terms = "#ad in the first line; platform paid-partnership label";
    } else if (kind === "payout") {
      payload.amount = Math.round(500 + this.rand() * 9000);
      payload.currency = currency;
      payload.lines = Math.round(3 + this.rand() * 20);
    } else if (kind === "claim") {
      payload.claim_text = this.pick([
        "Cuts delivery planning time by 40%",
        "Clinically shown to reduce redness in 14 days",
        "The No. 1 rated hotel group in the Gulf",
        "Saves finance teams 10 hours a week",
      ]);
      payload.category = this.pick(["performance", "health", "comparative"]);
      payload.markets = run.markets;
    }
    const creativeKinds = ["copy", "creative", "content", "script", "template", "design"];
    const brand_score = creativeKinds.includes(kind) ? Math.round(72 + this.rand() * 26) : null;
    let compliance: ApprovalItem["compliance"] = null;
    if (creativeKinds.includes(kind) || kind === "claim" || kind === "go_live") {
      const outcome = kind === "claim" ? "block" : this.rand() < 0.2 ? "warn" : "pass";
      compliance = { check_id: this.uuid(), outcome, findings_count: outcome === "pass" ? 0 : 1 + Math.floor(this.rand() * 3) };
    }
    const item: ApprovalItem = {
      id: this.uuid(),
      client_id: run.client_id,
      run_id: run.id,
      step_id: def.id,
      service: run.service,
      kind,
      title: `${labelKind(kind)}: ${def.name ?? humanize(def.id)}`,
      summary: `${client.name} · ${wf.id} · ${run.markets.join(", ")}. ${firstSentence(wf.description)}`,
      payload,
      brand_score,
      compliance,
      required_roles: g.required_roles.length ? g.required_roles : ["account_lead"],
      required_count: g.required_count,
      priority: kind === "escalation" ? "urgent" : kind === "budget" || kind === "budget_change" ? "high" : "normal",
      sla_due_at: this.iso(at + g.sla_hours * HOUR),
      status: "open",
      decisions: [],
      created_at: this.iso(at),
      closed_at: null,
    };
    this.approvals.unshift(item);
    return item;
  }

  decide(
    approvalId: string,
    input: { decision: Decision; comment?: string },
    actor: User,
    opts: { serviceToken?: boolean; at?: number } = {},
  ): ApprovalItem {
    // approval-inbox.md §6: only users can decide; service tokens get 403.
    if (opts.serviceToken) throw new ApiError(403, "Service tokens cannot decide approvals. Only a person can.");
    const item = this.approval(approvalId);
    if (item.status !== "open") throw new ApiError(409, `Approval is ${item.status}`);
    if (!["approved", "rejected", "changes_requested"].includes(input.decision)) throw new ApiError(400, "Unknown decision");
    const role = item.required_roles.find((r) => actor.roles.includes(r));
    if (!role) {
      throw new ApiError(403, `${actor.name} has none of the required roles: ${item.required_roles.join(", ")}`);
    }
    if (item.decisions.some((d) => d.decided_by === actor.id)) {
      throw new ApiError(409, `${actor.name} already decided. This item needs ${item.required_count} different people.`);
    }
    if (input.decision === "changes_requested" && !input.comment?.trim()) {
      throw new ApiError(400, "Changes requested needs a comment for the agent");
    }
    const at = opts.at ?? this.now();
    item.decisions.push({ decided_by: actor.id, role, decision: input.decision, comment: input.comment, at: this.iso(at) });
    this.log(actor.name, `approval.${input.decision}`, item.client_id, item.id, item.title);

    const approvals = item.decisions.filter((d) => d.decision === "approved").length;
    if (input.decision === "approved" && approvals < item.required_count) return item; // waits for the next person

    item.status = input.decision;
    item.closed_at = this.iso(at);
    if (!item.run_id) {
      for (const hook of this.approvalHooks) hook(item);
      return item;
    }
    const run = this.run(item.run_id);
    if (run.status !== "waiting_approval") return item;
    const idx = run.steps.findIndex((s) => s.id === item.step_id);
    const st = run.steps[idx];
    const def = workflowById(run.workflow_id)!.steps[idx];
    if (input.decision === "approved") {
      this.finishStep(st, "succeeded", at, `Approved by ${item.decisions.map((d) => d.role).join(" + ")}`);
      this.setStatus(run, "running", at);
      this.advance(run, at);
    } else if (input.decision === "rejected") {
      this.finishStep(st, "failed", at, `Rejected: ${input.comment ?? "no comment"}`);
      for (const s of run.steps.slice(idx + 1)) s.status = "cancelled";
      this.setStatus(run, "failed", at);
      run.finished_at = this.iso(at);
    } else {
      // Changes requested: back to gate.on_changes (or the step before the gate) with the comment.
      const target = def.gate?.on_changes ?? run.steps[Math.max(0, idx - 1)].id;
      const tIdx = Math.max(0, run.steps.findIndex((s) => s.id === target));
      for (const s of run.steps.slice(tIdx, idx + 1)) {
        s.status = "pending";
        s.started_at = null;
        s.finished_at = null;
        s.approval_id = null;
        s.note = null;
      }
      run.steps[tIdx].note = `Rework: ${input.comment}`;
      this.setStatus(run, "running", at);
      this.advance(run, at);
    }
    return item;
  }

  bulkApprove(ids: string[], actor: User, opts: { serviceToken?: boolean } = {}) {
    const items = ids.map((id) => this.approval(id));
    const kinds = new Set(items.map((i) => i.kind));
    if (kinds.size > 1) throw new ApiError(422, "Bulk approval works on items of one kind only");
    return items.map((i) => {
      try {
        this.decide(i.id, { decision: "approved" }, actor, opts);
        return { id: i.id, ok: true as const };
      } catch (e) {
        if (e instanceof ApiError && e.status !== 403) return { id: i.id, ok: false as const, error: e.message };
        throw e;
      }
    });
  }

  // ---------- clients ----------

  pauseClient(clientId: string, reason: string, actor: User): Client {
    const c = this.client(clientId);
    if (!reason.trim()) throw new ApiError(400, "Give a reason for the pause");
    c.paused = true;
    c.paused_reason = reason;
    const at = this.now();
    // engine action client.pause_scheduled (risk remove, never blocked by G10): hold every pending risky step.
    for (const run of this.runs.filter((r) => r.client_id === c.id)) {
      if (run.status === "running") this.advance(run, at);
    }
    this.log(actor.name, "client.pause_scheduled", c.id, c.id, reason);
    return c;
  }

  resumeClient(clientId: string, reason: string, actor: User): Client {
    const c = this.client(clientId);
    if (!c.paused) throw new ApiError(409, "Client is not paused");
    // enums.json engine_actions: client.resume_scheduled needs an escalation decision first.
    if (!actor.roles.some((r) => r === "account_lead" || r === "pith_admin")) {
      throw new ApiError(403, "Only an account lead or a Pith admin can resume a paused client");
    }
    if (!reason.trim()) throw new ApiError(400, "Record the escalation decision that allows the resume");
    c.paused = false;
    c.paused_reason = null;
    const at = this.now();
    for (const run of this.runs.filter((r) => r.client_id === c.id)) {
      const held = run.steps.find((s) => s.status === "held");
      if (held) {
        held.status = "pending";
        held.note = null;
        this.setStatus(run, "running", at);
        this.advance(run, at);
      }
    }
    this.log(actor.name, "client.resume_scheduled", c.id, c.id, reason);
    return c;
  }

  // ---------- metrics ----------

  private seedMetrics() {
    const today = startOfDay(this.now());
    const scale: Record<string, number> = { B2B: 1, B2C: 1.8 };
    for (const c of this.clients) {
      for (const code of c.services) {
        const info = serviceInfo(code);
        for (const market of c.markets) {
          const marketWeight = c.markets.indexOf(market) === 0 ? 1 : 0.45;
          const trend = 0.85 + this.rand() * 0.4;
          for (let d = 55; d >= 0; d--) {
            const date = new Date(today - d * DAY);
            const weekday = date.getUTCDay();
            const season = weekday === 0 || weekday === 6 ? 0.7 : 1.05;
            const growth = 1 + ((55 - d) / 55) * (trend - 1);
            for (const kpi of info.kpis) {
              const base = baseFor(kpi) * scale[c.model] * marketWeight;
              const v = base * season * growth * (0.8 + this.rand() * 0.4);
              this.metrics.push({
                date: date.toISOString().slice(0, 10), client_id: c.id, service: code, market, kpi,
                value: MONEY_KPIS.has(kpi) ? round2(v) : Math.round(v),
              });
            }
          }
        }
      }
    }
  }

  queryMetrics(q: { client_id?: string; service?: string; market?: string; kpi?: string[]; from?: string; to?: string; group_by?: string }) {
    const rows = this.metrics.filter((m) =>
      (!q.client_id || m.client_id === q.client_id) &&
      (!q.service || m.service === q.service) &&
      (!q.market || m.market === q.market) &&
      (!q.kpi?.length || q.kpi.includes(m.kpi)) &&
      (!q.from || m.date >= q.from) &&
      (!q.to || m.date <= q.to));
    const by = q.group_by ?? "date";
    if (!["date", "service", "market", "client_id", "kpi"].includes(by)) throw new ApiError(400, "group_by must be date, service, market, client_id or kpi");
    const out = new Map<string, Record<string, number | string>>();
    for (const r of rows) {
      const key = String(r[by as keyof MetricRow]);
      const row = out.get(key) ?? { [by]: key };
      row[r.kpi] = round2(((row[r.kpi] as number) ?? 0) + r.value);
      out.set(key, row);
    }
    return [...out.values()].sort((a, b) => String(a[by]).localeCompare(String(b[by])));
  }

  // ---------- overview ----------

  overview(clientId?: string): Overview {
    const now = this.now();
    const today = startOfDay(now);
    const d = (n: number) => new Date(today - n * DAY).toISOString().slice(0, 10);
    const sum = (from: string, to: string) => {
      const t = { spend: 0, revenue: 0, leads: 0, conversions: 0, roas: 0 };
      for (const m of this.metrics) {
        if (m.date < from || m.date > to) continue;
        if (clientId && m.client_id !== clientId) continue;
        if (m.kpi === "spend") t.spend += m.value;
        if (m.kpi === "revenue") t.revenue += m.value;
        if (m.kpi === "leads") t.leads += m.value;
        if (m.kpi === "conversions") t.conversions += m.value;
      }
      t.roas = t.spend ? round2(t.revenue / t.spend) : 0;
      t.spend = Math.round(t.spend);
      t.revenue = Math.round(t.revenue);
      return t;
    };
    const runs = this.runs.filter((r) => !clientId || r.client_id === clientId);
    const approvals = this.approvals.filter((a) => a.status === "open" && (!clientId || a.client_id === clientId));
    const runCounts = { running: 0, waiting_approval: 0, waiting_event: 0, succeeded: 0, failed: 0, cancelled: 0 } as Record<RunStatus, number>;
    for (const r of runs) runCounts[r.status]++;
    const weekAgo = now - 7 * DAY;
    const services = SERVICES.map((s) => {
      const sr = runs.filter((r) => r.service === s.code);
      const sa = approvals.filter((a) => a.service === s.code);
      const failed = sr.filter((r) => r.status === "failed" && Date.parse(r.updated_at) > weekAgo).length;
      const overdue = sa.filter((a) => this.isOverdue(a)).length;
      const health: "good" | "watch" | "action" = overdue > 0 || failed > 1 ? "action" : failed > 0 || sa.length > 3 ? "watch" : "good";
      return {
        code: s.code, name: s.name, number: s.number,
        runs_active: sr.filter((r) => ["running", "waiting_approval", "waiting_event"].includes(r.status)).length,
        runs_failed_7d: failed, approvals_open: sa.length, approvals_overdue: overdue, health,
      };
    });
    const daily: Overview["daily"] = [];
    for (let i = 27; i >= 0; i--) {
      const date = d(i);
      let spend = 0, revenue = 0, leads = 0;
      for (const m of this.metrics) {
        if (m.date !== date || (clientId && m.client_id !== clientId)) continue;
        if (m.kpi === "spend") spend += m.value;
        if (m.kpi === "revenue") revenue += m.value;
        if (m.kpi === "leads") leads += m.value;
      }
      daily.push({ date, spend: Math.round(spend), revenue: Math.round(revenue), leads: Math.round(leads) });
    }
    const attention: Overview["attention"] = [];
    for (const c of this.clients.filter((x) => x.paused && (!clientId || x.id === clientId))) {
      attention.push({ kind: "client", id: c.id, title: `${c.name} is paused`, detail: c.paused_reason ?? "", severity: "action" });
    }
    for (const a of approvals.filter((x) => x.priority === "urgent" || this.isOverdue(x)).slice(0, 8)) {
      attention.push({
        kind: "approval", id: a.id, title: a.title,
        detail: `${this.client(a.client_id).name} · ${this.isOverdue(a) ? "overdue" : "urgent"}`, severity: "action",
      });
    }
    for (const r of runs.filter((x) => x.status === "failed").slice(0, 5)) {
      const st = r.steps.find((s) => s.status === "failed");
      attention.push({ kind: "run", id: r.id, title: `${r.workflow_id} failed`, detail: `${this.client(r.client_id).name} · ${st?.note ?? ""}`, severity: "watch" });
    }
    return {
      totals: sum(d(27), d(0)),
      previous: sum(d(55), d(28)),
      approvals: {
        open: approvals.length,
        overdue: approvals.filter((a) => this.isOverdue(a)).length,
        urgent: approvals.filter((a) => a.priority === "urgent").length,
        due_24h: approvals.filter((a) => !this.isOverdue(a) && Date.parse(a.sla_due_at) - now < DAY).length,
      },
      runs: runCounts,
      services,
      daily,
      attention,
    };
  }

  // ---------- seed runs ----------

  private seedRuns() {
    const now = this.now();
    const seeder = this.users[0];
    const clientApprover = this.users[1];
    for (const c of this.clients) {
      for (const code of c.services) {
        const wfs = catalog.workflows.filter((w) => w.service === code);
        const n = Math.min(wfs.length, 2 + Math.floor(this.rand() * 3));
        const chosen = [...wfs].sort(() => this.rand() - 0.5).slice(0, n);
        for (const wf of chosen) {
          const startedAgo = (2 + this.rand() * 160) * HOUR;
          const at = now - startedAgo;
          const run = this.createRun(c, wf, c.markets.slice(0, 1 + Math.floor(this.rand() * c.markets.length)), at, wf.trigger.cron ? "schedule" : wf.trigger.event ? `event ${wf.trigger.event}` : "Boss");
          const outcome = this.rand();
          // Advance the run through 0 to n gates with seed approvals, so the inbox and the runs show every state.
          let gatesToPass = outcome < 0.3 ? 99 : Math.floor(this.rand() * 3);
          let t = at;
          this.advance(run, t, { skipGates: this.rand() < 0.5 });
          while (gatesToPass > 0 && !["succeeded", "failed", "cancelled"].includes(run.status)) {
            t += this.rand() * (startedAgo / 6);
            const st = run.steps.find((s) => s.status === "waiting" || s.status === "held")!;
            if (st.approval_id) {
              const item = this.approval(st.approval_id);
              for (const u of [seeder, clientApprover]) {
                if (item.status !== "open") break;
                if (item.required_roles.some((r) => u.roles.includes(r))) {
                  this.decide(item.id, { decision: "approved" }, u, { at: t });
                }
              }
              if (item.status === "open") break;
              gatesToPass--;
            } else {
              this.finishStep(st, "succeeded", t, st.type === "task" ? "Task done" : "Event received");
              this.setStatus(run, "running", t);
              this.advance(run, t, { skipGates: this.rand() < 0.5 });
            }
          }
          if (outcome > 0.93 && !["succeeded", "cancelled"].includes(run.status)) this.seedFailure(run, t);
        }
      }
    }
    // Spread SLAs so the inbox has overdue, due-soon and later items.
    for (const a of this.approvals.filter((x) => x.status === "open")) {
      const r = this.rand();
      const created = r < 0.25 ? now - (60 + this.rand() * 40) * HOUR : now - this.rand() * 20 * HOUR;
      a.created_at = this.iso(created);
      const gate = workflowById(this.run(a.run_id!).workflow_id)!.steps.find((s) => s.id === a.step_id)!.gate!;
      a.sla_due_at = this.iso(created + gate.sla_hours * HOUR);
    }
    this.runs.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    this.audit = [];
  }

  private seedFailure(run: Run, at: number) {
    const st = run.steps.find((s) => s.status === "waiting" || s.status === "held" || s.status === "pending");
    if (!st) return;
    for (const a of this.approvals) if (a.run_id === run.id && a.status === "open") { a.status = "cancelled"; a.closed_at = this.iso(at); }
    st.status = "failed";
    st.note = this.pick([
      "Provider API returned 503 after 3 attempts",
      "Compliance check: block (claim not in approved_claims for this market)",
      "Guardrail G5: recipients did not come from audiences.resolve",
      "Brand score 64 is under the step minimum 80 after 2 rewrites",
    ]);
    st.finished_at = this.iso(at);
    this.setStatus(run, "failed", at);
    run.finished_at = this.iso(at);
  }
}

function startOfDay(t: number) {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function baseFor(kpi: string): number {
  const table: Record<string, number> = {
    sends: 4200, clicks: 380, revenue: 2600, spend: 900, conversions: 34, impressions: 21000, follower_growth: 40,
    organic_sessions_nonbrand: 820, reach: 15000, pages_published: 0.4, sessions: 950, leads: 22, meetings_booked: 1.3,
    opportunities: 0.8, pipeline_value: 9000, mqls: 9, sqls: 3, attributed_revenue: 3100, media_mentions_tier1: 0.3,
    payout_amount: 260, registrations: 18, attendees: 9, review_count: 6, ugc_reuse_count: 1.2,
  };
  return table[kpi] ?? 10;
}

export function labelKind(kind: string) {
  const map: Record<string, string> = {
    go_live: "Go live", budget_change: "Budget change", test_winner: "Test winner", data_change: "Data change",
  };
  return map[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1);
}

function humanize(id: string) {
  const s = id.replace(/[_.-]+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function firstSentence(s: string) {
  const m = s.match(/^[^.]*\.?/);
  return (m?.[0] ?? s).slice(0, 160);
}

export { marketGroupOf };
export type { ServiceCode };
