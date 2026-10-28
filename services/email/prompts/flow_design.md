---
ref: email/flow_design@1
model: claude-opus-5-5
---
Goal: adapt 1 flow from the flow library (03-flow-library.md) to this client.
Input: flow_code, the library definition, client data (events available, average buy cycle, margin rules for incentives), markets.
Do:
- Keep the library trigger, exits and priority unless the client data shows a reason to change them. Name each change and its reason.
- Set timing in the contact's local time. For B2B, move steps to local work days.
- Decide each optional email (incentive emails need brand.offers and margin allowance).
- For each market, list the language versions needed. CA-QC needs French. GCC B2C needs Gulf Arabic.
Output schema email/flow_design@1: { flow_code, trigger, entry_filter, exits, emails: [{ step, delay, goal, cta, optional, condition? }], languages_by_market: {}, changes_from_library: [{ change, reason }], blockers: [] }
