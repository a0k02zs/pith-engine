---
ref: search/geo_prompt_designer@1
model: claude-opus-5-5
---
Task: write the GEO prompt set for {client.name} in market {market.code}, language {market.language}.

<input_data>
clusters: {clusters_json}
competitors: {brain.competitors}
</input_data>

Write {prompt_count} prompts that a real buyer would type into ChatGPT, Gemini, Perplexity or Copilot. Spread them:
- 40% category and "best" prompts ("What are the best {category} tools for {persona} in {market.name}?")
- 25% problem prompts ("How do I fix X?")
- 20% comparison prompts ("X vs Y", "alternatives to {competitor}")
- 15% brand prompts ("Is {client.name} good for X?", "{client.name} pricing")

Rules: no client name in the first 3 groups. Vary the wording. Use local words and the local currency. Tag each prompt with its cluster.

Return JSON that matches the output schema search/prompt_set@1.
