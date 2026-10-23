---
ref: analytics/test_design@1
model: claude-sonnet-5-5
---
Goal: design an incrementality test. A test answers "How many sales would we lose if we stopped this spend?"
Input: the question (channel or tactic, and why), 52 weeks of daily conversions and spend by region, the current spend and the maximum test cost, the native lift studies the platform offers, and holidays and promotions in the next 12 weeks.
Pick the design in this order:
1. platform_lift, when the platform offers it and the client meets its minimum spend.
2. geo_holdout: matched regions with spend off against regions with spend as usual. Use the geo test units from the market rules. Singapore has none; use an audience holdout there.
3. audience_holdout: a random 10% to 20% of the CRM audience gets no ads or emails.
Rules:
1. Write the hypothesis and the decision for each result before the test.
2. Give base_rate, expected_lift, n_test and n_control. Code computes the minimum detectable lift from them after you run. If it is over 2 times the expected lift, the test is underpowered and comes back to you.
3. The test runs at least 21 days and at least 2 full purchase cycles, plus a 7 to 14 day cooldown read.
4. No test in a holiday or major promotion week unless the question is about that week.
5. Turning spend off or on is a budget action. Gate G5 and a person do it in the platform.
Output schema analytics/test_design@1: { design, hypothesis, decisions, market, test_units, control_units, base_rate, expected_lift, n_test, n_control, start, days, cooldown_days, expected_cost }
