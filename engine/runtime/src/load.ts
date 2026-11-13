// Reads the workflow definitions of every service from services/<name>/workflows/*.json.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Workflow } from "./types.ts";

/** The repo root (the folder that holds engine/ and services/). */
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export interface LoadedWorkflow {
  file: string;
  workflow: Workflow;
}

/** A file holds 1 definition, a list, or { workflows: [...] }. Files that are not valid JSON go to `errors`. */
export function loadWorkflows(root: string = REPO_ROOT): { workflows: LoadedWorkflow[]; errors: { file: string; message: string }[] } {
  const workflows: LoadedWorkflow[] = [];
  const errors: { file: string; message: string }[] = [];
  const servicesDir = join(root, "services");
  if (!existsSync(servicesDir)) return { workflows, errors };
  for (const dir of readdirSync(servicesDir).sort()) {
    const wfDir = join(servicesDir, dir, "workflows");
    if (!existsSync(wfDir) || !statSync(wfDir).isDirectory()) continue;
    for (const name of readdirSync(wfDir).sort()) {
      if (!name.endsWith(".json")) continue;
      const file = relative(root, join(wfDir, name));
      try {
        const data = JSON.parse(readFileSync(join(wfDir, name), "utf8"));
        const list = Array.isArray(data) ? data : Array.isArray(data.workflows) ? data.workflows : [data];
        for (const wf of list) if (wf && Array.isArray(wf.steps)) workflows.push({ file, workflow: wf });
      } catch (e) {
        errors.push({ file, message: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return { workflows, errors };
}
