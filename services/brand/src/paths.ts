import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Package root: works from src/ (tests) and from dist/ (build). */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const dir = (...parts: string[]) => join(ROOT, ...parts);

/** Shared engine contracts in this repo (engine/contracts, v0.1.0). */
export const engineDir = (...parts: string[]) => join(ROOT, "..", "..", "engine", "contracts", ...parts);
