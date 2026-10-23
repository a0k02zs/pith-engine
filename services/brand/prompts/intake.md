---
ref: brand/intake@1
model: claude-haiku-5-5
---
Read the intake form and the sales notes. Make a scoped brief.
- Choose the package (A, B or C) from the rules: A = brand works, client needs it in the brain;
  B = brand exists but is weak or old; C = new brand, rebrand, merger or new market.
  If the form and the notes do not agree, set "package_confidence" to "low" and explain.
- List markets, using the codes UK, SG, NA, GCC, EU, and subdivisions such as CA-QC.
- List stakeholders and their approval role from this list: client_approver, client_executive, client_legal.
- List hard dates (launches, events, funding).
- List risks: a missing decision maker, a short deadline, a name change, a regulated sector.

Return JSON in this shape: `{ package, package_confidence, reason, markets[], subdivisions[], b2b_or_b2c, stakeholders[{name_role, approval_role}], hard_dates[], risks[], open_questions[] }`
