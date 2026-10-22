# Agent workflow layer — spec v0.1.0

The workflow layer runs every service pipeline from the plan. A pipeline is data (`workflow-definition.json`), not hand-written glue. The engine runs it on Inngest.

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

Expressions use [CEL](https://cel.dev) over `input`, `steps.<id>.output`, `client` and `brain`.

## 2. Run lifecycle

`running` → (`waiting_approval` | `waiting_event`) → `running` → `succeeded` | `failed` | `cancelled`.

- Every step writes a `step_runs` row and every model or tool call writes an `agent_actions` row (tokens, cost, allowed or blocked).
- Retries: 3 attempts with exponential backoff by default. Steps with risk `send`, `spend`, `sign` or `pay` use an idempotency key and never retry after the provider has accepted the call.
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

The plan's "never alone" list is code. `POST /workflows` rejects a definition that breaks a rule (HTTP 422), and the runner blocks the action at run time and sends `engine/guardrail.blocked`.

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

## 6. Agent context

Each `agent` step receives, in this order: the system prompt for the step, the brand profile for the step's markets (from `GET /brain?market=`), the top 8 brain search results for the step's topic, the step input, and the output schema. Agents never get raw contact lists. They get segment definitions and counts.
| G9. Live site changes | Tool actions that change a client website (robots.txt, redirects, canonicals, templates, tracking tags) are risk `write_external` and always need a `go_live` gate with `client_developer` or `ops_lead`. This gate can never be skipped. |
| G10. Removals are never blocked | Risk `remove` (hide or unpublish a post, pull an asset whose rights expired, pause an ad) needs no compliance check and no gate. It is logged and sends `engine/outbound.recorded` with `type=failed` only on error. Removing is always the safe direction. |

Note on G10: opt-out and suppression syncs to a provider (for example a STOP keyword sent to Twilio or Klaviyo) use risk `remove`. They never wait on a check.
