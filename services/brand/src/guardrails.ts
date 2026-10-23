/** Guardrails for brand agent outputs (docs/02-pipeline.md §3). */

/** Words an agent must never use about a name or tagline: only a person and a lawyer clear a mark. */
const CLEARANCE = /\b(legally clear|trademark[- ]clear|cleared for (use|registration)|is available( to register)?|no conflicts? exist|safe to register|approved for use)\b/i;

/** Returns the clearance phrases found in agent text about names, taglines or claims. */
export function findClearanceLanguage(text: string): string[] {
  const found: string[] = [];
  const re = new RegExp(CLEARANCE.source, "gi");
  for (const m of text.matchAll(re)) found.push(m[0]);
  return found;
}

/** Interview and review quotes use an id, never a name. Flags "Name Surname" pairs and "said <Name>" forms. */
export function findPersonalNames(quote: string, knownNames: string[] = []): string[] {
  const hits = knownNames.filter((n) => n && quote.toLowerCase().includes(n.toLowerCase()));
  const said = /\b(?:said|says|according to)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g;
  for (const m of quote.matchAll(said)) hits.push(m[1]);
  return [...new Set(hits)];
}

export interface AssetUse {
  kind: "moodboard" | "final_logo" | "identity_file" | "template" | "explore";
  made_by: "ai" | "human" | "ai_assisted";
}

/** A final logo or identity file must have a human author. AI may make mood boards and explorations only. */
export function checkAuthorship(asset: AssetUse): string | null {
  if ((asset.kind === "final_logo" || asset.kind === "identity_file") && asset.made_by === "ai") {
    return `A ${asset.kind} needs a human designer as author; AI may make mood boards and explorations only`;
  }
  return null;
}
