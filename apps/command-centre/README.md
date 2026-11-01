# Pith Command Centre

One web app to monitor and operate all 18 Pith Marketing services. It works like an ERP for the agency: every client, every pipeline run, every approval and every KPI in one place.

The app reads the real engine contracts and pipelines from this repo. It uses **test data** for clients, runs and metrics until the engine runs with real clients.

## Modules

| Page | What you do there |
|------|-------------------|
| Command deck | See spend, revenue, ROAS and leads for 28 days, what needs you now (overdue and urgent approvals, failed runs, paused clients), and a health tile for each of the 18 services. |
| Approvals | The approval inbox from `engine/specs/approval-inbox.md`. Filter by your roles, overdue or urgent. Approve, request changes (with a comment) or reject. Bulk-approve items of one kind. |
| Runs | Every workflow run. A run page shows each step with its type, tool risk, gate and status. You can send a waiting event, mark a task done, or cancel the run. |
| Services | 1 workspace for each service: its pipelines (read from `services/*/workflows/*.json`), daily KPIs, runs and approvals, and links to the real tools the service uses (Meta Ads Manager, Google Ads, Runway and so on) and to its build pack in this repo. **Start run** starts any pipeline for a client and its markets. |
| Clients | Overview: markets, services, KPIs and runs. **Strategy**: a custom 90-day plan per client. **Accounts and links**: the client's Meta, Google, LinkedIn, TikTok and HubSpot account IDs, Meta sign-in, and deep links into the client's own accounts. **Pause everything** runs the engine action `client.pause_scheduled` for a crisis. |
| Video studio (beta) | AI ads with Runway and Higgsfield: brief, script and storyboard, 3 variants (mixed, Runway only, Higgsfield only), client approval, export with AI labels. |
| Analytics | Any canonical KPI by day, service, market and client. |
| Settings | Who you act as, the contract version, the market groups, the tool risk levels and the audit log. |

## Engine rules the app applies

The in-memory store (`server/store.ts`) applies the same rules as the engine specs, so the UI behaves as it will on the real engine:

- Only a person can decide an approval. A service token gets HTTP 403.
- The person needs one of the gate's `required_roles`. A gate with `required_count` 2 needs 2 different people.
- Changes requested needs a comment and sends the run back to `gate.on_changes`. A new approval opens when the run reaches the gate again.
- Reject fails the run. Cancel closes the run's open approvals.
- Only `copy`, `creative`, `content` and `template` gates can skip. Budget, contract, payout, claim and escalation gates never skip.
- A paused client holds every step with risk `send`, `write_external`, `spend`, `sign` or `pay`. Removals still run (G10). Only an account lead or a Pith admin can resume, and the resume records the escalation decision.
- A run can only start for a service the client buys and for the client's markets.

The tests in `test/` check these rules, and they check that every gate in every workflow file uses an approval kind and roles from `enums.json`.

## Search and navigation

Press **Ctrl K** (or Cmd K) to search pages, services and clients. The client menu at the top opens any client. Breadcrumbs show where you are.

## Client strategy

`server/strategy.ts` builds the plan from 3 inputs:

1. The client brain: positioning, audience, goals, monthly budget, tone, offers, competitors and notes. Edit it on the Strategy tab.
2. The client's markets, in the Pith launch order, with the laws, ad labels and blocking rules from `engine/specs/compliance-rules.json`.
3. The pipelines of each service the client buys, from `services/*/workflows/`.

The plan has objectives with targets, one play per service with its budget, a 90-day roadmap and the risks. **Send for approval** opens a `plan` approval (2 people from account lead, strategist, client approver). **Improve with Claude** adds notes with the Claude API (`server/claude.ts`, model `claude-opus-5-5`, structured output, server-side fallbacks). It runs only on the server, and only when `ANTHROPIC_API_KEY` is set.

## Client accounts

- Account IDs (Business Manager, ad account, Page, Instagram, pixel, Google Ads customer, GA4 property, LinkedIn, TikTok, HubSpot) are checked for format and saved. They make deep links into the client's own accounts.
- **Sign in with Meta** uses Facebook Login: `POST /api/oauth/meta/start` returns the login URL, Meta returns to `GET /api/oauth/meta/callback`, the server swaps the code for a long-lived token and checks the ad account (`GET /act_<id>?fields=name,currency,account_status` with `appsecret_proof`).
- The token is encrypted with AES-GCM (`server/connections.ts`, Web Crypto) and stays on the server. No API response contains it; `test/workspace.test.ts` checks this.
- The store is in memory today. In production, keep tokens in Secret Manager or the engine's vault, and set `PITH_TOKEN_KEY`.

## Video studio (beta)

- Flow: brief, then script and storyboard (each shot goes to Higgsfield for people and camera moves, or Runway for product and scene shots; you can change it), then 3 variants, then a `creative` approval with the same gate as `video.job` `approve_final_client` (creative lead and client approver, 2 people), then export.
- Checks: written consent before a real person's face or voice (G8 blocks generation without it), claim warning, the AI label for each platform (Meta "AI info", TikTok AI-generated label, YouTube synthetic content disclosure), EU AI Act Art. 50 in EU markets, and each market's paid ad label.
- Runway: `POST https://api.dev.runwayml.com/v1/image_to_video` (`X-Runway-Version: 2024-11-06`, model `gen4.5` or `RUNWAY_MODEL`), then `GET /v1/tasks/{id}`.
- Higgsfield: `POST https://api.higgsfield.ai` + `HIGGSFIELD_I2V_PATH` (default `/higgsfield-ai/dop/standard`, check it against your Higgsfield console), then `GET /requests/{id}/status`.
- Both animate an image, so a live job needs a key frame image URL in the brief. Without a key or a key frame the studio simulates the jobs.
- Video never publishes. Social and paid publish the exports.

## Server settings

| Variable | What it does |
|----------|--------------|
| `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI` (or `PUBLIC_BASE_URL`) | Turn on Sign in with Meta. `META_GRAPH_VERSION` defaults to `v23.0`. |
| `PITH_TOKEN_KEY` | 32 bytes, base64. Encrypts client tokens. Without it the key lives only in memory. |
| `ANTHROPIC_API_KEY` | Turns on Improve with Claude. `PITH_CLAUDE_MODEL` defaults to `claude-opus-5-5`. |
| `RUNWAYML_API_SECRET`, `RUNWAY_MODEL` | Live Runway jobs. |
| `HF_API_KEY_ID`, `HF_API_KEY_SECRET`, `HIGGSFIELD_I2V_PATH` | Live Higgsfield jobs. |

Put these in the host's secret store (Vercel environment variables or Secret Manager for Cloud Run). Never put them in the UI build.

## Test users

The user menu at the bottom left sets who you act as:

- **Boss**: every Pith role.
- **Sam Reed (test client)**: every client role, plus subject expert and native editor. Use it for client approvals and for the second person on 2-person gates.
- **Priya Shah (test analyst)**: only `analytics_lead`. Use it to see a 403.

## Run it

```bash
cd apps/command-centre
npm ci
npm run dev        # API on :8787 and UI on :5173 (Vite proxies /api)
npm test           # rule tests
npm run build && npm start   # production build on :8787
```

`npm run catalog` builds `server/generated/catalog.json` from `engine/contracts/enums.json` and every workflow file. The dev, test and build scripts run it first, so a new workflow file shows in the app after the next build.

## Preview without a server

`npm run build:preview` builds `dist-preview/command-centre.html`: 1 HTML file with the UI, the API and the test data. The API runs inside the browser, so the file opens anywhere and works without a server. Changes reset when the page reloads. The shared preview is at https://claude.ai/artifact/4dm5LHktQ4pqMBmthHsvPt.

## Deploy to Vercel

The Vercel project uses `apps/command-centre` as its root directory. Keep "Include files outside the root directory" on, because the catalog reads `engine/` and `services/`. `vercel.json` sets the build:

- `npm run build:vercel` builds the UI, then `scripts/build-vercel.mjs` writes `.vercel/output` with the Build Output API.
- The UI is static files. The whole API (`server/vercel.ts`) is 1 Node.js function that answers `/api/*`. Every other path returns `index.html`, so client routes work after a reload.
- Each push to `main` deploys to production. Each pull request gets a preview URL.

To set it up on another Vercel account, import the repo at https://vercel.com/new/clone?repository-url=https://github.com/a0k02zs/pith-engine&root-directory=apps/command-centre&project-name=pith-command-centre and add the variables from "Server settings" under Project settings > Environment Variables. For Meta sign-in, set `PUBLIC_BASE_URL` to the production URL and add `PUBLIC_BASE_URL/api/oauth/meta/callback` as a valid OAuth redirect URI in the Meta app.

Limits today:

- State is in memory. A new function instance starts again from the test data, so changes do not last. A database comes before real client work.
- The app has no sign-in of its own. Turn on Vercel Authentication for all deployments (Project settings > Deployment Protection) before you add real keys.

## Deploy to Cloud Run

Build from the repo root, because the catalog reads `engine/` and `services/`:

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT/pith/command-centre -f apps/command-centre/Dockerfile .
gcloud run deploy pith-command-centre --image REGION-docker.pkg.dev/PROJECT/pith/command-centre --region europe-west2 --no-allow-unauthenticated
```

Put the service behind Identity-Aware Proxy (IAP) so only Pith staff and invited client users can open it. The app has no sign-in of its own yet. Today the `x-pith-user` header selects a test user. In production, map the IAP user to an engine user and read the roles from the engine.

## Connect it to the real engine

The API under `/api` copies the paths in `engine/contracts/openapi.yaml` (`/runs`, `/runs/{id}/cancel`, `/approvals`, `/approvals/{id}/decisions`, `/metrics`, `/clients/{id}`). When the engine runs:

1. Replace `Store` in `server/app.ts` with a client that calls the engine API with the user's token.
2. Keep the UI-only read models (`/overview`, `/services`) in this server, built from engine data.
3. Remove the test clients in `server/seed.ts`.
