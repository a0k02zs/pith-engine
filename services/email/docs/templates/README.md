# Email templates

Version 0.1, 21 Oct 2026. These are copy skeletons and 1 HTML base. The copywriter agent fills them from the client brain. Each skeleton is a starting point; the agent writes the final copy in the client voice and the contact's language.

## Files

| File | What it has |
|---|---|
| `base-email.html` | Responsive HTML base for all emails. Works for left-to-right and right-to-left (Arabic). |
| `footers.md` | Required footer blocks for each market. |
| `b2c-flows.md` | Skeletons for flows B2C-01 to B2C-07. |
| `b2b-flows.md` | Skeletons for flows B2B-01 to B2B-05. |
| `shared-and-outbound.md` | Newsletter, sunset, re-permission and the cold outbound sequence. |

## Variables

Variables use `{{double_braces}}`. The send platform fills contact variables. The copywriter agent fills brand variables at write time.

| Variable | Source | Example |
|---|---|---|
| `{{first_name}}` | Contact record | Jane |
| `{{first_name | fallback: "there"}}` | Contact record with fallback | there |
| `{{company}}` | Contact record (B2B) | Acme Ltd |
| `{{brand_name}}` | Client brain | Northwind |
| `{{sender_legal_name}}` | Client brain, sender identity | Northwind Trading Ltd |
| `{{sender_postal_address}}` | Client brain, sender identity | 1 High St, London EC1A 1AA |
| `{{sender_name}}` | Client brain (person or team) | Sam at Northwind |
| `{{offer}}` | Client brain, approved offers only | 10% off your first order |
| `{{offer_end_date}}` | Client brain | 31/10/2026 |
| `{{product_block}}` | Platform product feed | (dynamic block) |
| `{{cart_url}}` | Platform | (link) |
| `{{asset_title}}`, `{{asset_url}}` | Content thread | 2026 Benchmark Report |
| `{{booking_url}}` | CRM or calendar tool | (link) |
| `{{rep_name}}` | CRM deal owner | Priya |
| `{{unsubscribe_url}}`, `{{preferences_url}}` | Platform | (link) |
| `{{privacy_notice_url}}` | Client brain | (link) |
| `{{utm}}` | Engine UTM standard | utm_source=email&... |
| `{{lang}}`, `{{dir}}`, `{{start_side}}` | Market rules (HTML base) | `ar-AE`, `rtl`, `right` |
| `{{brand_logo_url}}`, `{{brand_primary_color}}`, `{{brand_link_color}}`, `{{brand_font_stack}}` | Client brain (HTML base) | `#6B2D5C`, `Arial, sans-serif` |

## Rules for every template

1. 1 goal and 1 main call to action per email.
2. Subject line: under 50 characters where possible. Preview text: under 90 characters, and it adds to the subject.
3. No claim that is not in the client brain approved claims list. A new claim goes to approval kind `claim`.
4. No offer that is not in the client brain approved offers.
5. Every link has the engine UTM parameters.
6. Images have alt text. The email still makes sense with images off.
7. Plain-text version for every HTML email.
8. Footer from `footers.md` for the contact's market.
