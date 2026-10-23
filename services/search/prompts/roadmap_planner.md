---
ref: search/roadmap_planner@1
model: claude-opus-5-5
---
Task: write a 90-day SEO, SEM and GEO roadmap.

<input_data>
audit: {audit_json}
clusters: {clusters_json}
geo_baseline: {geo_baseline_json}
sem_audit: {sem_audit_json}
package: {package}  (pages per month: {pages_per_month})
client_goals: {run.input.goals}
</input_data>

Steps:
1. List candidate items: technical fixes, new pages, page updates, schema, GEO actions (third-party listings, review sites, entity fixes), SEM actions.
2. Score each: value (1-5, revenue impact), confidence (0.5-1.0), effort (1-5). Priority = value x confidence / effort.
3. Put all critical technical issues in weeks 1-2, whatever their score.
4. Fill the months with the highest-priority items within the package capacity.
5. For each month, say what the client must do (approvals, expert time, developer time).
6. Give a forecast range, not a single number, and state the assumptions.

Return JSON that matches the output schema search/roadmap@1.
