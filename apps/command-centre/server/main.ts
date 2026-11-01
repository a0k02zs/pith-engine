import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "./app.js";
import { Store } from "./store.js";

const store = new Store();
const app = createApp(store);

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
});
