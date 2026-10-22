# Content brief — template

The planner agent fills 1 brief for each piece. The content lead approves briefs at the "Approve plan" gate.
Fields in `{curly braces}` are variables. Fields marked (required) must not be empty.

```yaml
brief_id: {cm-YYYYQn-NNN}                # required
client_id: {client uuid}                 # required, from the engine
market: {UK | SG | US | CA | AE | SA | QA | KW | BH | OM | EU-NL ...}   # required
language: {en-GB | en-US | fr-CA | ar-AE ...}                          # required
format: {blog | whitepaper | ebook | case_study}                       # required
audience: {B2B | B2C}
persona: {persona id from the client brain}                            # required
funnel_stage: {awareness | consideration | decision | retention}
pillar: {pillar topic name}
buyer_question: "{the exact question this piece answers}"             # required
search_cluster: [{primary keyword}, {secondary}, ...]
ai_prompts_to_win: ["{prompt a buyer types into ChatGPT, Gemini or Perplexity}", ...]
source_of_question: {sales_call | support_ticket | search_data | ai_prompt | campaign}
original_input: {expert_interview | client_data | customer_story | test}   # required
expert: {name and role of the client expert}
working_title: "{title}"
angle: "{1 sentence: what we say that competitors do not}"            # required
outline: [ "H2 ...", "H2 ...", ... ]
claims_needed: ["{claim}", ...]          # each must exist in the client brain or go to the new-claim gate
sources_to_cite: ["{url or document}", ...]
cta: {demo | download | trial | subscribe | contact | buy}
internal_links: ["{url}", ...]
competitor_pages: ["{url}", ...]
word_count_target: {number}
due_date: {YYYY-MM-DD}
repurpose: {true | false}
kpi_targets: { organic_sessions_90d: {n}, conversions_90d: {n} }
```

## Brief quality check (the planner agent runs this before it sends the plan)

1. The buyer question is a real question from a named source.
2. The angle is different from the top 3 competitor pages.
3. The piece has 1 original input.
4. Every claim is in the client brain, or it is marked `new_claim`.
5. The market and language match `market-rules.json`.
