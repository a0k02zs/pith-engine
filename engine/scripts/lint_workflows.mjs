#!/usr/bin/env node
// Cross-check every service workflow against the engine contracts.
// The JSON Schema check (validate_contracts.py) proves the shape. This script proves the meaning:
// references resolve, codes exist in enums.json, expressions parse, the step graph has no dead ends,
// and the guardrails G1, G2, G6 and G9 hold. The graph, expression and guardrail rules are the same
// code that the engine runtime uses for POST /workflows (engine/runtime/src/graph.ts), so the linter
// and the engine cannot disagree. Node 22.18 or later runs the .ts files with no install step.
//
// Run: node engine/scripts/lint_workflows.mjs            (errors fail, warnings do not)
//      node engine/scripts/lint_workflows.mjs --json     (machine-readable)
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ancestors, buildGraph, checkDefinition } from "../runtime/src/graph.ts";

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

for (const { file, wf } of docs) {
  const err = (rule, m) => add("error", file, wf.id, rule, m);
  const warn = (rule, m) => add("warn", file, wf.id, rule, m);

  if (!services.has(wf.service)) err("service", `service '${wf.service}' is not in enums.services`);
  if (typeof wf.id === "string" && !wf.id.startsWith(`${wf.service}.`)) err("id-prefix", `id must start with '${wf.service}.'`);
  if (!wf.trigger || !(wf.trigger.event || wf.trigger.cron || wf.trigger.manual)) warn("trigger", "no trigger (event, cron or manual)");

  // Structure, expressions, the step graph and the guardrails G2, G6 and G9: the rules of the runtime.
  for (const p of checkDefinition(wf)) add(p.level, file, wf.id, p.rule, p.message);
  const g = buildGraph(wf);

  for (const s of wf.steps) {
    const at = `step '${s.id}'`;
    if (s.type === "gate" && s.gate) {
      if (!kinds.has(s.gate.approval_kind)) err("approval-kind", `${at} uses approval kind '${s.gate.approval_kind}', not in enums.approval_kinds`);
      for (const r of s.gate.required_roles ?? []) if (!roles.has(r)) err("role", `${at} uses role '${r}', not in enums.roles`);
      if (s.gate.sla_hours == null) warn("gate-sla", `${at} has no sla_hours`);
    }
    if (s.type === "task" && s.task) {
      for (const r of s.task.assignee_roles ?? []) if (!roles.has(r)) err("role", `${at} assigns role '${r}', not in enums.roles`);
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
      if (t.name === "engine" && t.action && !engineActions.has(t.action)) err("engine-action", `${at} calls engine action '${t.action}', not in enums.engine_actions`);

      const kindsBefore = new Set([...ancestors(g, s.id)].map((id) => g.byId.get(id)).filter((u) => u.type === "gate").map((u) => u.gate?.approval_kind));
      if (t.risk === "spend" && !kindsBefore.has("budget") && !kindsBefore.has("budget_change"))
        warn("G1", `${at} spends with no budget or budget_change gate before it (allowed only inside spend_policies)`);
    }
  }
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
