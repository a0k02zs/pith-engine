# Messaging service (service 10): SMS, WhatsApp and push

Pith M service for SMS, WhatsApp and push messages in the UK, the EU, the US, Canada, the 6 GCC countries and Singapore. It is built on the shared engine contracts v0.1.0 (`engine/`). The design documents are in `docs/`.

## What is here

| Path | What it holds |
|---|---|
| `market-rules.yaml` | Rules per market: consent basis, sender registration, send window, quiet days, opt-out words, required parts, languages. The engine compliance gate reads this file as the `sms`, `whatsapp` and `push` overlay (`engine/specs/compliance-rules.json`). Do not move it. |
| `workflows/messaging.*.json` | 10 workflows in the engine `workflow-definition.json` format |
| `prompts/*.md` | 6 agent prompts (plan, write, precheck, chat, optimize, report) and the shared preamble |
| `schemas/*.json` | Output schemas for each agent, and the sender registration record |
| `templates/*.json` | Template library: 25 SMS, 8 push, 11 WhatsApp (Meta Cloud API format) |
| `src/` | Rule functions that the workflows and the engine call (see below) |
| `test/` | Vitest tests for the rules, the template library, the schemas and the workflows |
| `vendor/engine-v0.1.0/` | Copies of the engine `enums.json` and `workflow-definition.json` that the tests check against |
| `docs/` | Playbook, approvals (gates G1 to G7), KPIs, engine contract notes, template notes |

## Rule functions (`src/`)

| Module | Function | Use |
|---|---|---|
| `market-rules.ts` | `resolveMarket(country, subdivision?)` | Rules for 1 contact. EU member states use the EU block with country overrides. `US-FL`, `US-OK` and `US-MD` add the stricter state rules. `CA-QC` sets `required_language: fr-CA`. |
| `window.ts` | `checkWindow()`, `nextAllowed()` | Marketing send window in the contact's time zone, quiet days, public holidays, Canadian weekend hours, the Saudi prayer-time pause for broadcasts. Utility messages have no hour limit. |
| `caps.ts` | `checkCaps()` | Marketing caps per contact: SMS and WhatsApp 1 per day and 4 per 30 days, push 1 per day and 5 per week. US state limit of 3 per 24 h on 1 topic. |
| `channel.ts` | `chooseChannel()` | The waterfall: push, WhatsApp (GCC, Singapore, UK, EU), SMS, then email. Critical messages skip push. WhatsApp free text only inside the 24 h window. SMS fallback after 10 minutes for utility messages. |
| `keywords.ts` | `classifyInbound()` | STOP, HELP and START words per market (whole message, any case), and the "Stop promotions" button in English and Arabic. No LLM. |
| `encoding.ts` | `segmentInfo()` | GSM-7 or UCS-2, and the segment count (160/153, 70/67). |
| `template-check.ts` | `checkSmsTemplate()`, `checkPushTemplate()`, `checkWhatsAppTemplate()`, `checkLinks()` | Brand first, opt-out line, 1 branded link, max 2 segments, no promotion in utility messages, push 40/120 characters, WhatsApp variables, examples and the stop button. |
| `holdout.ts` | `splitAudience()` | Stable broadcast split: 10% holdout (min 1000), 20% A/B test cell, the rest. |
| `prompt.ts`, `registry.ts` | `buildSystemPrompt()`, `validateOutput()`, `loadWorkflows()` | Agent prompts with the brain and market rules, and output validation. |

## Workflows

| Workflow | Trigger | Notes |
|---|---|---|
| `messaging.send` | subflow | The only send path. `audiences.resolve` (G5), the compliance gate (G6), then the `sms`, `whatsapp` or `push` adapter. |
| `messaging.client_onboarding` | `svc.messaging/client.onboarding.requested` | G1 plan, templates, sender registration, seed tests, G4 go live |
| `messaging.sender_registration` | `svc.messaging/sender.registration.requested` | A task for the ops lead per market, then the sender is stored on the provider |
| `messaging.template_lifecycle` | `svc.messaging/template.requested` | Write, pre-check, native review, G2 client approval, Meta submission |
| `messaging.triggered_send` | `engine/client.event` | Flows F01 to F13 for 1 contact |
| `messaging.broadcast` | `svc.messaging/broadcast.requested` | Holdout, G3 approval by 2 people, budget gate, A/B test cell, winner |
| `messaging.two_way_chat` | `svc.messaging/inbound.received` | Keywords first, then the chat agent, or G5 handoff to a person |
| `messaging.opt_out` | `svc.messaging/optout.received` | No gate and no LLM. Every sync uses risk `remove` (G10). |
| `messaging.optimize_and_report` | cron 06:00 UTC | Daily optimizer, Monday report (G6) |
| `messaging.campaign_assets` | subflow from Campaigns (2) | Templates first; the broadcast waits for `svc.campaigns/market.launched` |

## Run

```bash
npm ci
npm run typecheck
npm test
```

## Status

Draft 1. The rules are not legal advice. Items with `verify: true` in `market-rules.yaml` (GCC sender IDs and windows, Canadian senders, EU per country, US states) need local counsel or the aggregator to confirm them before the first live send in that market. The provider adapters (`sms`, `whatsapp`, `push`) and the engine runtime are not in this package.
