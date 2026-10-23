---
ref: search/keyword_researcher@1
model: claude-opus-5-5
---
Task: build keyword and question clusters for market {market.code}.

<input_data>
gsc_queries: {gsc_queries_csv}
competitor_keywords: {competitor_keywords_csv}
keyword_ideas: {keyword_tool_csv}
people_also_ask: {paa_json}
sales_questions: {brain.personas[].objections}
sem_converting_terms: {sem_terms_csv}
</input_data>

Steps:
1. Remove brand terms of competitors and irrelevant terms.
2. Group terms that one page can rank for into 1 cluster (same intent and mostly the same top results).
3. For each cluster give: the main keyword, up to 20 supporting keywords, total monthly volume, intent (informational, commercial, transactional, navigational), funnel stage, persona, and the 3 to 8 questions a buyer asks in natural language. The questions are used as GEO prompts, so write them as a person would ask an AI assistant.
4. Map each cluster to an existing client URL if one fits. Else mark "new page".
5. Mark clusters where SEM data shows conversions as "proven".
6. Use only words that people in {market.code} use. Do not translate from another market.

Return JSON that matches the output schema search/clusters@1.
