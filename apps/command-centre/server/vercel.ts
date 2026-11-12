import { handle } from "@hono/node-server/vercel";
import { Access, runtimeEnv } from "./access.js";
import { createApp } from "./app.js";
import { claudeImprover } from "./claude.js";
import { Store } from "./store.js";
import { Workspace } from "./workspace.js";

// Vercel serverless entry. scripts/build-vercel.mjs bundles this file into one function
// that answers /api/*. The UI is served as static files from the same deployment.
// State is in memory, so each function instance starts from the test data.
const store = new Store();
// With no PITH_ACCESS_CODE the app is open, so runtimeEnv removes the live keys.
const env = runtimeEnv(process.env);
const access = Access.fromEnv(env);
const key = env.ANTHROPIC_API_KEY;
const ws = new Workspace(store, { env, improver: key ? claudeImprover(key, env.PITH_CLAUDE_MODEL || "claude-opus-5-5") : null });

export default handle(createApp(store, ws, access));
