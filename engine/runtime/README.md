# Pith M engine runtime

This package runs the service workflows (`services/*/workflows/*.json`). It applies the guardrails in code.
It needs Node 22.18 or later. Node runs the TypeScript files directly. There is no build step.

The rules of a run are in [`engine/specs/workflow.md`](../specs/workflow.md), sections 1a and 1b.

## What is in the package

| File | Function |
|---|---|
| `src/expr.ts` | Evaluates the expressions of a workflow (a subset of CEL). |
| `src/graph.ts` | Checks a definition. The linter and `POST /workflows` use the same checks. |
| `src/runner.ts` | The `Engine`: starts runs, moves them through the steps, handles gates, waits, retries and child runs. |
| `src/guardrails.ts` | Guardrails G1, G2, G5, G6 and G10 at run time. |
| `src/memory-store.ts` | A store in memory. Use it for tests and the simulator. |
| `src/pg-store.ts` | The Postgres store. It uses the tables of `engine/db/001_core.sql` and `002_runtime.sql`. |
| `src/server.ts` | The HTTP API (`engine/contracts/openapi.yaml`) and the start command. |
| `src/simulate.ts` | The run simulator. It tries every outcome of every decision point of a workflow. |
| `src/mock.ts` | Handlers that do no real work. Tests, the simulator and development use them. |

## Commands

Run these commands in `engine/runtime`.

| Command | Result |
|---|---|
| `npm ci` | Installs the packages. |
| `npm run typecheck` | Checks the types. |
| `npm test` | Runs the tests. The Postgres tests run only when `DATABASE_URL` is set. |
| `npm run simulate` | Simulates all workflows. The command fails when a path fails or a step never runs. |
| `npm run migrate` | Applies the database schema. You can run it again safely. |
| `npm start` | Starts the engine and the HTTP API. |

**Warning:** the Postgres tests delete the schema `engine` and make it again. Give them a test database only.

A local Postgres that has no `pgvector` extension can run the tests with `PITH_DB_NO_VECTOR=1`.

## Start the engine

1. Make a Postgres 16 database that has the `pgvector` extension.
2. Set `DATABASE_URL` and run `npm run migrate`.
3. Set `PITH_ENGINE_SERVICE_TOKEN`.
4. Run `npm start`.

The engine registers each workflow in `services/*/workflows` when it starts. It prints the definitions it refuses.

| Variable | Function |
|---|---|
| `DATABASE_URL` | The Postgres database. Necessary unless `PITH_ENGINE_DEV=1`. |
| `PITH_ENGINE_SERVICE_TOKEN` | The bearer token of the services. 24 characters or more. |
| `PITH_ENGINE_USER_TOKENS` | JSON: token to `{ "id", "roles", "client_ids" }`. A temporary source of people until personal sign-in exists. |
| `PORT` | Default `8787`. |
| `PITH_ENGINE_TICK_SECONDS` | How frequently the engine looks for waits, retries and timeouts that are due. Default `30`. |
| `PITH_ENGINE_DEV` | `1` lets the engine start with no token and with the memory store. Do not set it in production. |
| `PITH_ENGINE_HANDLERS` | `mock` uses the handlers that do no work. This works only with `PITH_ENGINE_DEV=1`. |

Do not put a token in the repository.

## Limits

- **1 engine process for each database.** The process takes a Postgres advisory lock. A second process stops with an error.
- **No adapters are connected.** An agent step, a tool step or a compliance check fails with "no adapter is connected". The integration adapters are a different build.
- **No cron triggers.** A caller must start a run through `POST /runs` or an event.
- **No loader for the functions of a service.** A `check` step that calls a service function (for example `flows.match`) needs a handler.
- **People come from `PITH_ENGINE_USER_TOKENS`.** Personal sign-in and roles are a different build.

## The simulator

`npm run simulate` runs each workflow on the real runner with the memory store. A path is 1 run with 1 list of choices:
each target of a branch, a skipped and a not skipped gate, an approval and a changes request, an event and a timeout.

The limit is 250 ordered paths for each workflow. Above the limit, the simulator adds 250 random paths with a fixed seed.

`simulate.config.json` gives fixtures by workflow id:

- `input`, `markets`: the input of the run.
- `outputs`: outputs of agent and tool steps, when a later step needs a value.
- `impossible`: paths that the data cannot take. Each entry needs a reason.
