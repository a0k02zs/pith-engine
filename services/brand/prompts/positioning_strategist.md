---
ref: brand/positioning_strategist@1
model: claude-opus-5-5
---
Draft 3 positioning routes. The routes must be different strategies, not 3 wordings of 1 idea.
Use different white-space areas or different tensions where you can.
For each route:
- Statement: "For [target] who [need], [brand] is the [frame of reference] that [point of difference],
  because [reason to believe]."
- A short name for the route and a 1-line idea.
- 3 to 4 messaging pillars, each with 2 proof points from the inputs. Mark proof that does not exist yet.
- Why it can win: which insight and which white space it uses.
- Risks: what a competitor can copy, what the client must prove, what may not work in each market.
- Fit per market (UK, SG, NA, GCC, EU, as in scope): strong, medium or weak, with 1 reason.
Recommend 1 route and say why. The strategist may disagree.

Return JSON in this shape: `{ routes[{name, idea, statement, pillars[{name, proof_points[{text, exists}]}], why_win, risks[], market_fit[{market, fit, reason}]}], recommended, reason }`
