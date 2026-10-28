import { readdirSync, readFileSync } from "node:fs";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { dir, engineDir } from "./paths.js";

const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020;

export interface WorkflowStep {
  id: string;
  type: string;
  needs?: string[];
  agent?: { prompt_ref?: string; model?: string; output_schema?: string };
  tool?: { name?: string; action?: string; risk?: string };
  check?: { kinds?: string[]; min_brand_score?: number };
  gate?: { approval_kind?: string; required_roles?: string[]; required_count?: number; sla_hours?: number; skip_if?: string; on_changes?: string };
  subflow?: { workflow_id?: string; per?: string };
  branch?: { cases?: { if: string; goto: string }[]; else?: string };
  emit?: { event?: string };
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

export const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

export function loadWorkflows(): Workflow[] {
  return readdirSync(dir("workflows"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson(dir("workflows", f)) as Workflow);
}

/** Ajv with every brand output schema registered under its $id (for example "brand/routes@1"). */
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

let profileValidator: ReturnType<Ajv2020["compile"]> | undefined;

/** Validate a document against the engine brand-profile.json schema. */
export function validateBrandProfile(doc: unknown): { valid: boolean; errors: ErrorObject[] } {
  if (!profileValidator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    profileValidator = ajv.compile(readJson(engineDir("schemas", "brand-profile.json")));
  }
  const valid = profileValidator(doc) as boolean;
  return { valid, errors: valid ? [] : [...(profileValidator.errors ?? [])] };
}

export function loadPrompt(ref: string): Prompt {
  const match = /^brand\/([a-z_]+)@1$/.exec(ref);
  if (!match) throw new Error(`Unknown prompt ref: ${ref}`);
  const raw = readFileSync(dir("prompts", `${match[1]}.md`), "utf8");
  const fm = /^---\nref: (.+)\nmodel: (.+)\n---\n([\s\S]*)$/.exec(raw);
  if (!fm || fm[1] !== ref) throw new Error(`Prompt file for ${ref} has a bad header`);
  return { ref, model: fm[2], task: fm[3].trim() };
}

export function loadPreamble(): string {
  return readFileSync(dir("prompts", "_preamble.md"), "utf8").trim();
}

/** Prompt refs, output schemas and subflows a workflow names that do not resolve in this package. */
export function unresolvedRefs(wf: Workflow): string[] {
  shared ??= createValidator();
  const workflowIds = new Set(loadWorkflows().map((w) => w.id));
  const missing: string[] = [];
  for (const s of wf.steps) {
    const ref = s.agent?.prompt_ref;
    if (ref) {
      try {
        loadPrompt(ref);
      } catch {
        missing.push(ref);
      }
    }
    const schema = s.agent?.output_schema;
    if (schema && !shared.getSchema(schema)) missing.push(schema);
    const sub = s.subflow?.workflow_id;
    if (sub && !workflowIds.has(sub)) missing.push(sub);
  }
  return missing;
}
