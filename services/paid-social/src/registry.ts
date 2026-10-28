import { readdirSync, readFileSync } from "node:fs";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { dir } from "./paths.js";

const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020;

export interface WorkflowStep {
  id: string;
  type: string;
  needs?: string[];
  agent?: { prompt_ref?: string; model?: string; output_schema?: string };
  tool?: { name?: string; action?: string; risk?: string };
  check?: { kinds?: string[]; min_brand_score?: number };
  gate?: { approval_kind?: string; required_roles?: string[]; required_count?: number; skip_if?: string; on_changes?: string };
  task?: { title?: string; assignee_roles?: string[]; due_hours?: number; done_output_schema?: string };
  branch?: { cases?: { if: string; goto: string }[]; else?: string };
  [key: string]: unknown;
}

export interface Workflow {
  id: string;
  version: number;
  service: string;
  steps: WorkflowStep[];
  [key: string]: unknown;
}

export interface Prompt {
  ref: string;
  model: string;
  task: string;
}

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

export function loadWorkflows(): Workflow[] {
  return readdirSync(dir("workflows"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson(dir("workflows", f)) as Workflow);
}

/** Ajv with every paid social output schema registered under its $id (for example "paid_social/media_plan@1"). */
export function createValidator(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  for (const f of readdirSync(dir("schemas")).filter((f) => f.endsWith(".json"))) {
    ajv.addSchema(readJson(dir("schemas", f)));
  }
  return ajv;
}

let shared: Ajv2020 | undefined;

export function validateOutput(schemaRef: string, data: unknown): { valid: boolean; errors: ErrorObject[] } {
  shared ??= createValidator();
  const validate = shared.getSchema(schemaRef);
  if (!validate) throw new Error(`Unknown output schema: ${schemaRef}`);
  const valid = validate(data) as boolean;
  return { valid, errors: valid ? [] : [...(validate.errors ?? [])] };
}

export function loadPrompt(ref: string): Prompt {
  const match = /^paid_social\/([a-z_]+)@1$/.exec(ref);
  if (!match) throw new Error(`Unknown prompt ref: ${ref}`);
  const raw = readFileSync(dir("prompts", `${match[1]}.md`), "utf8");
  const fm = /^---\nref: (.+)\nmodel: (.+)\n---\n([\s\S]*)$/.exec(raw);
  if (!fm || fm[1] !== ref) throw new Error(`Prompt file for ${ref} has a bad header`);
  return { ref, model: fm[2], task: fm[3].trim() };
}

export const loadPreamble = () => readFileSync(dir("prompts", "_preamble.md"), "utf8").trim();

/** Every prompt and schema ref that a workflow names, and which of them do not resolve. */
export function unresolvedRefs(wf: Workflow): string[] {
  shared ??= createValidator();
  const missing: string[] = [];
  for (const step of wf.steps) {
    const ref = step.agent?.prompt_ref;
    if (ref) {
      try {
        loadPrompt(ref);
      } catch {
        missing.push(`${wf.id}.${step.id}: prompt ${ref}`);
      }
    }
    for (const schema of [step.agent?.output_schema, step.task?.done_output_schema]) {
      if (schema && !shared.getSchema(schema)) missing.push(`${wf.id}.${step.id}: schema ${schema}`);
    }
  }
  return missing;
}
