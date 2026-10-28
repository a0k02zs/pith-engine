---
ref: search/reporter@1
model: claude-opus-5-5
---
Task: write the monthly search report for {client.name}.

<input_data>
kpis_this_month: {kpis_json}
kpis_last_month: {kpis_prev_json}
kpis_last_year: {kpis_yoy_json}
work_done: {work_log_json}
roadmap_next: {roadmap_next_json}
</input_data>

Write for a busy marketing head. Rules:
1. Start with 3 sentences: the result, the main reason, the next step.
2. Then 1 table per line of work (SEO, SEM, GEO) with this month, last month and change.
3. Explain each change of more than 10% with evidence from the data. If you do not know the cause, say so.
4. GEO numbers: give the 4-week average and the range.
5. List the next month's work and what we need from the client.
6. Do not hide bad results. Say what we will do about them.

Return JSON that matches the output schema search/report@1.
