# Service 15 · Affiliate and partner marketing · Pipeline and approval points

Version 1 · 21 Oct 2026. Machine-readable versions: `workflow/*.json`.

The service runs 4 workflows. Gates (marked **GATE**) stop the workflow and create an item in the
engine approval inbox (`approval-item.json`). Approval kinds and roles come from `contracts/enums.json`.

## Workflow A · Programme launch (once per client, target 15 working days)

| # | Step | Type | Who / what | Output |
|---|---|---|---|---|
| A1 | Intake | tool | Client form (template T1) + `GET /clients/{id}/brain` | Programme brief |
| A2 | Margin and tracking check | agent + check | Programme Designer agent reads margin, AOV, return rate. Check: checkout tracking exists (Service 12). | Go / fix-first decision |
| A3 | Programme design | agent | Programme Designer agent: model, commission, tiers, cookie window, lock period, rules (template T2) | Programme proposal |
| A4 | **GATE · Approve terms** | gate | `kind: budget`, approvers `client_finance` + `account_lead`. SLA 3 working days. | Approved commission and budget cap |
| A5 | Terms and policy | agent + gate | Terms Drafter agent fills the approved terms template per market. **GATE** `kind: contract`, approver `client_legal`. | Programme terms, per market |
| A6 | Platform setup | tool | Set up Impact.com, PartnerStack, Awin, Rewardful or Tapfiliate (see §Tool choice). Tracking test with 3 test orders. | Live tracking |
| A7 | Creative pack | agent + check + gate | Creative Packer agent makes banners, copy blocks and email swipes from approved assets. Brand score + compliance check. `kind: creative` gate, approver `creative_lead`; it skips only when every asset reuses approved creative with no new claim. | Partner creative library |
| A8 | **GATE · Go live** | gate | `kind: go_live`, approver `account_lead`. Checklist: tracking test pass, terms live, disclosure guide live, payout method set. | Programme open |

## Workflow B · Partner recruitment and activation (weekly loop)

| # | Step | Type | Who / what | Output |
|---|---|---|---|---|
| B1 | Discover | agent + tool | Partner Scout agent searches networks, ranking review pages (Service 5 data), creators (Service 6), tech-stack data (Service 8). | Long list (up to 200 a week) |
| B2 | Score and vet | agent | Partner Scout scores fit, reach, quality and brand-safety risk (template T3). Removes coupon-only and risky sites unless the terms allow them. | Scored list |
| B3 | **GATE · Approve shortlist** | gate | `kind: shortlist`, approver `influencer_lead` (Pith partnerships lead). 1 batch of up to 50 a week. The engine never lets this gate skip. | Approved shortlist |
| B4 | Consent filter | tool | `POST /clients/{id}/audiences/resolve` with `channel: email`, `purpose: marketing`, country of each partner (engine rule G5). Parties with no lawful basis drop out. | Contactable list |
| B5 | Outreach | agent + check | Recruiter agent writes a personal first message (template T4) in the partner's language. Compliance check. Up to 2 follow-ups. | Sent messages, replies |
| B6 | Reply handling | agent | Recruiter agent sorts replies: yes, question, no, complaint. Questions about terms or money go to a person. | Applications |
| B7 | **GATE · Approve partner** | gate | `kind: contract`, approver `influencer_lead`, 1 batch a week. Gold-tier or custom terms also need `client_approver`. | Partner accepted |
| B8 | Onboard | agent | Activation agent sends the welcome pack (template T5) and the disclosure guide (template T6). | Onboarded partner |
| B9 | Activation (day 3 to 90) | agent | Activation agent runs the 90-day plan in `01-playbook.md` §6. | Active or dormant partner |
| B10 | **GATE · Approve bonus or tier upgrade** | gate | `kind: budget_change`, approver `account_lead`. Any bonus over the approved bonus pool needs `client_finance`. | Bonus or tier set |

## Workflow C · Conversion validation and monthly payout

| # | Step | Type | Who / what | Output |
|---|---|---|---|---|
| C1 | Ingest conversions | tool | Daily pull from the affiliate platform and the order system. | Conversion records |
| C2 | Fraud and quality check | agent + check | Fraud Monitor agent applies the rules in `01-playbook.md` §8. Outcome per conversion: approve, hold, reverse. | Scored conversions |
| C3 | **GATE · Review held items** | gate | `kind: escalation`, approver `account_lead`. A reversal over £500 (or local equivalent) or a partner removal also needs `client_approver`. | Decided holds |
| C4 | Lock period | wait | Wait until each conversion passes its lock period (returns window). | Payable conversions |
| C5 | Payout file | agent | Payout Clerk agent builds the payout file: partner, amount, currency, tax status, invoice, reversal lines (template T8). | Draft payout |
| C6 | **GATE · Approve payout** | gate | `kind: payout`, approver `client_finance`. Pith `account_lead` checks first. An agent never releases money. | Approved payout |
| C7 | Pay | tool | The platform or Wise / Stripe / PayPal pays after approval. | Payment records |
| C8 | Statements | agent | Partner statement email to each paid partner. | Statements sent |

## Workflow D · Compliance monitoring and reporting (weekly and monthly)

| # | Step | Type | Who / what | Output |
|---|---|---|---|---|
| D1 | Disclosure sweep | agent + tool | Compliance Monitor agent crawls partner pages and posts that send traffic. Checks the disclosure label, banned claims, brand-keyword bidding. | Findings |
| D2 | Warn | agent | First finding: the agent sends a fix request with a 5-day deadline (template T7). | Warnings |
| D3 | **GATE · Remove partner** | gate | `kind: escalation`, approver `influencer_lead` + `client_approver`. Second finding, or any serious one (false health or finance claim). | Partner removed or kept |
| D4 | B2B deal registration check | agent | Deal Desk agent checks each registered deal against the CRM. Conflicts go to the gate. | Accepted or conflict |
| D5 | **GATE · Deal conflict** | gate | `kind: escalation`, approver `client_sales`. | Decision |
| D6 | Monthly report | agent | Reporter agent writes the client report (template T9). | Draft report |
| D7 | **GATE · Approve report** | gate | `kind: report`, approver `strategist`. | Report sent to client |

## Approval points summary

| Gate | Approval kind | Approver role(s) | SLA | Can it skip? |
|---|---|---|---|---|
| Programme terms and commission | `budget` | `client_finance`, `account_lead` | 3 working days | Never |
| Programme legal terms | `contract` | `client_legal` | 5 working days | Never |
| Go live | `go_live` | `account_lead` | 1 working day | Never |
| Partner shortlist | `shortlist` | `influencer_lead` | 2 working days | Never (batch weekly) |
| Partner acceptance | `contract` | `influencer_lead` (+ `client_approver` for Gold or custom terms) | 2 working days | Never (batch weekly) |
| Bonus or tier upgrade | `budget_change` | `account_lead` (+ `client_finance` over the pool) | 2 working days | Never |
| Held conversions and reversals | `escalation` | `account_lead` (+ `client_approver` over £500) | 3 working days | Never |
| Monthly payout | `payout` | `account_lead` + `client_finance` (both) | 72 hours (engine default) | Never |
| Partner removal | `escalation` | `influencer_lead`, `client_approver` | 2 working days | Never |
| B2B deal conflict | `escalation` | `client_sales` | 2 working days | Never |
| Monthly report | `report` | `strategist` | 2 working days | Never |
| New creative or claims | `creative` / `claim` | `creative_lead` / `client_approver` | 2 working days | Reuse of approved creative skips |

## Guardrails the workflow layer enforces

- Hard monthly budget cap per programme (commission + bonuses + fees). The workflow blocks a payout
  over the cap and creates an `escalation`.
- An agent cannot change a commission rate, a cookie window or the terms.
- An agent cannot release payment. Only the C7 tool step can, and only after the C6 approval.
- An agent cannot remove a partner. It can only pause new link creation for a partner on hold.
- Every outreach goes through `POST /clients/{id}/audiences/resolve` (G5) and `POST /compliance/check`.
- Every `send` or `write_external` step has a compliance check before it (G6). `workflow/*.json` is validated against this rule and the engine schema.

## Tool choice

| Need | Default | Alternative |
|---|---|---|
| B2C affiliate, wide reach (UK, EU) | Awin | Impact.com, CJ, Rakuten, Tradedoubler (EU) |
| B2C or B2B, own programme with good API | Impact.com | Partnerize |
| B2B SaaS partners and referrals | PartnerStack | Impact.com |
| Small SaaS or Stripe billing | Rewardful | Tapfiliate, FirstPromoter |
| Customer referral (e-commerce) | ReferralCandy or Yotpo | Friendbuy, Mention Me (UK) |
| Payouts outside a network | Wise or Stripe Connect | PayPal Payouts |
