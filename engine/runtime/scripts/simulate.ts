// Simulates every workflow of every service on the real runner. Exit code 1 when a path fails or a step never runs.
//   node engine/runtime/scripts/simulate.ts [--json] [--max-paths N] [workflow_id ...]
import { checkDefinition } from "../src/graph.ts";
import { loadWorkflows } from "../src/load.ts";
import { readFileSync } from "node:fs";
import { simulateWorkflow, type SimConfig, type SimResult } from "../src/simulate.ts";

const args = process.argv.slice(2);
const json = args.includes("--json");
const maxAt = args.indexOf("--max-paths");
const max_paths = maxAt >= 0 ? Number(args[maxAt + 1]) : undefined;
const only = args.filter((a, i) => !a.startsWith("--") && i !== maxAt + 1);

const config = JSON.parse(readFileSync(new URL("../simulate.config.json", import.meta.url), "utf8")) as SimConfig;
const { workflows, errors } = loadWorkflows();
for (const id of Object.keys(config)) if (!id.startsWith("$") && !workflows.some((w) => w.workflow.id === id)) errors.push({ file: "engine/runtime/simulate.config.json", message: `no workflow has the id '${id}'` });
const results: SimResult[] = [];
let bad = errors.length;
for (const e of errors) console.error(`ERROR ${e.file}: ${e.message}`);
for (const { file, workflow } of workflows) {
  if (only.length && !only.includes(workflow.id)) continue;
  const broken = checkDefinition(workflow).filter((p) => p.level === "error");
  if (broken.length) {
    bad++;
    for (const p of broken) console.error(`ERROR ${file}: [${p.rule}] ${p.message}`);
    continue;
  }
  const r = await simulateWorkflow(workflow, { ...config[workflow.id], max_paths });
  results.push(r);
  if (json) continue;
  for (const f of r.failures) console.error(`ERROR ${r.workflow_id}: ${f.error}\n      path: ${f.path.join(", ") || "(no choices)"}`);
  for (const id of r.never_ran) console.error(`ERROR ${r.workflow_id}: step '${id}' did not run in any of ${r.paths} paths`);
  for (const w of r.warnings) console.error(`WARN  ${r.workflow_id}: ${w}`);
  bad += r.failures.length + r.never_ran.length;
}
const paths = results.reduce((n, r) => n + r.paths, 0);
const spend = results.filter((r) => r.spend_policy_steps.length);
if (json) console.log(JSON.stringify({ workflows: results.length, paths, problems: bad, results }, null, 2));
else {
  for (const r of spend) console.log(`NOTE  ${r.workflow_id}: spend steps that need the client's spend policy on some path: ${r.spend_policy_steps.join(", ")}`);
  console.log(`${results.length} workflows, ${paths} paths, ${bad} problems, ${results.filter((r) => r.capped).length} workflows with random paths after the limit, ${results.reduce((n, r) => n + r.excluded, 0)} failures on paths marked impossible`);
}
process.exit(bad ? 1 : 0);
