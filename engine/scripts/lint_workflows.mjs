#!/usr/bin/env node
// Cross-check every service workflow against the engine contracts.
// The JSON Schema check (validate_contracts.py) proves the shape. This script proves the meaning:
// references resolve, codes exist in enums.json, and the guardrails G1, G2, G6 and G9 hold.
//
// Run: node engine/scripts/lint_workflows.mjs            (errors fail, warnings do not)
//      node engine/scripts/lint_workflows.mjs --json     (machine-readable)
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const enums = JSON.parse(readFileSync(join(ROOT, "engine/contracts/enums.json"), "utf8"));
const services = new Set(Object.keys(enums.services));
const roles = new Set(enums.roles);
const kinds = new Set(enums.approval_kinds);
const tools = new Set(Object.keys(enums.tool_registry).filter((k) => !k.startsWith("$")));
const engineActions = new Set(Object.keys(enums.engine_actions).filter((k) => !k.startsWith("$")));

const findings = [];
const add = (level, file, wf, rule, message) => findings.push({ level, file, workflow: wf, rule, message });

// Load every workflow document. A file holds 1 definition, a list, or { workflows: [...] }.
const docs = [];
const servicesDir = join(ROOT, "services");
for (const dir of readdirSync(servicesDir).sort()) {
  const wfDir = join(servicesDir, dir, "workflows");
  if (!existsSync(wfDir) || !statSync(wfDir).isDirectory()) continue;
  for (const name of readdirSync(wfDir).sort()) {
    if (!name.endsWith(".json")) continue;
    const file = relative(ROOT, join(wfDir, name));
    let data;
    try {
      data = JSON.parse(readFileSync(join(wfDir, name), "utf8"));
    } catch (e) {
      add("error", file, null, "parse", `not valid JSON: ${e.message}`);
      continue;
    }
    const list = Array.isArray(data) ? data : Array.isArray(data.workflows) ? data.workflows : [data];
    for (const wf of list) if (wf && Array.isArray(wf.steps)) docs.push({ file, dir, wf });
  }
}

const byId = new Map();
for (const d of docs) {
  if (byId.has(d.wf.id)) add("error", d.file, d.wf.id, "unique-id", `workflow id is also defined in ${byId.get(d.wf.id).file}`);
  else byId.set(d.wf.id, d);
}

// Steps that can run before a step: its 'needs', plus any branch that jumps to it.
function predecessors(stepsById) {
  const preds = new Map();
  const link = (to, from) => preds.set(to, [...(preds.get(to) ?? []), from]);
  for (const s of stepsById.values()) {
    for (const n of s.needs ?? []) link(s.id, n);
    for (const c of s.branch?.cases ?? []) if (c.goto) link(c.goto, s.id);
    if (s.branch?.else) link(s.branch.else, s.id);
  }
  return preds;
}

function upstream(preds, id, seen = new Set()) {
  for (const n of preds.get(id) ?? []) {
    if (seen.has(n)) continue;
    seen.add(n);
    upstream(preds, n, seen);
  }
  return seen;
}

for (const { file, wf } of docs) {
  const err = (rule, m) => add("error", file, wf.id, rule, m);
  const warn = (rule, m) => add("warn", file, wf.id, rule, m);

  if (!services.has(wf.service)) err("service", `service '${wf.service}' is not in enums.services`);
  if (typeof wf.id === "string" && !wf.id.startsWith(`${wf.service}.`)) err("id-prefix", `id must start with '${wf.service}.'`);
  if (!wf.trigger || !(wf.trigger.event || wf.trigger.cron || wf.trigger.manual)) warn("trigger", "no trigger (event, cron or manual)");

  const stepsById = new Map();
  for (const s of wf.steps) {
    if (stepsById.has(s.id)) err("step-id", `step id '${s.id}' is used 2 times`);
    stepsById.set(s.id, s);
  }
  const has = (id) => stepsById.has(id);
  const preds = predecessors(stepsById);

  for (const s of wf.steps) {
    const at = `step '${s.id}'`;
    // specs/workflow.md: expressions read input, steps.<id>.output, client and brain; wait.match also reads event.
    const exprs = [s.gate?.skip_if, s.wait?.match, ...(s.branch?.cases ?? []).map((c) => c.if)].filter(Boolean);
    for (const e of exprs) {
      const rest = e.replace(/event\.data|steps\.[a-z0-9_]+\.output/g, "");
      if (!/\b(input|steps|client|brain|event)\./.test(e) || /\b(async\.data|run\.input|output\.[a-z_]+|data\.[a-z_]+)/.test(rest))
        warn("expression", `${at} uses names outside the expression spec: ${e.length > 80 ? `${e.slice(0, 80)}...` : e}`);
    }
    if (!s[s.type] && s.type !== "wait") err("step-body", `${at} has type '${s.type}' but no '${s.type}' block`);
    for (const n of s.needs ?? []) if (!has(n)) err("needs", `${at} needs unknown step '${n}'`);

    if (s.type === "gate" && s.gate) {
      if (!kinds.has(s.gate.approval_kind)) err("approval-kind", `${at} uses approval kind '${s.gate.approval_kind}', not in enums.approval_kinds`);
      if (!s.gate.required_roles?.length) err("gate-roles", `${at} has no required_roles`);
      for (const r of s.gate.required_roles ?? []) if (!roles.has(r)) err("role", `${at} uses role '${r}', not in enums.roles`);
      if (s.gate.on_changes && !has(s.gate.on_changes)) err("on-changes", `${at} returns to unknown step '${s.gate.on_changes}'`);
      if (s.gate.sla_hours == null) warn("gate-sla", `${at} has no sla_hours`);
    }
    if (s.type === "task" && s.task) {
      for (const r of s.task.assignee_roles ?? []) if (!roles.has(r)) err("role", `${at} assigns role '${r}', not in enums.roles`);
    }
    if (s.type === "branch" && s.branch) {
      for (const c of s.branch.cases ?? []) if (c.goto && c.goto !== "end" && !has(c.goto)) err("branch", `${at} goes to unknown step '${c.goto}'`);
      if (s.branch.else && s.branch.else !== "end" && !has(s.branch.else)) err("branch", `${at} else goes to unknown step '${s.branch.else}'`);
    }
    if (s.type === "subflow" && s.subflow) {
      const target = s.subflow.workflow_id;
      // A target with a template part (for example "{{ input.service }}.launch") resolves at run time.
      if (target && !/[{$<]/.test(target) && !byId.has(target)) err("subflow", `${at} starts unknown workflow '${target}'`);
    }
    // A campaign_assets run is a child of campaigns.launch, and the parent waits for it before it
    // launches the market. A child that waits for the launch event can never finish (deadlock).
    // The publish half belongs in <service>.campaign_go_live, triggered by that event.
    if (/\.campaign_assets$/.test(wf.id ?? "") && s.type === "wait" && s.wait?.event === "svc.campaigns/market.launched")
      err("campaign-deadlock", `${at} waits for svc.campaigns/market.launched inside campaign_assets; move the publish steps to ${wf.service}.campaign_go_live`);
    if (s.type === "tool" && s.tool) {
      const t = s.tool;
      if (!tools.has(t.name)) err("tool", `${at} uses tool '${t.name}', not in enums.tool_registry`);
      if (!t.risk) err("tool-risk", `${at} has no risk level`);
      if (t.name === "engine" && t.action && !engineActions.has(t.action)) err("engine-action", `${at} calls engine action '${t.action}', not in enums.engine_actions`);

      const up = [...upstream(preds, s.id)].map((id) => stepsById.get(id)).filter(Boolean);
      const gateKinds = new Set(up.filter((u) => u.type === "gate").map((u) => u.gate?.approval_kind));
      const hasCompliance = up.some((u) => u.type === "check" && u.check?.kinds?.includes("compliance"));
      if (t.risk === "spend" && !gateKinds.has("budget") && !gateKinds.has("budget_change"))
        warn("G1", `${at} spends with no budget or budget_change gate before it (allowed only inside spend_policies)`);
      if (t.risk === "sign" && !gateKinds.has("contract")) err("G2", `${at} signs with no contract gate before it`);
      if (t.risk === "pay" && !gateKinds.has("payout")) err("G2", `${at} pays with no payout gate before it`);
      if ((t.risk === "send" || t.risk === "write_external") && !hasCompliance)
        err("G6", `${at} has risk '${t.risk}' with no compliance check before it`);
    }
  }

  // Cycles in 'needs' make a run that can never start.
  const state = new Map();
  const visit = (id, path) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      err("cycle", `steps depend on each other: ${[...path, id].join(" -> ")}`);
      return;
    }
    state.set(id, 1);
    for (const n of stepsById.get(id)?.needs ?? []) if (has(n)) visit(n, [...path, id]);
    state.set(id, 2);
  };
  for (const s of wf.steps) visit(s.id, []);
}

// Every channel that the campaigns playbook gives budget to must expose <service>.campaign_assets.
const playbookPath = join(ROOT, "services/campaigns/config/playbook.json");
if (existsSync(playbookPath)) {
  const playbook = JSON.parse(readFileSync(playbookPath, "utf8"));
  const channels = new Set(Object.values(playbook.campaign_types ?? {}).flatMap((t) => Object.keys(t.split ?? {})));
  for (const ch of [...channels].sort())
    if (!byId.has(`${ch}.campaign_assets`))
      add("error", "services/campaigns/config/playbook.json", null, "campaign-channel", `channel '${ch}' gets campaign budget but has no ${ch}.campaign_assets workflow`);
}

const errors = findings.filter((f) => f.level === "error");
const warns = findings.filter((f) => f.level === "warn");
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ workflows: docs.length, errors: errors.length, warnings: warns.length, findings }, null, 2));
} else {
  for (const f of findings) console.log(`${f.level.toUpperCase()} [${f.rule}] ${f.file}${f.workflow ? ` (${f.workflow})` : ""}: ${f.message}`);
  console.log(`\n${docs.length} workflows, ${errors.length} errors, ${warns.length} warnings`);
}
process.exit(errors.length ? 1 : 0);
