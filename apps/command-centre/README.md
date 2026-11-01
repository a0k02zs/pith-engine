# Pith Command Centre

One web app to monitor and operate all 18 Pith Marketing services. It works like an ERP for the agency: every client, every pipeline run, every approval and every KPI in one place.

The app reads the real engine contracts and pipelines from this repo. It uses **test data** for clients, runs and metrics until the engine runs with real clients.

## Modules

| Page | What you do there |
|------|-------------------|
| Command deck | See spend, revenue, ROAS and leads for 28 days, what needs you now (overdue and urgent approvals, failed runs, paused clients), and a health tile for each of the 18 services. |
| Approvals | The approval inbox from `engine/specs/approval-inbox.md`. Filter by your roles, overdue or urgent. Approve, request changes (with a comment) or reject. Bulk-approve items of one kind. |
| Runs | Every workflow run. A run page shows each step with its type, tool risk, gate and status. You can send a waiting event, mark a task done, or cancel the run. |
| Services | 1 workspace for each service: its pipelines (read from `services/*/workflows/*.json`), daily KPIs, runs and approvals. **Start run** starts any pipeline for a client and its markets. |
| Clients | Markets, services, KPIs and runs for each client. **Pause everything** runs the engine action `client.pause_scheduled` for a crisis. |
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
