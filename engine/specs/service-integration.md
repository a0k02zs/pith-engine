# How a service plugs into the engine — v0.1.2

Use this checklist in every service thread. Put your service files in `/mnt/project-files/services/<service>/`.

1. **Service code.** Use your code from `contracts/enums.json` → `services` (for example `email`, `paid_social`, `crm_ops`).
2. **Workflows.** Write each plan pipeline as a `workflow-definition.json` with id `<service>.<name>`. Keep the standard order in `specs/workflow.md` §3. Name the risk on every tool step.
3. **Brain.** Every agent step reads `GET /clients/{id}/brain?market=`. Write results with `POST /learnings`.
4. **Recipients.** Only `POST /audiences/resolve`. Never pull contacts from a CRM inside a send step.
5. **Compliance.** A `check` step with `compliance` before every send, publish or launch.
6. **Approvals.** Use `gate` steps with shared kinds from `approval-inbox.md`. Do not prefix kinds or roles with your service.
7. **Events.** Your own events are `svc.<service>/<noun>.<verb>`. Results go to `engine/outbound.recorded` and `engine/metric.recorded` with shared KPI codes, or `<service>.<name>` for service-only KPIs.
8. **New people.** Creators, talent, journalists, partners, affiliates and experts are `parties`. Usage rights are `rights_grants`.
9. **Campaign assets.** Every channel service registers a workflow `<service>.campaign_assets`. Campaigns (2) starts it as a subflow child run (with `parent_run_id`) and waits for it before launch QA. The child run builds and approves the assets, registers them as artifacts, and finishes with `output.artifact_ids[]`. It never waits for the launch. A channel never publishes campaign assets until it receives `svc.campaigns/market.launched` for its market: put the publish steps in a second workflow `<service>.campaign_go_live` with that event as its trigger (contract 0.1.1). Paid channels create their campaigns paused; Campaigns activates them. Details: `/mnt/project-files/services/campaigns/workflows/contracts.md`.
10. **Tool names and risk.** Tool step `name` values are in `enums.tool_registry`; actions of the tool `engine` are in `enums.engine_actions`; risk meanings are in `enums.tool_risk_meaning`. ESP list syncs are `write_internal`; suppression, pause and opt-out syncs are `remove`.
11. **Check your wiring.** Run `node engine/scripts/lint_workflows.mjs` before you open a PR. It checks every workflow in the repository: step references, subflow ids, roles, approval kinds, tool names, engine actions and guardrails G1, G2 and G6. CI runs it on every change to a workflow or a contract.
12. **Need a change?** Message the engine thread with the exact field, code or endpoint. Minor additions ship the same day.

## Name mapping for early drafts

Some threads wrote against assumed names before v0.1.0 existed. Map them like this:

| Assumed | Engine v0.1.0 |
|---------|---------------|
| `brain.get`, `get_brand`, `client_brain.get` | `GET /clients/{id}/brain` → `brand-profile.json` |
| `banned_words`, `banned_terms` | `banned_terms[]` |
| sender identity (legal name, postal address) | `sender_identity` |
| `approval.request`, `create_approval`, `approvals.request` | `POST /approvals` (or a `gate` step) → `approval-item.json` |
| `item_type`, `type` on approvals | `kind` |
| `approver_role` | `required_roles[]` (+ `required_count`) |
| `sla_hours` | gate `sla_hours` → item `sla_due_at` |
| `approval.decided` | `engine/approval.decided` |
| `compliance.check` result `pass`/`fail`/`needs-human` | `pass` / `block` / `warn` |
| `analytics.track`, `email.sent`, `email.clicked`, ... | `engine/outbound.recorded` with `service`, `type` |
| `campaign/brief.submitted` and other campaign events | `svc.campaigns/brief.submitted` |
| creator entity | `party.json` with `kind=creator`, `licences[]` |
| likeness and voice consent | `rights-grant.json` (`scope`: likeness, voice_clone, avatar, ...) |
| `content.plan`, `content.final_copy`, `content.new_claim` | `kind=plan`, `copy`, `claim` with `service=content` |
| `pith.content_lead`, `client.subject_expert`, `external.customer_contact` | `content_lead`, `subject_expert`, `external_contact` |
| `geo.citation_share` | `ai_citation_share` |
| `content.*` KPIs | allowed as service-only KPIs |
