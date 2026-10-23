# Service 15 · Affiliate and partner marketing · Templates

Version 1 · 21 Oct 2026. `{{double braces}}` are filled by agents or the workflow layer.

| ID | Template | Used in step |
|---|---|---|
| T1 | Client intake form | A1 |
| T2 | Programme design sheet | A3, A4 |
| T2b | Programme terms (outline) | A5 |
| T3 | Partner scorecard | B2 |
| T4 | Recruitment outreach email (B2C and B2B) | B5 |
| T5 | Partner welcome pack | B8 |
| T6 | Disclosure guide for partners, per market | B8, D2 |
| T7 | Compliance fix request | D2 |
| T8 | Payout file and partner statement | C5, C8 |
| T9 | Monthly client report | D6 |
| T10 | Customer referral messages | A7 |

---

## T1 · Client intake form

1. Business model: B2C / B2B / both. Products in scope.
2. Markets in scope (from UK, SG, US, CA, GCC countries, EU countries).
3. Average order value or annual contract value, per market.
4. Gross margin %. Return or cancellation rate %. Average customer lifetime value if known.
5. Checkout and CRM: platform names. Is conversion tracking live? (Service 12 confirms.)
6. Existing partners or affiliate programme: platform, number of partners, last 12 months revenue.
7. Goal for 6 months: revenue, new customers, or qualified B2B pipeline. Target number.
8. Forbidden partner types (for example coupon sites, cashback, competitors' resellers).
9. Brand-keyword bidding allowed? Yes / no / only with negative keywords.
10. Monthly budget ceiling the client will accept for commission, bonuses and fees.
11. Who approves money (client finance), legal terms (client legal), and partner decisions.

## T2 · Programme design sheet

| Field | Value | Source |
|---|---|---|
| Programme type(s) | {{types}} | |
| Commission model and rate | {{commission}} | |
| Max commission calculation | AOV {{aov}} × margin {{margin}} − contribution {{contribution}} − fee {{fee}} − reversals {{reversal_cost}} = {{max}} | client data / assumption |
| Cookie / attribution window | {{cookie_days}} days | |
| Lock period | {{lock_days}} days | |
| Tiers and uplifts | Gold {{g}} · Silver {{s}} · Bronze {{b}} | |
| Bonus pool per month | {{bonus_pool}} | |
| Monthly budget cap | {{cap}} | |
| Forbidden activities | {{forbidden}} | |
| Platform | {{platform}} | |
| Markets and launch order | {{markets}} | |
| 90-day forecast | {{forecast}} (basis: {{basis}}) | |

Approval line: approved by {{client_finance}} on {{date}} through approval item {{approval_id}}.

## T2b · Programme terms (outline)

A lawyer writes the master text once per client. The Terms Drafter fills only the placeholders.

1. Parties and programme name.
2. How to join; the client may accept or decline any application.
3. Commission: {{commission}}, cookie window {{cookie_days}} days, last-click unless stated.
4. Lock period {{lock_days}} days. Reversals for returns, cancellations, fraud and breach.
5. Payment: monthly, minimum payout {{min_payout}}, currency {{currency}}, method, tax forms required.
6. Forbidden activities: {{forbidden}}.
7. Disclosure: partners must follow the disclosure guide (T6) for {{country}}.
8. Use of brand assets and approved claims only.
9. Data protection: each party is a separate controller; no sharing of buyer personal data except as stated.
10. Term, termination with {{notice_days}} days notice, immediate termination for fraud.
11. Governing law: {{governing_law}}.

## T3 · Partner scorecard

| Item | Weight | Score 0–5 | Evidence |
|---|---|---|---|
| Audience fit | 0.25 | | |
| Content fit | 0.20 | | |
| Reach | 0.15 | | |
| Quality | 0.15 | | |
| Incrementality | 0.15 | | |
| Brand safety | 0.10 | | |
| **Weighted total** | | | Approve ≥ 3.5 · Review 2.5–3.4 · Reject < 2.5 or brand safety ≤ 2 |

B2B add-ons: customer overlap (number of shared target accounts), partner type, certified staff, region.

## T4 · Recruitment outreach email

**B2C affiliate (UK example)**

> Subject: {{client.name}} × {{partner.site}}: affiliate invite
>
> Hi {{partner.first_name}},
>
> I read "{{partner.recent_title}}" on {{partner.site}}. {{one_line_why_it_fits}}.
>
> {{client.name}} runs an affiliate programme: {{commission}} on each sale, with a {{cookie_days}}-day cookie. You get a creative pack and monthly payouts.
>
> Apply in 2 minutes: {{apply_link}}
>
> {{sender.name}}, Partnerships, for {{client.name}}
> {{legal_footer}} · Do not want these emails? {{unsubscribe_link}}

**B2B referral partner**

> Subject: Referral partnership for {{partner.company}} clients
>
> Hi {{partner.first_name}},
>
> {{partner.company}} works with {{shared_icp}}. Many of them ask about {{problem}}, which {{client.name}} solves.
>
> Our partner programme pays {{commission}} of first-year contract value on each closed deal you refer, with deal registration that protects your lead for {{registration_days}} days.
>
> Can we have a 20-minute call next week? {{calendar_link}}
>
> {{sender.name}} · {{legal_footer}} · {{unsubscribe_link}}

Market footers: UK sender identity and opt-out; SG "<ADV>" in the subject for bulk sends; US postal
address; CA sender identity, contact and unsubscribe (CASL); EU sender identity, Article 14 notice
link when the contact came from a third-party source.

## T5 · Partner welcome pack

1. Your tracking link and how to make deep links.
2. Your promo code (if the terms allow codes).
3. Creative library link: banners, product images, copy blocks, email swipes.
4. Approved claims: the only product claims you may use.
5. Disclosure guide for your country (T6).
6. Commission, cookie window, lock period, payment date and minimum payout.
7. Forbidden activities.
8. Your contact: {{manager_or_inbox}}.

## T6 · Disclosure guide (short version per market)

| Market | Put this before your first link | Social posts |
|---|---|---|
| UK | "Ad · Affiliate link: I earn a commission if you buy." | "#ad" at the start of the caption |
| SG | "Affiliate link: I earn a commission if you buy." | "Ad" or "Sponsored" at the start |
| US | "I earn a commission if you buy through my links." | "#ad" at the start; use the platform's paid partnership label |
| CA | Same as US. Quebec: "Lien affilié : je reçois une commission si vous achetez." | "#ad" / "#pub" at the start |
| GCC | English and Arabic: "إعلان · رابط تسويق بالعمولة" next to "Ad · Affiliate link". Show your Media Council permit (UAE) or Mawthooq licence (Saudi Arabia) if you are paid to promote. | "إعلان" / "Ad" at the start |
| EU | Local language label, for example NL "Advertentie · affiliatelink", DE "Werbung · Affiliate-Link", FR "Publicité · lien affilié". Label AI-generated images. | Local label at the start |

The Arabic, French, Dutch and German lines need a native editor check before use.

## T7 · Compliance fix request

> Subject: Action needed in 5 days: {{issue_short}} on {{url}}
>
> Hi {{partner.first_name}}, we checked {{url}} on {{date}}. {{finding_plain}}.
> Please {{fix_action}} by {{deadline}}. The disclosure guide is here: {{t6_link}}.
> If we see the same issue again, your partnership can end under section {{terms_section}} of the terms.

## T8 · Payout file and partner statement

Payout file columns: `period, partner_id, partner_name, country, currency, conversions, gross, reversals, net, tax_form_status, payout_method, invoice_ref, status (ready|blocked), block_reason`.

Statement email:

> Your {{client.name}} partner statement for {{period}}: {{conversions}} approved sales, {{gross}} earned, {{reversals}} reversed, **{{net}} paid** on {{pay_date}}. Details: {{statement_link}}.

## T9 · Monthly client report

1. Top line: partner revenue, partner CPA, active partners (vs last month and vs target).
2. Programme health: new partners, activation rate, dormant rate, top 5 partners, revenue concentration.
3. Fraud and quality: holds, reversals, fraud rate, disclosure compliance.
4. Payout: amount, by currency, vs budget cap.
5. B2B (if used): registered deals, accepted, pipeline value, closed-won.
6. What we will do next month.
7. Decisions we need from you.

## T10 · Customer referral messages

- Referrer invite (after first purchase or a high satisfaction score): "Give {{friend_reward}}, get {{referrer_reward}}. Share your link: {{link}}."
- Share text the customer sends (editable by them): "I use {{client.name}} for {{use}}. Here is {{friend_reward}} off your first order: {{link}}."
- Reward confirmation: "Your friend's order is confirmed. {{referrer_reward}} is in your account."
- Rules: the client does not contact the friend until the friend gives consent. Canada: follow the
  CASL referral rule in `05-market-rules.md`.
