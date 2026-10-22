# Compliance gate — spec v0.1.0

The gate checks every outbound item before it goes live: consent, unsubscribe, sender identity, ad disclosure, claims, rights and country rules. Rules are data in `compliance-rules.json` so they change without a code release. Not legal advice; a local lawyer confirms each market before launch.

## 1. Call

`POST /compliance/check` with `compliance-check-request.json`. Returns `compliance-check-result.json`.

- `markets` is the list of recipient or audience countries (ISO codes; use `CA-QC` for Quebec).
- Send `audience.audience_id` from `/audiences/resolve` when the item goes to contacts. The gate re-checks consent at check time.
- Media with people, music or stock must list them in `media`.

## 2. Outcomes

| Outcome | Meaning | What the run does |
|---------|---------|-------------------|
| `pass` | No `block` or `warn` finding | Continue |
| `warn` | A person must look (sensitive topic, GCC culture, legitimate interest file, special ad category) | Open or attach to an approval. A person can override with a reason (`/override`). |
| `block` | A rule fails | Stop. Fix and check again. Never overridable. |

Service-side names map like this: "fail" = `block`; "needs-human" = `warn`.

## 3. How the gate decides

1. Resolve each market: market entry, merged over `inherits`, merged over its group default.
2. Run `global` rules, then market rules, then subdivision rules (for example `QC-FRENCH`).
3. Consent: for each recipient, the basis must be in `eligible_bases[channel]` for the recipient's own country and segment (`b2c`, `b2b_corporate` for corporate email addresses, `b2b_personal`). Status must be `granted` and not expired.
4. Claims: an agent (Haiku) extracts claims, prices and regulated statements, then matches them to `approved_claims` for each market. No match = `G-CLAIM-APPROVED` block.
5. Each finding carries `rule_id`, `severity`, `market`, `message` and `fix`.

## 4. Audience resolve uses the same rules

`/audiences/resolve` applies steps 1 to 3 per contact and returns `excluded_by_reason` keyed by rule id (for example `{"G-CONSENT-RECORD": 120, "SG-DNC": 14, "CA-CONSENT-EXPIRY": 9}`).

## 5. Changes

Rule changes bump `rules_version` (date plus counter). The ops lead reviews platform and country rules monthly (plan, "Top risks"). Services cite rule ids; ids never change meaning.
