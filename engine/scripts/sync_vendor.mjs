#!/usr/bin/env node
// Some services keep a copy of the engine contracts in services/<name>/vendor/engine/ so that the
// service works as a package of its own. The source of truth is engine/contracts. This script
// copies the files; with --check it only reports copies that differ (CI uses this).
//
// Run: node engine/scripts/sync_vendor.mjs          (copy)
//      node engine/scripts/sync_vendor.mjs --check  (fail when a copy is stale)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCES = { "enums.json": "engine/contracts/enums.json", "workflow-definition.json": "engine/contracts/schemas/workflow-definition.json" };
const check = process.argv.includes("--check");
const stale = [];

for (const service of readdirSync(join(ROOT, "services")).sort()) {
  const vendor = join(ROOT, "services", service, "vendor", "engine");
  if (!existsSync(vendor)) continue;
  for (const [name, source] of Object.entries(SOURCES)) {
    const target = join(vendor, name);
    if (!existsSync(target)) continue;
    const want = readFileSync(join(ROOT, source), "utf8");
    if (readFileSync(target, "utf8") === want) continue;
    stale.push(`services/${service}/vendor/engine/${name}`);
    if (!check) writeFileSync(target, want);
  }
}

if (check && stale.length) {
  console.log(`Stale copies of the engine contracts:\n${stale.join("\n")}\nRun: node engine/scripts/sync_vendor.mjs`);
  process.exit(1);
}
console.log(check ? "ok: every vendored copy matches engine/contracts" : `updated ${stale.length} files`);
