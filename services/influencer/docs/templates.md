# Templates

`{{ }}` marks a field the agent or a person fills.

## 1. Client intake form

| Field | Example |
|---|---|
| Client and brand | {{brand}} |
| B2B or B2C | B2C |
| Goal (pick 1 main) | Sales / sign-ups / awareness / content for ads / B2B pipeline |
| Product or offer | {{product}}, RRP {{price}} |
| Markets and languages | UK (English), UAE (English and Arabic) |
| Platforms | Instagram, TikTok, YouTube, LinkedIn, Snapchat |
| Audience persona | Age, gender, interests, job titles (B2B) |
| Creator budget | {{amount}} {{currency}}, plus product units {{n}} |
| Dates | Campaign window, launch date, blackout dates |
| Must-say | Key message, approved claims, code, link |
| Must-not-say | Banned claims, words, competitors, topics |
| Creators to avoid | Names, past problems |
| Usage rights wanted | Organic repost, paid use months |
| Approvers | Client name and role for shortlist, contract, content |

## 2. Outreach messages

### 2a. First message, paid (English)
Subject: {{brand}} x {{creator_first_name}}: paid collaboration

Hi {{creator_first_name}},

I loved your {{specific_post_detail}} ({{post_link}}). I work at Pith Marketing with {{brand}}, which makes {{one_line_product}}.

We are planning a paid collaboration in {{month}}: {{deliverables_short}}. We think your audience would like {{reason_tied_to_their_content}}.

Can I send you the brief and the next steps?

{{sender_name}}, Pith Marketing for {{brand}}
{{market_notice}}

### 2b. First message, gifting
Subject: A gift from {{brand}}, no strings

Hi {{creator_first_name}},

Your {{specific_post_detail}} caught our eye. {{brand}} would like to send you {{product}} to try. You do not need to post. If you do post about it, please say it was a gift.

Can I have a delivery address?

{{sender_name}}, Pith Marketing for {{brand}}
{{market_notice}}

### 2c. B2B expert (LinkedIn or email)
Subject: Paid collaboration on {{topic}}

Hi {{first_name}},

Your post on {{topic}} ({{post_link}}) matches a question our client {{brand}} hears from {{audience}} every week. We would like to pay you to {{deliverable}}: your view, your words, with {{brand}} shown as the paid partner.

Is a 15-minute call next week possible?

{{sender_name}}, Pith Marketing
{{market_notice}}

### 2d. Follow-ups
- Day 3: "Hi {{first_name}}, a quick follow-up. Happy to share the brief so you can decide. {{one_new_detail}}"
- Day 7: "Last note from me. If the timing is wrong, no problem. We will keep you in mind for {{future_window}}."

### 2e. Market notice lines
- UK and EU: "Pith Marketing found your public business contact details on {{source}}. Our privacy notice: {{privacy_url}}. Reply STOP and we will not contact you again."
- Quebec: send in French first.
- GCC: "Please share your {{licence_name}} number if you are based in {{country}}." (UAE Media Council advertiser permit; Saudi Mawthooq licence.)
- Other markets: "Reply STOP and we will not contact you again."

## 3. Creator brief

1. **About {{brand}}** (3 lines).
2. **The goal** of this collaboration (1 line).
3. **Deliverables:** platform, format, length, count, post window, draft due date.
4. **Key message** (1 sentence), in the creator's own words.
5. **Must include:** product name, code `{{code}}`, link `{{link}}`, tag `@{{brand_handle}}`.
6. **Disclosure:** use `{{label_for_market}}` at the start of the caption, and say it at the start of the video. Turn on the platform paid-partnership tool. (Label per `markets.md`.)
7. **Claims you can make:** {{approved_claims}}. Do not make other claims about results, health, money or safety.
8. **Do not:** {{donts}} (competitors, banned words, unsafe use, children without consent, unlicensed music).
9. **Creative freedom:** your style, your words, your format. We only ask for changes on facts, law and the must-includes.
10. **Process:** send the draft to {{upload_link}} by {{draft_date}}. We reply in 2 business days. Up to 2 rounds of changes.
11. **Payment:** {{fee}} {{currency}} within {{days}} business days of the post going live.
12. **Contact:** {{name}}, {{email}}.

## 4. Contract term sheet (feeds the DocuSign template)

| Term | Default | Allowed range without legal review |
|---|---|---|
| Parties | Client (or Pith M as agent of client) and creator (or creator's company) | |
| Deliverables | As brief §3 | |
| Fee and currency | {{fee}} {{currency}} | Inside approved range |
| Payment terms | 15 business days after proof of posting | 7 to 30 |
| Kill fee | 50% if the client cancels after signature; 100% after the draft is approved | 25% to 100% |
| Organic repost by brand | 12 months | 6 to 24 |
| Paid use | {{0 to 3}} months, extension at {{price}} per month | 0 to 12 |
| Exclusivity | {{category}}, 30 days after last post | 0 to 90 days |
| Disclosure | Creator uses the label and tools in brief §6; Pith M may ask for a fix | Never removable |
| Approval | Draft review, max 2 rounds | |
| Takedown | Creator removes or fixes within 24 hours on request for legal or safety reasons | |
| Morals clause | Either side may end the deal for conduct that harms the other | |
| AI | No AI clone of the creator's face or voice without separate consent | Never removable |
| Data | Each side follows data law in the creator's country | |
| Licences | Creator holds any licence the market needs (UAE, Saudi Arabia) | Never removable |
| Law and venue | Creator's country, or client's country by agreement | Legal review if other |

Any term outside the range goes to legal review before the `contract` gate.

## 5. Content review checklist (gate `content`)

| # | Check | Pass rule |
|---|---|---|
| 1 | Disclosure label | Market label, first line of caption, visible without "more" |
| 2 | Spoken or on-screen label (video) | In the first seconds, where the market expects it |
| 3 | Paid partnership tool | On, where the contract or market requires it |
| 4 | Claims | Each claim is on the approved list |
| 5 | Banned words and competitors | None |
| 6 | Must-includes | Product name, code, link, tag |
| 7 | Facts | Price, dates, product names correct |
| 8 | AI label | Present if any AI-made or AI-edited content (EU, platform rules) |
| 9 | People | Consent for any child or third party in frame |
| 10 | Music | Licensed for commercial use |
| 11 | Culture | Fits the market (dress, religion, public morals in GCC) |
| 12 | Language | Quebec in French; GCC Arabic where the brief asks |

## 6. Weekly client report

1. Headline: 3 numbers (sales or leads, cost per result, posts live against plan).
2. What happened this week (3 lines).
3. Top 3 posts with links and why they worked.
4. Problems and fixes.
5. Next week.
6. Decisions needed from the client (each with a deadline).

## 7. Creator result note (sent after the campaign)

Hi {{first_name}}, thank you for working with {{brand}}. Your results: {{views}} views, {{engagement_rate}} engagement rate, {{sales_or_clicks}} from your code. {{one_line_praise}}. We would like to work with you again on {{next_window}}.
