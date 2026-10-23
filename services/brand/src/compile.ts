import type { ErrorObject } from "ajv/dist/2020.js";
import { validateBrandProfile, validateOutput } from "./registry.js";

/**
 * Brain compiler checks (docs/02-pipeline.md §3, docs/07-engine-interfaces.md §1).
 * The brain-compiler agent drafts the bundle; this code decides if the draft may be saved with
 * PUT /clients/{id}/brain. It never makes a profile approved: only the go-live gate does that.
 */

export interface ClaimRow {
  text: string;
  category?: string;
  markets?: string[];
  status?: string;
  approval_id?: string;
  evidence_url?: string;
}

export interface BrainBundle {
  profile_doc: Record<string, unknown>;
  claims?: ClaimRow[];
  banned_terms?: { term: string; markets?: string[]; reason?: string }[];
  chunks: { source: string; source_ref?: string; locale?: string; content: string }[];
  scorer_test_set: { on_brand: string[]; off_brand: string[] };
  unmapped: string[];
}

export interface CompileResult {
  ok: boolean;
  profile: Record<string, unknown>;
  claims: ClaimRow[];
  problems: string[];
  schemaErrors: ErrorObject[];
}

export const CHUNK_WORDS = { min: 200, max: 400 } as const;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Turn a brain bundle into a draft profile for client_id and version. Returns the problems that block saving. */
export function compileBrain(bundle: unknown, clientId: string, version: number): CompileResult {
  const problems: string[] = [];
  const shape = validateOutput("brand/brain_bundle@1", bundle);
  if (!shape.valid) {
    return { ok: false, profile: {}, claims: [], problems: ["Bundle does not match brand/brain_bundle@1"], schemaErrors: shape.errors };
  }
  const b = bundle as BrainBundle;

  if (b.profile_doc.status && b.profile_doc.status !== "draft") {
    problems.push(`Agent set status "${String(b.profile_doc.status)}"; only the go-live gate approves a profile`);
  }
  const profile: Record<string, unknown> = { ...b.profile_doc, client_id: clientId, version, status: "draft" };

  // Claims: an "approved" claim needs an approval id. Others go back to "proposed" for a claim gate.
  const claims = (b.claims ?? []).map((c) => {
    if (c.status === "approved" && !c.approval_id) {
      problems.push(`Claim "${c.text}" says approved but has no approval id; set to proposed`);
      return { ...c, status: "proposed" };
    }
    return { ...c, status: c.status ?? "proposed" };
  });
  const approvedTexts = new Set(claims.filter((c) => c.status === "approved").map((c) => c.text));
  const profileClaims = (profile.approved_claims as { text: string }[] | undefined) ?? [];
  for (const c of profileClaims) {
    if (!approvedTexts.has(c.text)) problems.push(`approved_claims holds "${c.text}", which has no approval`);
  }

  for (const t of b.banned_terms ?? []) {
    if (!t.reason) problems.push(`Banned term "${t.term}" has no reason`);
  }

  b.chunks.forEach((c, i) => {
    const n = words(c.content);
    if (n < CHUNK_WORDS.min || n > CHUNK_WORDS.max) problems.push(`Chunk ${i} has ${n} words; keep ${CHUNK_WORDS.min} to ${CHUNK_WORDS.max}`);
  });

  if (b.unmapped.length > 0) problems.push(`Unmapped content to send to the engine thread: ${b.unmapped.join(", ")}`);

  const schema = validateBrandProfile(profile);
  if (!schema.valid) problems.push("Profile does not match engine brand-profile.json");

  // Unmapped content is reported, but it does not block a draft save.
  const blocking = problems.filter((p) => !p.startsWith("Unmapped"));
  return { ok: blocking.length === 0, profile, claims, problems, schemaErrors: schema.errors };
}
