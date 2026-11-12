import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Access, runtimeEnv } from "./access.js";
import { createApp } from "./app.js";
import { claudeImprover } from "./claude.js";
import { Store } from "./store.js";
import { Workspace } from "./workspace.js";

const store = new Store();
// With no PITH_ACCESS_CODE the app is open, so runtimeEnv removes the live keys.
const env = runtimeEnv(process.env);
const access = Access.fromEnv(env);
const key = env.ANTHROPIC_API_KEY;
const ws = new Workspace(store, { env, improver: key ? claudeImprover(key, env.PITH_CLAUDE_MODEL || "claude-opus-5-5") : null });
const app = createApp(store, ws, access);

// Serve the built UI (vite build -> dist/) and fall back to index.html for client routes.
const distDir = process.env.PITH_DIST_DIR ?? "dist";
if (existsSync(join(distDir, "index.html"))) {
  const indexHtml = readFileSync(join(distDir, "index.html"), "utf8");
  app.use("/assets/*", serveStatic({ root: distDir }));
  app.get("/favicon.svg", serveStatic({ root: distDir }));
  app.get("*", (c) => c.html(indexHtml));
}

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Pith Command Centre on http://localhost:${port} (test data, ${store.clients.length} test clients)`);
  console.log(access.enabled ? "Access code is on." : "Open mode: no PITH_ACCESS_CODE, so live keys are ignored and every integration is simulated.");
});
