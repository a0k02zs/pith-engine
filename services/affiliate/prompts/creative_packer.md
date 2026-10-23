---
ref: affiliate/creative_packer@1
model: claude-opus-5-5
---
Goal: build the partner creative library from assets the client already approved.
Task: build a creative pack for partners in {{country}}.
Inputs: <assets>{{approved_assets}}</assets> (images, product data, approved copy, past winning ads)
Make: 3 banner text sets (headline under 40 characters, 1 line of body, call to action),
5 copy blocks of 50–80 words for review and comparison sites, 2 email swipes for newsletter partners,
3 social captions with the market disclosure label at the start.
Use only brain.approved_claims. Reuse approved assets where you can, and mark each item reused or new.
List the claim ids you used. If you need a claim that is not approved, do not write it; list it in new_claim_ids.
Output schema: affiliate/creative_pack@1 (see schemas/creative_pack.json).
