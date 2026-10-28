import { readdirSync, readFileSync } from "node:fs";
import { dir } from "./paths.js";
import type { Platform } from "./market-rules.js";

export const PLATFORMS: Platform[] = ["meta", "linkedin", "tiktok", "snapchat"];

/** The engine registry has 1 tool per ad platform (enums.tool_registry), so each template becomes 1 workflow per platform. */
export function expandTemplates(): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of readdirSync(dir("workflows", "templates")).filter((f) => f.endsWith(".json")).sort()) {
    const raw = readFileSync(dir("workflows", "templates", f), "utf8");
    for (const p of PLATFORMS) {
      const text = raw.replaceAll("{{platform}}", p).replaceAll("{{tool}}", `ads_${p}`);
      out.set(`paid_social.${f.replace(/\.json$/, "")}_${p}.json`, text);
    }
  }
  return out;
}
