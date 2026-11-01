import { describe, expect, it } from "vitest";
import { catalog, SERVICES } from "../server/catalog.js";
import { ApiError, Store } from "../server/store.js";

const NOW = Date.UTC(2026, 10, 1, 12);
const fresh = () => new Store({ now: NOW, seed: 7 });
const boss = (s: Store) => s.user("u-boss");
const client = (s: Store) => s.user("u-client");
const analyst = (s: Store) => s.user("u-analyst");

function expectApiError(fn: () => unknown, status: number) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).status).toBe(status);
    return;
  }
  throw new Error(`expected ApiError ${status}`);
}

describe("catalog", () => {
  it("loads all 18 services and every workflow file from the repo", () => {
    expect(SERVICES).toHaveLength(18);
    expect(catalog.workflows.length).toBeGreaterThanOrEqual(100);
    for (const s of SERVICES) expect(s.workflow_count, s.code).toBeGreaterThan(0);
  });
  it("uses only canonical KPI codes from enums.json", () => {
    for (const s of SERVICES) for (const k of s.kpis) expect(catalog.kpis[k], `${s.code}.${k}`).toBeDefined();
  });
  it("uses only approval kinds and roles from enums.json in gates", () => {
    for (const w of catalog.workflows)
      for (const st of w.steps)
        if (st.gate) {
          expect(catalog.approval_kinds, `${w.id}.${st.id}`).toContain(st.gate.approval_kind);
          for (const r of st.gate.required_roles) expect(catalog.roles, `${w.id}.${st.id}`).toContain(r);
        }
  });
});

describe("seed", () => {
  it("covers every service with at least 1 test client and marks clients as test data", () => {
    const s = fresh();
    for (const sv of SERVICES) expect(s.clients.some((c) => c.services.includes(sv.code)), sv.code).toBe(true);
    for (const c of s.clients) expect(c.name).toMatch(/\(test\)$/);
  });
  it("is deterministic for a seed", () => {
    expect(JSON.stringify(fresh().overview())).toBe(JSON.stringify(fresh().overview()));
  });
  it("links every open approval to a run that waits on it", () => {
    const s = fresh();
    for (const a of s.approvals.filter((x) => x.status === "open")) {
      const run = s.run(a.run_id!);
      expect(run.status).toBe("waiting_approval");
      expect(run.steps.find((st) => st.id === a.step_id)?.approval_id).toBe(a.id);
    }
  });
});

function startUntilGate(s: Store, wfId: string, kind?: string) {
  const wf = catalog.workflows.find((w) => w.id === wfId)!;
  const c = s.clients.find((x) => x.services.includes(wf.service))!;
  const run = s.startRun({ client_id: c.id, workflow_id: wf.id }, boss(s));
  const item = s.approvals.find((a) => a.run_id === run.id && a.status === "open" && (!kind || a.kind === kind));
  return { run, item, client: c };
}

describe("approvals (specs/approval-inbox.md)", () => {
  it("rejects a decision from a service token with 403", () => {
    const s = fresh();
    const a = s.approvals.find((x) => x.status === "open")!;
    expectApiError(() => s.decide(a.id, { decision: "approved" }, boss(s), { serviceToken: true }), 403);
  });

  it("rejects a user without a required role with 403", () => {
    const s = fresh();
    const a = s.approvals.find((x) => x.status === "open" && !x.required_roles.includes("analytics_lead"))!;
    expectApiError(() => s.decide(a.id, { decision: "approved" }, analyst(s)), 403);
  });

  it("needs a comment for changes requested", () => {
    const s = fresh();
    const a = s.approvals.find((x) => x.status === "open" && x.required_roles.some((r) => boss(s).roles.includes(r)))!;
    expectApiError(() => s.decide(a.id, { decision: "changes_requested" }, boss(s)), 400);
  });

  it("approving a gate moves the run past it", () => {
    const s = fresh();
    const { run, item } = startUntilGate(s, "email.monthly_calendar");
    expect(run.status).toBe("waiting_approval");
    const who = item!.required_roles.some((r) => boss(s).roles.includes(r)) ? boss(s) : client(s);
    s.decide(item!.id, { decision: "approved" }, who);
    const gate = run.steps.find((st) => st.id === item!.step_id)!;
    expect(gate.status).toBe("succeeded");
    expect(item!.status).toBe("approved");
    expect(["running", "waiting_approval", "waiting_event", "succeeded"]).toContain(run.status);
  });

  it("required_count 2 needs 2 different people", () => {
    const s = fresh();
    const wf = catalog.workflows.find((w) => w.steps.some((st) => (st.gate?.required_count ?? 1) > 1));
    expect(wf, "a workflow with a 2-person gate").toBeDefined();
    const c = s.clients.find((x) => x.services.includes(wf!.service))!;
    const run = s.startRun({ client_id: c.id, workflow_id: wf!.id }, boss(s));
    // Walk the run to the 2-person gate.
    for (let i = 0; i < 40; i++) {
      const open = s.approvals.find((a) => a.run_id === run.id && a.status === "open");
      if (open && open.required_count > 1) {
        const first = open.required_roles.some((r) => boss(s).roles.includes(r)) ? boss(s) : client(s);
        const second = first === boss(s) ? client(s) : boss(s);
        s.decide(open.id, { decision: "approved" }, first);
        expect(open.status).toBe("open");
        expectApiError(() => s.decide(open.id, { decision: "approved" }, first), 409);
        if (open.required_roles.some((r) => second.roles.includes(r))) {
          s.decide(open.id, { decision: "approved" }, second);
          expect(open.status).toBe("approved");
        }
        return;
      }
      if (open) {
        const who = open.required_roles.some((r) => boss(s).roles.includes(r)) ? boss(s) : client(s);
        s.decide(open.id, { decision: "approved" }, who);
      } else if (run.status === "waiting_event") {
        s.continueRun(run.id, boss(s));
      } else break;
    }
    throw new Error("did not reach the 2-person gate");
  });

  it("changes requested sends the run back to gate.on_changes and opens a new item", () => {
    const s = fresh();
    const { run, item } = startUntilGate(s, "email.monthly_calendar");
    const wf = catalog.workflows.find((w) => w.id === run.workflow_id)!;
    const gate = wf.steps.find((st) => st.id === item!.step_id)!;
    const who = item!.required_roles.some((r) => boss(s).roles.includes(r)) ? boss(s) : client(s);
    s.decide(item!.id, { decision: "changes_requested", comment: "Shorter subject lines" }, who);
    expect(item!.status).toBe("changes_requested");
    const target = run.steps.find((st) => st.id === (gate.gate!.on_changes ?? ""));
    if (target) expect(target.note ?? "").toContain("Shorter subject lines");
    const reopened = s.approvals.find((a) => a.run_id === run.id && a.status === "open" && a.step_id === item!.step_id);
    expect(reopened).toBeDefined();
    expect(reopened!.id).not.toBe(item!.id);
  });

  it("reject fails the run", () => {
    const s = fresh();
    const { run, item } = startUntilGate(s, "email.monthly_calendar");
    const who = item!.required_roles.some((r) => boss(s).roles.includes(r)) ? boss(s) : client(s);
    s.decide(item!.id, { decision: "rejected", comment: "Wrong month" }, who);
    expect(run.status).toBe("failed");
  });

  it("bulk approval refuses mixed kinds", () => {
    const s = fresh();
    const open = s.approvals.filter((a) => a.status === "open");
    const a = open[0];
    const b = open.find((x) => x.kind !== a.kind)!;
    expectApiError(() => s.bulkApprove([a.id, b.id], boss(s)), 422);
  });

  it("never auto-skips budget, contract, payout, claim or escalation gates", () => {
    const s = fresh();
    for (const r of s.runs) {
      const wf = catalog.workflows.find((w) => w.id === r.workflow_id)!;
      r.steps.forEach((st, i) => {
        const kind = wf.steps[i].gate?.approval_kind;
        if (st.status === "skipped") expect(["copy", "creative", "content", "template"]).toContain(kind);
      });
    }
  });
});

describe("runs", () => {
  it("refuses a workflow for a service the client does not buy", () => {
    const s = fresh();
    const c = s.clients[0];
    const wf = catalog.workflows.find((w) => !c.services.includes(w.service))!;
    expectApiError(() => s.startRun({ client_id: c.id, workflow_id: wf.id }, boss(s)), 422);
  });
  it("refuses markets outside the client's markets", () => {
    const s = fresh();
    const c = s.clients[0];
    const wf = catalog.workflows.find((w) => w.service === c.services[0])!;
    expectApiError(() => s.startRun({ client_id: c.id, workflow_id: wf.id, markets: ["JP"] }, boss(s)), 422);
  });
  it("cancel closes the run's open approvals", () => {
    const s = fresh();
    const { run, item } = startUntilGate(s, "email.monthly_calendar");
    s.cancelRun(run.id, boss(s));
    expect(run.status).toBe("cancelled");
    expect(item!.status).toBe("cancelled");
    expectApiError(() => s.cancelRun(run.id, boss(s)), 409);
  });
});

describe("crisis pause (engine client.pause_scheduled, G10)", () => {
  it("holds send, publish and spend steps while paused and releases them on resume", () => {
    const s = fresh();
    const wf = catalog.workflows.find((w) => w.id === "email.campaign_send")!;
    const c = s.clients.find((x) => x.services.includes("email"))!;
    s.pauseClient(c.id, "Product recall", boss(s));
    const run = s.startRun({ client_id: c.id, workflow_id: wf.id }, boss(s));
    for (let i = 0; i < 30 && run.status !== "succeeded"; i++) {
      const open = s.approvals.find((a) => a.run_id === run.id && a.status === "open");
      if (open) {
        const who = open.required_roles.some((r) => boss(s).roles.includes(r)) ? boss(s) : client(s);
        s.decide(open.id, { decision: "approved" }, who);
        continue;
      }
      const held = run.steps.find((st) => st.status === "held");
      if (held) {
        expect(["send", "write_external", "spend", "sign", "pay"]).toContain(held.risk);
        expectApiError(() => s.continueRun(run.id, boss(s)), 409);
        expectApiError(() => s.resumeClient(c.id, "ok", analyst(s)), 403);
        s.resumeClient(c.id, "Escalation decided: recall resolved", boss(s));
        expect(run.steps.find((st) => st.id === held.id)!.status).not.toBe("held");
        return;
      }
      if (run.status === "waiting_event") s.continueRun(run.id, boss(s));
    }
    throw new Error("the run never reached a held step");
  });
});

describe("metrics", () => {
  it("groups by service and only returns canonical KPI codes", () => {
    const s = fresh();
    const rows = s.queryMetrics({ group_by: "service" });
    expect(rows.length).toBe(18);
    for (const r of rows) for (const k of Object.keys(r)) if (k !== "service") expect(catalog.kpis[k], k).toBeDefined();
  });
});
