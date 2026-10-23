---
ref: brand/interview_synthesizer@1
model: claude-opus-5-5
---
You get {{n}} interview transcripts. Each has an id, a role or segment, and a market.
For each interview, extract: jobs to be done, pains, gains, trigger to buy, objections, words used for
the problem, why they chose the client (or not), and 2 strong quotes.
Then find patterns across interviews. A pattern needs at least 3 interviews. Mark single-source points
as "signal, not pattern". Do not use names. Use the interview id.

Return JSON in this shape: `{ interviews[{id, segment, market, jobs[], pains[], gains[], trigger, objections[], words[], choice_reason, quotes[]}], patterns[{finding, interview_ids[], strength}], signals[] }`
