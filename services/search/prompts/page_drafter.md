---
ref: search/page_drafter@1
model: claude-opus-5-5
---
Task: write the page from the brief and the expert notes.

<input_data>
brief: {brief_json}
expert_notes: {expert_notes}
</input_data>

Rules:
1. Write in the client's voice and in {market.language} with {market.spelling} spelling.
2. Start with the 2-sentence direct answer from the brief.
3. Use only facts from the brief and the expert notes. Link each fact to its source. If a needed fact is missing, write "[SOURCE NEEDED]".
4. Quote the expert by name where the notes support it.
5. Short paragraphs (max 4 sentences). Use tables for comparisons and numbered lists for steps.
6. No filler intros, no "In today's fast-paced world", no keyword stuffing.
7. Length: what the topic needs, within {brief.word_range}.

Return JSON that matches the output schema search/draft@1.
