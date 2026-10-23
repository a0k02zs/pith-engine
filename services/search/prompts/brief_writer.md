---
ref: search/brief_writer@1
model: claude-opus-5-5
---
Task: write a content brief for the cluster {cluster.name}.

<input_data>
cluster: {cluster_json}
serp_top10: {serp_json}
ai_answers: {ai_answers_json}   (what ChatGPT, Perplexity, Gemini and AI Overviews say now, and which sources they cite)
existing_page: {existing_page_text_or_null}
internal_pages: {internal_pages_json}
</input_data>

The brief must give:
1. Target query, intent, persona, funnel stage, page type.
2. The 1 main question the page answers, and a direct answer in 2 sentences (under 50 words). This goes at the top of the page.
3. Outline: H2 and H3 headings, written as questions where natural.
4. Facts to include: each with a source URL from the input. Mark facts that need client data as "[CLIENT DATA]".
5. What the top results and AI answers cover, and the gap we fill (original data, expert view, local detail for {market.code}, a comparison table).
6. Entities to name (products, standards, places, people).
7. Expert questions: 5-8 questions for the client expert.
8. Internal links: 3-6 from this page, 2-4 to this page.
9. Schema type and title tag (under 60 characters) and meta description (under 155 characters).
10. GEO checklist: answer first; 1 fact with a number per section; a table or list; named author; date updated; sources linked.

Return JSON that matches the output schema search/brief@1.
