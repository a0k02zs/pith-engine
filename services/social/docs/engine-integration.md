# Engine integration (contract v0.1.0)

Checklist from `engine/specs/service-integration.md`:

| # | Rule | How social does it |
|---|------|--------------------|
| 1 | Service code | `social` (enum value 4) |
| 2 | Workflows as data | 8 files in `workflows/`, ids `social.*`, all validate against `workflow-definition.json` |
| 3 | Brain | Every agent step reads `GET /clients/{id}/brain?market=`. Results go to `POST /learnings` (weekly report, escalation outcomes) |
| 4 | Recipients | Organic posts have no recipient list. DMs are only replies to people who wrote first. No step calls a CRM |
| 5 | Compliance | `check` with `compliance` before every `post.schedule`, `post.publish_now` and `reply.send`. Channels `social_post` and `social_reply` |
| 6 | Approvals | Shared kinds only: `plan`, `calendar`, `content`, `claim`, `copy`, `escalation`, `report` |
| 7 | Events | `svc.social/*` (list in `workflows/README.md`); results through `engine/outbound.recorded` (`type=posted`, `replied`) and `engine/metric.recorded` |
| 8 | People | Creators in collab posts are `parties`; UGC and faces in posts need `rights_grants` (scopes `ugc_reuse`, `likeness`) |

## Brand profile fields the social agents read

From `brand-profile.json`: voice, `banned_terms[]`, approved claims per market, offers, products, personas, competitors, `approved_answers` (the reply library).

## Social-only fields we store in the brain

Requested as optional fields (minor version), or stored as `learnings` until then:

- `social_autonomy_level` (1, 2 or 3)
- `social_pillars[]`: `{name, description, target_share, funnel_stage}`
- `social_accounts[]`: `{platform, handle, market, language, package, posts_per_week}`
- `social_time_windows[]`: per account, written by the analyst after Gate A
- `social_pause_list[]`: outside event types that trigger a Sev 1 pause
- `native_editor_languages[]`

## Requests sent to the engine thread

1. Add the optional brain fields above.
2. Add service-only KPI codes: `social.saves`, `social.shares`, `social.net_sentiment`, `social.first_pass_acceptance`, `social.auto_reply_share`, `social.escalation_minutes`, `social.on_time_rate`.
3. Add a role `community_manager` (today we use `social_lead`).
4. Confirm that `queue.pause` (pause scheduled posts) counts as risk `remove` under G10.

## Tools (integrations) used

| Tool name in workflows | Suggested product | Actions |
|------------------------|-------------------|---------|
| `social_publisher` | Sprout Social, Hootsuite or Later (plan) | `post.schedule`, `post.publish_now`, `queue.pause` |
| `social_inbox` | Same tool's inbox, or platform APIs | `accounts.verify_access`, `items.fetch_new`, `item.hide`, `reply.send` |
| `listening` | Brandwatch (plan) or Sprout listening | `signals.fetch` |
| `canva` | Canva brand templates (plan) | `template.fill_and_export` |
| `engine` | Engine API | `context.gather`, `artifacts.create`, `learnings.create`, `metrics.query` |
