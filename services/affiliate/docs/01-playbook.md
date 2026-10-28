# Service 15 · Affiliate and partner marketing · Strategy playbook

Version 1 · 21 Oct 2026 · Owner: influencer and partnerships lead (Pith M)
Source: [Pith M Automation Plan](https://claude.ai/artifact/5mM1UebZQizfeEsfa2Ca67), Service 15.

## 1. What the client buys

The client gets sales from partners, and pays the partners only for results. Pith M designs the
programme, recruits and activates the partners, watches for fraud, and runs the monthly payout.
Agents do the volume work. People approve money, contracts and partner relationships.

| Programme type | B2C or B2B | Who the partners are | Paid on |
|---|---|---|---|
| Affiliate | B2C (also B2B SaaS) | Content sites, comparison and review sites, coupon and cashback sites, creators, newsletters | A sale (CPA or % of revenue) |
| Customer referral | B2C and B2B | The client's own customers | A sale or a qualified sign-up, as a reward to both sides |
| Agency / referral partner | B2B | Agencies, consultants, accountants, system integrators | A closed-won deal (% of first-year contract value) |
| Reseller | B2B | Distributors and value-added resellers | Margin on each resale |
| Technology / integration partner | B2B | Software companies whose product connects to the client's product | Co-marketing and lead swaps; sometimes a revenue share |

The plan sets the automation target at about 70% of steps.

## 2. When to sell which programme

Use this table at the discovery call. The Programme Designer agent applies the same rules.

| Client signal | Recommend first | Add later |
|---|---|---|
| B2C e-commerce, average order under £150, gross margin over 40% | Affiliate (network) + customer referral | Creator affiliates from Service 6 |
| B2C subscription | Customer referral (two-sided reward) | Affiliate with recurring commission, capped at 12 months |
| B2B SaaS, deal under £20k a year | Affiliate (SaaS reviewers, newsletters) + customer referral | Agency partners |
| B2B, deal over £20k a year, long sales cycle | Agency / referral partners | Technology partners, then resellers |
| B2B with an integration marketplace or API | Technology partners | Co-selling with the top 3 partners |
| Margin under 20% or no tracking on checkout | Do not launch paid commission yet | Fix tracking (Service 12) and pricing first |

## 3. The economics rule

Commission must leave profit after all costs. The Programme Designer agent uses this formula and
shows it in every proposal:

```
max_commission = (average_order_value × gross_margin) − target_contribution − network_fee − expected_reversal_cost
expected_reversal_cost = commission × reversal_rate (returns, cancellations, fraud)
```

Default starting points. The agent changes them only with the client's own margin data.

| Model | Starting commission | Cookie / attribution window | Lock period before payout |
|---|---|---|---|
| B2C affiliate, physical goods | 5–10% of net sale | 30 days | 30–45 days (after the return window) |
| B2C affiliate, digital or subscription | 20–30% of first payment, or 15–20% recurring for up to 12 months | 30–60 days | 30 days or 1 billing cycle |
| Coupon and cashback sites | 2–5% (lower, because they often take credit for sales that would happen anyway) | 1–7 days | 45 days |
| Customer referral | Fixed reward to both sides (for example £20 credit each) | 30 days | After the friend's first paid order clears |
| B2B referral partner | 10–20% of first-year contract value | 90–180 days, deal registration | After the client receives payment |
| Reseller | 20–40% margin, by tier | Deal registration | Not applicable (partner buys and resells) |

These are planning ranges from common market practice. They are not measured data. Confirm with
each client's margin before launch.

## 4. Partner tiers

Every programme uses 3 tiers. The tiers decide commission, support and approval needs.

| Tier | Rule to enter (default) | What the partner gets | Who manages them |
|---|---|---|---|
| Gold | Top 10% of partner revenue for 3 months | Higher commission (+2 to 5 points), a named manager, custom creative, early product access | A person (partner manager) with agent support |
| Silver | At least 1 sale or 1 qualified lead a month | Standard commission, monthly newsletter, creative library | Agent, with a person on request |
| Bronze | Approved, no sales yet | Standard commission, onboarding flow | Agent only |

The Activation agent reviews tiers every month. A tier change that raises commission needs approval.

## 5. Recruitment sources

- B2C: affiliate networks (Awin, Impact.com, CJ, Rakuten), top-ranking review pages for the client's
  keywords (from Service 5), creators in the client's niche (from Service 6), newsletters, and the
  client's own customers.
- B2B: agencies and consultants who already serve the client's ideal customer profile, integration
  partners from the client's tech stack data (from Service 8), and review sites such as G2.
- Rule: the Recruiter agent never contacts a person with no lawful basis for the market. B2B outreach
  goes through `POST /audiences/resolve` like every other outbound send.

## 6. Activation playbook (first 90 days of each partner)

Most partners in a programme never make a sale. Activation is where this service makes money.

| Day | Action | Owner |
|---|---|---|
| 0 | Welcome message, tracking link, creative pack, 1-page guide, terms summary | Agent |
| 3 | Check that the first click arrived. If not, send a "how to place your link" guide | Agent |
| 7 | Send 3 ready-made content ideas made for that partner's site or audience | Agent |
| 14 | No clicks: personal nudge. Gold candidates: call from the partner manager | Agent / person |
| 30 | First-month report to the partner. Offer a time-limited bonus for the first sale | Agent (bonus needs approval) |
| 60 | Still no sale: move to the "dormant" list and a quarterly newsletter only | Agent |
| 90 | Tier review | Agent, person approves upgrades |

## 7. B2B partner motion

1. Partner profile: the agent scores partners on customer overlap, reach, and fit (see template T3).
2. Agreement: a person agrees terms from an approved template. An agent never signs.
3. Enablement: a partner kit, a 30-minute training, a deal registration form.
4. Deal registration: the partner registers a deal. The agent checks it against the CRM for conflicts
   (existing open opportunity, existing customer). A person decides a conflict.
5. Co-marketing: joint webinar (Service 16), joint content (Service 7), joint email to consented lists.
6. Quarterly business review: the agent writes the pack, the partner manager runs the meeting.

## 8. Fraud and quality rules

The Fraud Monitor agent checks every conversion before it is approved for payout.

| Signal | Action |
|---|---|
| Self-referral (partner email, card, address or device matches the buyer) | Reverse, flag the partner |
| Click-to-conversion time under 10 seconds, or many conversions from 1 IP or device | Hold for review |
| Brand-keyword bidding against the programme terms | Warn, then remove the partner |
| Cookie stuffing (clicks with no page view, hidden frames) | Remove the partner, reverse all pending |
| Coupon leak to a site that is not the partner of record | Reassign or reverse |
| Return or cancellation in the lock period | Reverse the commission |
| Conversion rate over 3× the programme median with a new partner | Hold for review |

A reversal over £500, or the removal of any partner, needs a person.

## 9. Packages we sell

| Package | Scope | Fit |
|---|---|---|
| Launch | Programme design, terms, network or platform setup, 25 partners recruited, 90 days of activation | New programme |
| Grow | Monthly: recruitment, activation, fraud check, payout run, monthly report | Running programme |
| Partner (B2B) | Partner programme design, partner kit, deal registration, 10 partners, quarterly reviews | B2B with long sales cycles |

Pricing for packages is the head of growth's decision. It is not set in this build.

## 10. What an agent never does alone

From the plan, "Governance and risk", and engine rule 6:

- Set or change a commission rate, a bonus or a payout.
- Sign a partner agreement or accept partner terms.
- Pay a partner, or remove a partner from the programme.
- Reply to a partner complaint or a legal question.
- Email a prospective partner with no lawful basis for their country.
