# Influencer pipeline

Workflow files: `workflows/plan.json` (stages 1 to 4), `recruit.json` (5 to 6), `deliver.json` (7 to 9), `payout.json` (10), `weekly.json` (11). Gate names are engine approval kinds.

The plan has 9 stages. This build splits 2 of them, so the pipeline has 11 stages and 6 gates (the plan's 3 gates, plus plan, payout and paid amplification budget). A stage with **GATE** stops and waits for a person in the approval inbox.

| # | Stage | Owner | Gate | SLA |
|---|---|---|---|---|
| 1 | Intake | Strategy agent + influencer lead | **GATE `plan`** | 2 business days |
| 2 | Discover | Discovery agent | | 2 business days |
| 3 | Vet and score | Vetting agent | | 1 business day |
| 4 | Approve shortlist | Influencer lead + client | **GATE `shortlist`** | 2 business days |
| 5 | Outreach | Outreach agent | | Replies tracked for 10 days |
| 6 | Negotiate and contract | Negotiation agent drafts, person agrees | **GATE `contract`** | 3 business days per creator |
| 7 | Brief and ship | Brief agent + ops | | Brief within 1 day of signature |
| 8 | Content review | Review agent + person | **GATE `content`** | 2 business days per draft |
| 9 | Go live and verify | Monitor agent | | Check within 24 hours of the post date |
| 10 | Track and pay | Report agent + finance | **GATE `payout`** | Pay within 15 business days |
| 11 | Amplify and learn | Report agent + paid team | **GATE `budget`** | Weekly |

## Stage specs

### 1. Intake
- **Trigger:** client signs the service, or Campaigns (Service 2) sends a master brief.
- **Input:** client intake form (`templates.md` §1), client brain.
- **Steps:** the strategy agent checks the form for gaps and writes a campaign plan: play, markets, tier mix, creator count, budget split, timeline, KPIs.
- **Output:** `campaign` record; a `plan` gate (influencer lead + client) approves it.
- **Rule:** budget comes from the client. The agent cannot raise it.

### 2. Discover
- **Trigger:** `campaign.planned`.
- **Input:** market, platforms, audience persona, niche keywords, tier mix, exclusion list.
- **Steps:** the discovery agent queries the creator tool (Modash or Upfluence API) for each market and platform. It pulls 3 to 5 times the needed creator count. It also searches the client's own followers and tagged posts for fans who are creators.
- **Output:** engine `parties` (`kind=creator`) with `attributes.status = found`.

### 3. Vet and score
- **Trigger:** each new `creator.found`.
- **Steps:** the vetting agent pulls audience data, real-follower estimate, last 30 posts, past brand deals, and licence status (UAE, Saudi Arabia). It applies the hard stops and the score in `playbook.md` §4. It writes a 3-line reason for each score.
- **Output:** `creator.vetted` with score, risks and reason. Creators who fail a hard stop get status `rejected` with the reason.
- **Retry:** if the tool has no audience data, mark `needs_data` and ask the creator for an insights screenshot at outreach.

### 4. GATE: approve shortlist
- **Payload:** ranked list, score, reason, risks, estimated fee range, total against budget.
- **Approvers:** Pith M influencer lead first, then the client.
- **Options:** approve all, approve some, ask for more.
- **Timeout:** remind after 1 business day, escalate to the account lead after 2.

### 5. Outreach
- **Trigger:** `shortlist` gate approved.
- **Steps:** the outreach agent writes a personal first message per creator (`templates.md` §2) in the creator's language, using a real detail from a recent post. It sends through the creator tool, email, or the platform message inbox with the account the client allows. It sends up to 2 follow-ups, 3 and 7 days later.
- **Rules:** contact a creator only through their public business email or the platform message inbox, or through their listed agent. Respect a "no" at once and mark `declined`. For EU and UK creators, the outreach message states who Pith M is and how the contact data was found (Article 14 notice link).
- **Output:** `deal` records with status `interested` or `declined`.

### 6. GATE: negotiate and contract
- **Steps:** the negotiation agent drafts the offer from the fee method (`playbook.md` §5) and the term sheet (`templates.md` §4). It answers simple questions (dates, deliverables). A person agrees the fee, rights and exclusivity.
- **Payload to gate:** creator, final fee, deliverables, rights, exclusivity, disclosure terms, market clauses, budget left.
- **On approval:** the contract goes out from the approved template through DocuSign. Status `contracted` when both sides sign.
- **Rules:** the agent never agrees a fee, never signs, and never promises a fee above the approved range.

### 7. Brief and ship
- **Trigger:** `deal.contracted`.
- **Steps:** the brief agent writes the creator brief (`templates.md` §3) from the client brain. It creates the unique code and the UTM link. Ops ships the product and tracks delivery.
- **Output:** brief sent, `shipment` tracked, code and link live.

### 8. GATE: content review
- **Trigger:** creator uploads a draft (portal, email, or the creator tool).
- **Steps:** the review agent checks the draft against `templates.md` §5: disclosure label in the right place and form for the market, claims against the approved list, banned words, brand facts, AI label if needed, music licence, children in frame, and the brief's must-haves. It sends the result to `POST /compliance/check`.
- **Payload to gate:** draft, check results, suggested changes in friendly language.
- **Rules:** the person may ask for at most 2 rounds of changes per deliverable, as the contract states. Changes must be about facts, legal issues, or brief must-haves, not taste.

### 9. Go live and verify
- **Trigger:** post date.
- **Steps:** the monitor agent finds the live post, checks it matches the approved draft, checks the disclosure label is visible (and the platform's paid partnership tool is on where the market or the contract asks), and saves a screenshot and the URL as proof.
- **On failure:** missing label, wrong claim, or changed content: the agent asks the creator to fix within 24 hours and alerts the influencer lead. Payout holds until fixed.

### 10. GATE: track and pay
- **Steps:** the report agent collects post metrics at 24 hours, 7 days and 30 days, code and link sales, and proof of posting. It builds the payout request.
- **Payload to gate:** proof, metrics, amount, currency, tax form status (for example US W-9 or W-8BEN), bank status.
- **On approval:** pay through Stripe Connect or Wise. Emit `payout.sent`.

### 11. GATE: amplify and learn
- **Steps:** the report agent ranks posts by cost per result and by hook rate. It suggests the top 10% for paid use if the contract gives paid rights. The paid team (Service 11) runs them.
- **Gate:** a person approves the amplification budget.
- **Hand-off:** each approved post goes to `paid_social.creator_amplify` (Service 11) with `client_id`, `party_id`, `platform` (meta, linkedin, tiktok or snapchat), `post_url` or `artifact_id`, `rights_grant_ids`, `budget`, `currency`, `markets`. It also passes `budget_approval_id` as context. Paid social still runs its own budget gate for each creator ad, because budget gates never skip (engine approval-inbox §4). It ends each ad at least 2 days before the first grant expires. It leaves out markets with no `paid_usage` or `whitelisting` grant, and AE and SA when the creator licence is missing. `paid_social.rights_pause` pauses live ads when `engine/rights.changed` shows a grant that is not active.
- **Learn:** results per creator go to the client brain: score, rate paid, results, would rehire (yes or no). The discovery agent uses this next time.

## Guardrails (from the plan's governance rules)

An agent can never:
- Sign a contract, agree a fee, or pay a creator.
- Start paid amplification spend.
- Publish or approve a post with a claim that is not on the approved list.
- Reply to a complaint, journalist, regulator, or creator dispute.
- Contact a creator who said no, or contact a creator's followers.
- Use a creator's face or voice in AI content without written consent.

## Failure handling

| Event | Action |
|---|---|
| Creator misses post date | Remind at day 0 and day 2. At day 5, alert the influencer lead. |
| Creator posts without approval | Ask for takedown or fix in 24 hours. Hold payout. Log a strike. |
| Creator controversy during a deal | Pause all their scheduled posts and ads. Person decides within 24 hours. |
| Client wants to cancel | Pay the kill fee in the contract. |
| Creator tool API fails | Retry 3 times with backoff, then fall back to manual search and alert ops. |
| Payout fails | Retry once, then alert finance. Tell the creator the same day. |
