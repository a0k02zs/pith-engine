// Builds a Vercel deployment with the Build Output API (v3) in .vercel/output:
//   static/          the UI from `vite build` (dist/)
//   functions/api.func  one Node.js function with the whole Hono API bundled in
//   config.json      routes: files first, then /api/* to the function, then the SPA fallback
// Run after `npm run catalog && vite build`. Vercel uses .vercel/output when it exists.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(app, ".vercel", "output");
rmSync(out, { recursive: true, force: true });

cpSync(join(app, "dist"), join(out, "static"), { recursive: true });

const fn = join(out, "functions", "api.func");
mkdirSync(fn, { recursive: true });
await build({
  entryPoints: [join(app, "server", "vercel.ts")],
  outfile: join(fn, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  // Some bundled packages call require(); give the ESM bundle one.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: "warning",
});
writeFileSync(join(fn, ".vc-config.json"), JSON.stringify({
  runtime: "nodejs22.x",
  handler: "index.mjs",
  launcherType: "Nodejs",
  shouldAddHelpers: false,
  supportsResponseStreaming: true,
  maxDuration: 60,
}, null, 2));

writeFileSync(join(out, "config.json"), JSON.stringify({
  version: 3,
  routes: [
    { src: "/assets/(.*)", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
    { handle: "filesystem" },
    { src: "/api(/.*)?", dest: "/api" },
    { src: "/(.*)", dest: "/index.html" },
  ],
}, null, 2));
console.log("Vercel build output written to .vercel/output");
