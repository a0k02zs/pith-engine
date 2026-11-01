// Builds server/generated/catalog.json from the repo:
// engine/contracts/enums.json and every services/*/workflows/*.json file.
// The command centre reads pipelines from the repo, so a new workflow file
// shows up in the app after the next build. No copy of the data is kept by hand.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = process.env.PITH_REPO_ROOT ?? join(here, "..", "..", "..");
const enums = JSON.parse(readFileSync(join(repo, "engine/contracts/enums.json"), "utf8"));

const servicesDir = join(repo, "services");
const workflows = [];
for (const folder of readdirSync(servicesDir).sort()) {
  const wfDir = join(servicesDir, folder, "workflows");
  if (!existsSync(wfDir) || !statSync(wfDir).isDirectory()) continue;
  for (const file of readdirSync(wfDir).sort()) {
    if (!file.endsWith(".json")) continue;
    const def = JSON.parse(readFileSync(join(wfDir, file), "utf8"));
    if (!def || typeof def !== "object" || !Array.isArray(def.steps)) continue;
    workflows.push({
      id: def.id,
      version: def.version ?? 1,
      service: def.service,
      folder,
      file: `services/${folder}/workflows/${file}`,
      description: def.description ?? "",
      trigger: def.trigger ?? {},
      inputs: def.inputs ?? null,
      steps: def.steps.map((s) => ({
        id: s.id,
        type: s.type,
        name: s.name ?? null,
        needs: s.needs ?? [],
        gate: s.gate
          ? {
              approval_kind: s.gate.approval_kind,
              required_roles: s.gate.required_roles ?? [],
              required_count: s.gate.required_count ?? 1,
              sla_hours: s.gate.sla_hours ?? 48,
              skip_if: s.gate.skip_if ?? null,
              on_changes: s.gate.on_changes ?? null,
            }
          : null,
        tool: s.tool ? { name: s.tool.name, action: s.tool.action, risk: s.tool.risk } : null,
        check: s.check ? { kinds: s.check.kinds ?? [] } : null,
      })),
    });
  }
}

const out = {
  generated_from: "engine/contracts/enums.json + services/*/workflows/*.json",
  contract_version: enums.contract_version,
  services: enums.services,
  market_groups: enums.market_groups,
  market_launch_order: enums.market_launch_order,
  roles: enums.roles,
  approval_kinds: enums.approval_kinds,
  kpis: Object.fromEntries(Object.entries(enums.kpis).filter(([k]) => !k.startsWith("$"))),
  tool_risk_meaning: enums.tool_risk_meaning,
  workflows,
};
mkdirSync(join(here, "..", "server", "generated"), { recursive: true });
writeFileSync(join(here, "..", "server", "generated", "catalog.json"), JSON.stringify(out, null, 1));
console.log(`catalog: ${workflows.length} workflows, ${Object.keys(enums.services).length} services`);
