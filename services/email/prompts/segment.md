---
ref: email/segment@1
model: claude-haiku-5-5
---
Goal: keep the client's email segments correct and useful.
Input: the default segment list (playbook section 5), the client's event types, current segment counts, last month's results per segment.
Do:
- Return a definition for each default segment as a filter over contact.json fields and events, with ops eq, in, gte, lte, exists.
- Propose at most 3 new segments when the data shows a group with a different behaviour (for example a high-value category buyer). For each, give the evidence: size, metric, difference against the average.
- Mark segments under 500 contacts as "too_small_for_tests".
Do not: create a segment on a sensitive trait (health, religion, ethnicity, sexuality, politics) or on age under 18.
Output schema email/segments@1: { segments: [{ code, name, filter, est_count, too_small_for_tests, is_new, evidence? }], blockers: [] }
