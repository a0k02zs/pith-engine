// Builds dist-preview/command-centre.html: 1 self-contained HTML file with the UI, the API and the
// test data, for a shareable preview with no server. Run: npm run build:preview
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

execSync("vite build --outDir dist-preview --base ./", { stdio: "inherit", env: { ...process.env, VITE_PREVIEW: "1" } });
const dir = "dist-preview";
let html = readFileSync(join(dir, "index.html"), "utf8");
const assets = join(dir, "assets");
const files = readdirSync(assets);
const css = files.filter((f) => f.endsWith(".css")).map((f) => readFileSync(join(assets, f), "utf8")).join("\n");
const js = files.filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(assets, f), "utf8"));
if (js.length !== 1) throw new Error(`expected 1 JS chunk, got ${js.length}; keep inlineDynamicImports on`);
html = html
  .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, () => "")
  .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, () => `<style>${css}</style>`)
  .replace(/<link rel="icon"[^>]*>/, () => `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(readFileSync("public/favicon.svg", "utf8"))}">`)
  .replace("</body>", () => `<script type="module">${js[0].replace(/<\/script/g, "<\\/script")}</script>\n</body>`);
// The artifact host wraps the page in its own document, so keep only the title, styles and body content.
const head = html.match(/<head>([\s\S]*)<\/head>/)[1].replace(/<meta[^>]*>/g, "");
const bodyHtml = html.match(/<body>([\s\S]*)<\/body>/)[1];
html = `${head.trim()}\n${bodyHtml.trim()}\n`;
writeFileSync(join(dir, "command-centre.html"), html);
console.log(`dist-preview/command-centre.html ${(html.length / 1024).toFixed(0)} KB`);
