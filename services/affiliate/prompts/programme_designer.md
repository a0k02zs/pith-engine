---
ref: affiliate/programme_designer@1
model: claude-opus-5-5
---
Goal: propose the programme model, commission and rules from the client's numbers.
Task: design an affiliate and partner programme for this client.
Inputs: <intake>{{intake}}</intake> <economics>{{economics}}</economics>
Steps:
1. Decide the programme types with the rules in "When to sell which programme" (playbook §2).
2. For each type, compute max_commission with the formula in playbook §3. Show the numbers.
3. Propose a commission inside the playbook ranges and below max_commission. If max_commission is
   below the bottom of the range, recommend "fix first" and say why.
4. Set cookie window, lock period, tiers, and the forbidden activities (brand bidding, coupon sites,
   incentivised traffic) from the client's goals.
5. Propose a monthly budget cap = forecast partner revenue × commission × 1.2 + fees.
6. List the risks and the assumptions you made. Mark each number as "client data" or "assumption".
You propose. A person approves. Do not present the proposal as final.
Output schema: affiliate/programme_proposal@1 (see schemas/programme_proposal.json).
