# Agent workflow layer — spec v0.1.2

The workflow layer runs every service pipeline from the plan. A pipeline is data (`workflow-definition.json`), not hand-written glue. The engine runtime in `engine/runtime` runs it. The runtime is a state machine on Postgres, so it needs no workflow service; Inngest stays an option for the event transport.

## 1. Step types

| Type | What it does | Notes |
|------|--------------|-------|
| `agent` | Calls Claude with the client brain, the step input and a prompt template. Returns JSON that matches `output_schema`. | Reads the brain by default (`reads_brain: true`). Model default `claude-opus-5-5` for writing and strategy, `claude-haiku-5-5` for classification. |
| `tool` | Calls an integration (Klaviyo, Meta Ads, Canva, HubSpot, ...). | Each tool action has a `risk` level (§5). |
| `check` | Runs brand score, compliance, spam, links, accessibility or fact checks. | `compliance` calls `POST /compliance/check`. A `block` fails the step. |
| `gate` | Opens an approval inbox item and waits for `engine/approval.decided`. | See `approval-inbox.md`. |
| `wait` | Waits for an event or a time (for example, A/B test end). | |
| `branch` | Chooses the next step from an expression on earlier outputs. | |
| `emit` | Sends an event (service-owned `svc.<service>/*` or `engine/outbound.recorded`). | |
| `task` | Opens a human task (not an approval) in the portal, such as recording an interview or filming. Waits until the assignee marks it done with the output. | Shown in the inbox under Tasks. |
| `subflow` | Starts another workflow as a child run, optionally once per market or channel. | Campaigns (2) uses this to start runs in other services. |

A `subflow` step finishes when every child run finishes, and fails as soon as 1 child run fails (the engine then cancels the other child runs). A child run must never wait for an event that the parent sends after the subflow step (deadlock). `workflow_id` can hold a template (`{{ input.service }}.campaign_assets`). `per` gives 1 child run for each item:

- A name such as `market` reads the list `input.markets`, then the list `markets` in the output of an earlier step, then the markets of the run. The child run gets `input.market`.
- An expression such as `steps.plan.output.briefs` must give a list. The child run gets `input.item`, and the fields of the item when the item is an object.

The guardrails of a child run also accept the approvals and checks that came before the subflow step in the parent run.

### 1a. How a run moves through the steps

- An edge goes from each step in `needs` to the step, and from a `branch` to each step that it can choose (`goto`, `else`).
- A step starts when every edge into it is decided and at least 1 edge is live. A `needs` edge is live when that step succeeded or was skipped. A branch edge is live when the branch chose the step.
- A step with no live edge is `not_taken`. A step with no edges starts with the run.
- A step that comes after a branch must be 1 of its targets. To join 2 paths again, the join step needs the last step of each path: `"needs": ["route", "side_step"]`. A step that needs only the branch does not run on the side path.
- `goto: "end"` with no step named `end` means: choose nothing.
- A branch that chooses an earlier step makes a loop. The run goes back, and that step and every step after it run again. A run can go back to the same step 10 times; then it fails.
- A `gate` with `on_changes` makes the same loop when a person asks for changes. The step gets the comment and the edits as `feedback`.
- A run succeeds when no step is left to run. A run fails when a step fails. The output of the run is the outputs of its last steps.

`POST /workflows` and `engine/scripts/lint_workflows.mjs` use the same code (`engine/runtime/src/graph.ts`). They refuse a definition with an unknown step, a step after a branch that the branch cannot choose, a cycle in `needs`, a gate that returns to a step that does not run before it, or an expression that does not parse. `node engine/runtime/scripts/simulate.ts` then runs every path of every workflow.

### 1b. Expressions

Expressions use the [CEL](https://cel.dev) syntax with these rules. The evaluator is `engine/runtime/src/expr.ts`.

| Name | Value |
|------|-------|
| `input` | The run input, with the defaults of `inputs.properties`. |
| `steps.<id>.output` | The output of a step. Also `steps.<id>.status` and `steps.<id>.timed_out` (true when a `wait` ended at its timeout). |
| `client`, `brain` | `client.id`, `client.markets`, and the client and brain data that the deployment supplies. |
| `run` | `run.id`, `run.workflow_id`, `run.markets`, `run.parent_run_id`, and `run.loops.<step id>`: how many times the run went back to that step. |
| `now` | `now.iso`, `now.date` (YYYY-MM-DD), `now.hour` (UTC) and `now.weekday` (`Monday` ...). |
| `event` | In `wait.match`: the incoming event (`event.data.campaign_id == input.campaign_id`). In other places: the event that started the run. |

- There is 1 number type: `1 == 1.0` is true.
- A field that does not exist is `null`, and it does not stop the run. `null` and `false` are false in a condition. A name that is not in the table is an error.
- Operators: `== != < <= > >= && || ! + - * / % in ?:`. Functions: `size`, `has`, `int`, `double`, `string`, `bool`, `abs`, `min`, `max`. Methods: `contains`, `startsWith`, `endsWith`, `matches`, `lowerAscii`, `upperAscii`, `size`. List macros: `exists`, `all`, `exists_one`, `map`, `filter`.
- An expression that fails at run time counts as false (the gate is not skipped, the case is not chosen, the event does not match) and puts a warning on the step.
- Text fields (`wait.event`, `wait.timeout`, `emit.event`, `subflow.workflow_id`) accept a template: `{{ expression }}` or `${expression}`.
- `wait.timeout` is `90m`, `48h`, `5d`, `2w`, a number of seconds, or a template that gives 1 of these or an ISO time.

The early-draft names `async.data`, `run.input`, `output.<step>` and bare `data` are not defined. No workflow in the repository uses them.

A `wait` step gives the event data as its output. An event ends a wait only when its `client_id` is the client of the run.

An `emit` step sends the run input, the object outputs of the steps it needs, and `run_id`, `client_id`, `workflow_id`, `service` and `step_id`.

## 2. Run lifecycle

`running` → (`waiting_approval` | `waiting_event`) → `running` → `succeeded` | `failed` | `cancelled`.

- Every step writes a `step_runs` row and every model or tool call writes an `agent_actions` row (tokens, cost, allowed or blocked).
- Retries: 3 attempts with exponential backoff by default (30 seconds, then 60 seconds). Steps with risk `send`, `spend`, `sign` or `pay` get an idempotency key (`<run id>:<step id>:<pass>`) and never retry after the provider has accepted the call: the engine tries again only when the adapter error says `safe_to_retry`.
- Step states: `pending`, `running`, `waiting`, `retry`, `succeeded`, `skipped`, `not_taken`, `failed`, `cancelled`. The run is `waiting_approval` when a gate or a task waits, and `waiting_event` for other waits.
- Changes requested at a gate send the run back to the step named in `gate.on_changes`, with the reviewer's comment and edits added to that step's input.

## 3. Standard shape of a service pipeline

Every plan pipeline maps to this pattern. Services can add steps but keep the order of the checks and gates.

```
ingest/research (agent|tool) → plan (agent) → GATE plan → create (agent) → CHECK brand+compliance
  → GATE copy/creative (skippable, see approval-inbox.md §4) → go live (tool: send|publish|spend)
  → measure (emit engine/outbound.recorded) → learn (agent → POST /learnings)
```

## 4. Example definition (email monthly calendar, from plan service 1)

```json
{
  "id": "email.monthly_send", "version": 1, "service": "email",
  "trigger": { "cron": "0 8 1 * *" },
  "steps": [
    { "id": "segment", "type": "agent", "agent": { "prompt_ref": "email/segment@1", "output_schema": "email/segments@1" } },
    { "id": "plan", "type": "agent", "needs": ["segment"], "agent": { "prompt_ref": "email/calendar@1" } },
    { "id": "approve_plan", "type": "gate", "needs": ["plan"],
      "gate": { "approval_kind": "calendar", "required_roles": ["account_lead"], "sla_hours": 48, "on_changes": "plan" } },
    { "id": "write", "type": "agent", "needs": ["approve_plan"], "agent": { "prompt_ref": "email/write@1" } },
    { "id": "check", "type": "check", "needs": ["write"], "check": { "kinds": ["brand", "compliance", "spam", "links"], "min_brand_score": 80 } },
    { "id": "approve_copy", "type": "gate", "needs": ["check"],
      "gate": { "approval_kind": "copy", "required_roles": ["client_approver"], "sla_hours": 48,
                "skip_if": "steps.write.output.template_reused && size(steps.write.output.new_claim_ids) == 0", "on_changes": "write" } },
    { "id": "send", "type": "tool", "needs": ["approve_copy"], "tool": { "name": "klaviyo", "action": "campaign.send", "risk": "send" } },
    { "id": "learn", "type": "agent", "needs": ["send"], "agent": { "prompt_ref": "email/learn@1" } }
  ]
}
```

## 5. Guardrails (enforced by the engine, not by prompts)

The plan's "never alone" list is code. `POST /workflows` rejects a definition that breaks G2, G6 or G9 (HTTP 422). The runner checks G1, G2, G5 and G6 again before each tool call, with the real state of the run: a gate that was skipped or not taken does not count. It blocks the action, writes an `agent_actions` row with `allowed = false`, sends `engine/guardrail.blocked` and fails the run. G3, G4, G7 and G8 belong to the compliance service and the adapters, which are not built yet.

| Rule | Enforcement |
|------|-------------|
| G1. No new paid spend and no budget increase without a person | A `tool` step with risk `spend` must have a `gate` of kind `budget` or `budget_change` before it in the same run, unless the change stays inside `spend_policies` (≤ `max_auto_change_pct`, default 20%, and inside the caps). Total budget can never be raised by an agent. |
| G2. No contract signature and no payment without a person | Risk `sign` needs a `contract` gate; risk `pay` needs a `payout` gate. |
| G3. No new claim, price, or health, finance or legal statement without a person | The `compliance` check finds claim text that is not in `approved_claims` for the market; result `block` until a `claim` gate approves it. |
| G4. No reply to a complaint, journalist or regulator | Agents classify inbound messages. These classes raise `engine/escalation.raised` and the agent may not reply. Only `approved_answers` can be sent without review. |
| G5. No message to a contact without a consent record for their country | Recipients come only from `POST /audiences/resolve`. A `send` step that gets contacts any other way is rejected. |
| G6. Every live item passes the compliance gate | A step with risk `send` or `write_external` (publish) must have a `check` with `compliance` before it. |
| G7. Hard spend caps | The engine sets platform-side caps from `spend_policies`. Auto-pause when CPA is 50% over target for 3 days (plan, service 2). |
| G8. Likeness and voice | Media with `people[]` needs an active `rights_grants` row with the right scope and market. No grant means `block`. |
| G9. Live site changes | Tool actions that change a client website (robots.txt, redirects, canonicals, templates, tracking tags) are risk `write_external` and always need a `go_live` gate with `client_developer` or `ops_lead`. This gate can never be skipped. |
| G10. Removals are never blocked | Risk `remove` (hide or unpublish a post, pull an asset whose rights expired, pause an ad) needs no compliance check and no gate. It is logged and sends `engine/outbound.recorded` with `type=failed` only on error. Removing is always the safe direction. |

Note on G10: opt-out and suppression syncs to a provider (for example a STOP keyword sent to Twilio or Klaviyo) use risk `remove`. They never wait on a check.

## 6. Agent context

Each `agent` step receives, in this order: the system prompt for the step, the brand profile for the step's markets (from `GET /brain?market=`), the top 8 brain search results for the step's topic, the step input, and the output schema. Agents never get raw contact lists. They get segment definitions and counts.
