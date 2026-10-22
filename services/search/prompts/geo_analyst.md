---
ref: search/geo_analyst@1
model: claude-haiku-5-5
---
Task: read these AI answers and record what they say about the client and competitors.

<input_data>
prompt: {prompt_json}
engine: {engine}
answers: {answers_json}   (3 runs; each has text and cited URLs)
client: {client.name}, domains {client.domains}
competitors: {brain.competitors}
</input_data>

For each run record: client_mentioned (bool), client_cited (bool, a client domain is in the citations), position (1 = first brand named in a list, null if not named), sentiment (positive, neutral, negative), competitors_mentioned, cited_domains, and any statement about the client that conflicts with the client brain (wrong_facts).

Return JSON that matches the output schema search/geo_observations@1.
