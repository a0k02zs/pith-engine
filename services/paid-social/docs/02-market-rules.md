# Performance and paid social: market rules

Version 0.1, 21 Oct 2026. Launch order: United Kingdom, Singapore, North America, Middle East (GCC), European Union.

**Warning:** this file is a planning summary. It is not legal advice. A local lawyer confirms each market before launch, as the master plan says. Platform rules change often. The performance marketer checks each platform's current ad policy at the monthly review.

The compliance gate in the engine (`POST /compliance/check`) holds the rules as data in `engine/specs/compliance-rules.json`. The `paid_social` rules below must be added there. See `README.md`, section "Requests to the engine".

## 1. Rules for all markets

1. Label AI-generated people, voices or realistic scenes where the platform or the country requires it. Meta, TikTok and LinkedIn have their own AI labels. In the EU, the AI Act Article 50 applies from 2 August 2026.
2. Never target ads by sensitive data: health, religion, sexual orientation, ethnic origin, political views. In the EU this is a legal ban under the Digital Services Act (DSA). In other markets the platforms ban most of it.
3. Under-18s: Meta lets advertisers target teens only by age and location. Do not target minors with personalised ads in the EU (DSA). Do not run age-restricted products (alcohol, gambling, vapes, some finance) to under-18s anywhere.
4. Creator content in ads (Spark Ads, partnership ads, whitelisting) needs paid usage rights in the creator contract from service 6. Keep the paid-partnership label on.
5. Claims: use only claims from the approved claims list in the client brain. A new claim needs gate G2.
6. Political, election and social issue ads are out of scope for Pith M at launch. The agent blocks them.
7. Customer list uploads: only contacts that `POST /audiences/resolve` returns as eligible for `channel: "paid_ad"`, `purpose: "marketing"` in their country. Hash before upload.

## 2. Special products

These product types need extra review in every market. The creative agent tags them. The compliance gate routes them to a person.

| Product type | What to check |
|---|---|
| Housing, jobs, credit and financial products | Meta and others restrict targeting (no age, gender or ZIP targeting). Applies in the US and Canada and in more countries over time. Use the platform's special ad category. |
| Financial promotions | UK: an FCA-authorised person must approve the promotion (FSMA s21). Singapore: MAS rules. Each GCC country has its own regulator. |
| Health, supplements, medical devices | No disease or cure claims without proof. Singapore: HSA rules. UK: MHRA and the CAP Code. |
| Alcohol | Banned in ads in Saudi Arabia, Kuwait and Qatar. Age-gated and restricted in the other markets. |
| Gambling | Out of scope at launch. |
| Less healthy food and drink (UK) | Paid online ads for "less healthy" food and drink are banned in the UK from 5 January 2026. Check the product against the nutrient profiling model first. |
| Weight loss, cosmetic procedures | Restricted on Meta and TikTok; no ads to under-18s. UK: strict CAP rules. |

## 3. Market rules

### 3.1 United Kingdom (launch 1st)

| Topic | Rule |
|---|---|
| Language and format | British English, GBP, DD/MM/YYYY. Low-hype tone. |
| Platforms | B2B: LinkedIn first, Meta retargeting. B2C: Meta, TikTok, Snapchat for under-25s. |
| Tracking consent | Pixel fires only after cookie consent (PECR and UK GDPR). Use consent mode and server-side events for consented users only. |
| Ad rules | CAP Code and ASA. Creator ads must say "Ad". Price claims must show the total price. Comparisons must be fair and checkable. |
| Special | Less healthy food ban online from 5 Jan 2026. FCA s21 approval for financial promotions. |
| Key dates | January sales, Black Friday, Christmas, Boxing Day. B2B: avoid late December; push in January and September. |

### 3.2 Singapore (launch 2nd)

| Topic | Rule |
|---|---|
| Language and format | English; Mandarin, Malay or Tamil variants for some B2C audiences. SGD. |
| Platforms | B2B: LinkedIn, Meta retargeting. B2C: Meta (Facebook is still strong), Instagram, TikTok. |
| Data | PDPA: consent and a notified purpose before you use customer lists for ad matching. |
| Ad rules | ASAS Code of Advertising Practice. Disclose paid creator posts. |
| Special | HSA for health products. MAS for financial products. No political content (Foreign Interference rules). |
| Key dates | Chinese New Year, Hari Raya Puasa, Deepavali, 9.9, 11.11, 12.12, Great Singapore Sale. |

### 3.3 United States (launch 3rd, with Canada)

| Topic | Rule |
|---|---|
| Language and format | US English, USD, MM/DD/YYYY. Benefit-first tone with proof. Plan for 4 main time zones. |
| Platforms | B2B: LinkedIn, Meta retargeting. B2C: Meta, TikTok, Snapchat. Reddit and Pinterest are options, not in this service at launch. |
| Data | State privacy laws (CCPA/CPRA and others): honour opt-outs of "sale or sharing" and Global Privacy Control before you fire pixels or upload lists. |
| Ad rules | FTC Act (no deceptive ads), FTC Endorsement Guides (clear creator disclosure), FTC rule on fake reviews and testimonials. |
| Special | Special ad categories for housing, jobs, credit and financial products. |
| TikTok | TikTok US moved to a US joint venture. Check the current status of TikTok ads in the US before each campaign. |
| Key dates | Super Bowl, July 4, Labor Day, Thanksgiving, Black Friday and Cyber Monday, Q4 B2B budget season. |

### 3.4 Canada (launch 3rd, with the US)

| Topic | Rule |
|---|---|
| Language and format | Canadian English, CAD. Quebec: French ads and French landing pages (Charter of the French Language). Use a native French editor, not only machine translation. |
| Platforms | Same as the US. Run Quebec as its own ad set with French creative. |
| Data | PIPEDA; Quebec Law 25 for personal data. Consent before customer list uploads. |
| Ad rules | Competition Act (no false or misleading claims; drip pricing is banned). Ad Standards influencer disclosure guidelines. |
| Special | Special ad categories apply in Canada as in the US. |
| Key dates | Canada Day (1 July), Canadian Thanksgiving (October), Black Friday, Boxing Day. |

### 3.5 Middle East: GCC (launch 4th; start with the UAE and Saudi Arabia)

| Topic | Rule |
|---|---|
| Language and format | English for most B2B. Gulf Arabic for B2C, with right-to-left layouts. Make Arabic creative natively; do not only flip English layouts. Local currencies. |
| Platforms | B2B: LinkedIn. B2C: Snapchat (very strong in Saudi Arabia), Instagram, TikTok, Meta. X for Saudi Arabia and Kuwait. |
| Week | UAE weekend: Saturday and Sunday. Other 5 countries: Friday and Saturday. Set ad schedules and report weeks to match. |
| Data | Each country has its own data law (UAE PDPL, Saudi PDPL with limits on sending data out of the country, Qatar PDPPL, Bahrain PDPL, Oman PDPL, Kuwait CITRA rules). Check data transfer rules before you upload Saudi customer lists. |
| Ad rules | Respect religion, culture and public morals. Modest imagery. No alcohol, gambling or dating products. Saudi Arabia is more conservative. |
| Creators | Creators in paid ads need a licence: UAE Media Council advertiser permit; Mawthooq licence in Saudi Arabia. Check the licence before you run a Spark Ad or partnership ad. |
| Key dates | Ramadan and Eid (dates move each year; ad costs and evening use rise during Ramadan), Saudi Founding Day (22 Feb), Saudi National Day (23 Sep), UAE National Day (2 Dec), Qatar National Day (18 Dec), Kuwait National Day (25 Feb), White Friday, Dubai Shopping Festival. |

### 3.6 European Union (launch 5th; start with the Netherlands)

| Topic | Rule |
|---|---|
| Language and format | Start with 1 or 2 lead countries. English works for Dutch and Nordic B2B. German, French and Spanish need native translation. EUR. Factual tone. |
| Platforms | B2B: LinkedIn. B2C: Meta, TikTok, Snapchat. |
| Tracking consent | GDPR and ePrivacy: no pixel before cookie consent. Germany is strict. Server-side events only for consented users. |
| Data | Lawful basis for each customer list upload. Article 14 notice when data comes from third parties. |
| Ad rules | DSA: no ads based on profiling of minors, no ads based on sensitive data, ad transparency (each ad shows who paid and why the user sees it). Unfair Commercial Practices Directive. National creator laws (for example France, 2023). |
| AI content | AI Act Article 50 labels from 2 August 2026. |
| Political ads | Meta and Google stopped political, election and social issue ads in the EU in October 2025, under the EU political advertising regulation (TTPA). Out of scope for Pith M. |
| Key dates | Black Friday, Christmas, summer sales; King's Day (27 April) in the Netherlands. B2B: avoid August. |

## 4. Rules as data (for the compliance gate)

The engine holds these checks in `engine/specs/compliance-rules.json` (added 21 Oct 2026, see `engine/CHANGELOG.md`, "Paid social (11)"). Each paid ad check sends `channel: "paid_ad"` with the request fields `paid.targeting`, `paid.political` and `paid.product_category`.

| Check (this file) | Engine rule id | Markets | Result if it fails |
|---|---|---|---|
| Pixel only after consent | `UK-COOKIE`, `EU-COOKIE` | UK, EU | block |
| Customer list upload eligibility | `G-LIST-UPLOAD` (+ `eligible_bases.paid_ad` per market) | all | block |
| Sensitive targeting | `G-SENSITIVE-TARGETING` | all (legal ban in EU) | block |
| Targeting of minors | `G-MINOR-TARGETING` | all | block |
| Special ad category set | `US-SPECIAL-AD`, `CA-SPECIAL-AD` | US, CA | block until the category is set |
| Restricted product | `G-RESTRICTED-PRODUCT` | per product and market (section 2) | review |
| Creator disclosure | `G-PAID-DISCLOSURE` | all | block |
| Creator licence | `AE-INFLUENCER-LICENCE`, `SA-INFLUENCER-LICENCE` | AE, SA | block |
| AI label | `EU-AI-LABEL`, `G-AI-IMAGE-LABEL` | EU always; others when the platform needs it | block |
| Language | `QC-FRENCH`, `GCC-ARABIC-B2C` | CA-QC, GCC B2C | review |
| Claims | `G-CLAIM-APPROVED` | all | review if a claim is not on the approved list |
| Political ads | `G-POLITICAL` | all | block |
| UK less healthy food | `UK-HFSS` | UK | block if the product is "less healthy" |
| Alcohol in the Gulf | `GCC-ALCOHOL` | SA, KW, QA | block |
