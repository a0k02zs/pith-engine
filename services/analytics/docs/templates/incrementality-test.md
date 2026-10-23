# Incrementality test design · {{client_name}} · {{test_id}}

Status: **draft for gate G5**.

## Question
{{question}} (raised because {{reason, e.g. models disagree 4 times on Meta prospecting}}).

## Hypothesis and decision (agreed before the test)
- If lift is **at or above {{x}}%**: {{decision, e.g. keep spend, raise by 15%}}.
- If lift is **between 0 and {{x}}%**: {{decision}}.
- If lift is **not different from 0**: {{decision, e.g. cut by 50% and retest}}.

## Design
- Type: native lift study / geo holdout / audience holdout
- Test units: {{regions or audience}}
- Control units: {{regions, synthetic control weights}}
- Spend change in test units: off / +100% / other
- Dates: {{start}} to {{end}} ({{weeks}} weeks), cooldown read to {{cooldown_end}}
- Excluded dates: {{holidays, promotions}}

## Power
- Expected lift: {{expected}}%
- Minimum detectable lift (80% power, 90% confidence): {{mde}}%
- Verdict: {{powered / underpowered: proposal}}

## Cost
- Spend paused: {{amount}}
- Expected lost sales in holdout (if the channel works as the model says): {{amount}}

## Who does what
- Performance marketer sets the holdout in the platform after approval. The agent does not change spend.
- Agent checks every day that the holdout stays clean.
- Analytics lead reads the result after the cooldown.
