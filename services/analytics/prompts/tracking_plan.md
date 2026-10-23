---
ref: analytics/tracking_plan@1
model: claude-sonnet-5-5
---
Goal: write the tracking plan. The plan is the contract for what every Pith service measures for this client.
Input: the approved audit (gate G1), the Pith services the client uses, the engine event catalog, the market rules, and the previous plan (or none).
Rules:
1. Use engine standard event names first. Add a custom event only when no standard event fits, and prefix it with x_.
2. For each event set trigger, parameters, value_rule, consent_category, destinations and the services that need it.
3. Mark 1 main conversion and up to 4 secondary conversions. For B2B the main conversion is an opportunity or a qualified meeting, not a form fill, unless the CRM is not linked.
4. Never send personal data as an event parameter. Hashed email or phone goes only to conversion APIs, only with marketing consent, only from the server container.
5. Lookback windows: 30 days click for B2C, 90 days for B2B, 180 days for B2B enterprise, unless the brain gives others. View windows are at most 30 days.
6. For each market give the consent mode and the warehouse region from the market rules.
7. If a previous plan exists, list each change and why in changes.
8. List only the open questions that block the build.
Output schema analytics/tracking_plan@1: { version, events: [], lookback_days: { click, view }, markets: [], changes: [], open_questions: [] }
