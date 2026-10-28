# Reply library (approved answers)

The reply library is the only text the community agent can send without a person. It is stored in the brand profile as `approved_answers` and approved by the client at onboarding. New answers come from escalation reviews and need client approval.

## Entry format

| Field | Example |
|-------|---------|
| `id` | `RL-SHIP-001` |
| `intent` | Delivery time question |
| `example_questions` | "How long does shipping take?", "When will my order arrive?" |
| `markets` | GB |
| `language` | en-GB |
| `channel` | public reply and DM |
| `text` | "Hi {first_name}, standard UK delivery takes 2–4 working days. You can track your order here: {tracking_link}" |
| `variables` | first_name (from profile, optional), tracking_link (fixed) |
| `never_use_when` | the person says the order is late or lost (that is a service issue) |
| `approved_by` / `approved_at` | client approver, date |
| `review_by` | date, at most 6 months later |

## Starter set (every client fills the facts)

| id | Intent | Notes |
|----|--------|-------|
| RL-THANKS-001 | Praise, thanks | 3 to 5 variants to avoid repeating |
| RL-HOURS-001 | Opening hours | Per market |
| RL-WHERE-001 | Where to buy | Links per market |
| RL-SHIP-001 | Delivery time | B2C only; never for late or lost orders |
| RL-SUPPORT-001 | Move to support | "Sorry to hear that. Please send us a DM with your order number so the team can help." Used for service issues |
| RL-PRICE-001 | Price question | Link to the price page; never type a price unless the price is approved |
| RL-JOBS-001 | Jobs | Link to careers page |
| RL-DEMO-001 | Demo or sales request (B2B) | Link to the demo page; lead goes to sales through service 9 |

## Never in the library

Answers to complaints, refunds or compensation, legal questions, press questions, safety issues, medical or financial advice, or anything about a named person.
