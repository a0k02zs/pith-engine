# Community and UGC: Market Rules

Service 18. v1, 21 Oct 2026. Launch order (plan): UK, Singapore, North America, GCC, EU.
Market codes follow `/engine/contracts/enums.json` (`UK`, `SG`, `NA`, `GCC`, `EU`).

This is a planning summary, not legal advice. A local lawyer confirms each market before launch. The engine compliance gate (`POST /compliance/check`) applies the country rules for each contact. The rules below are what this service adds or relies on.

## Rules for all markets

- The 5 rules in `playbook.md` §2 (no fake reviews, no gating, no suppression, incentives only where allowed and never tied to rating, written rights before reuse).
- A review request is sent with consent purpose `marketing` unless the client's lawyer confirms that the market treats a plain feedback request as `service`. Default: `marketing`. Contacts come only from `POST /audiences/resolve` with channel `review_request` (email) or `sms` / `whatsapp`.
- The community host agent says that it is an AI assistant in its profile and in its first message to each member.
- Paid or gifted UGC that the client posts carries an ad label in the local form.
- Never show a review or UGC with personal data (full names of third parties, order numbers, health data) without consent.

## 1. United Kingdom (launch 1st)

| Topic | Rule |
|---|---|
| Reviews law | DMCC Act 2024, Schedule 20 banned practices (in force 6 April 2025): fake reviews, commissioning fake reviews, and presenting reviews in a misleading way (including hiding negative reviews) are banned. The CMA can fine directly, up to 10% of global turnover. Businesses that publish reviews must take reasonable steps to prevent and remove fake ones. |
| Review requests | PECR: consent or soft opt-in for email and SMS to individuals. Soft opt-in covers a customer who bought and was given a chance to opt out. Include the opt-out in every request. |
| Ad labels | CAP Code / ASA: paid or gifted UGC posted by a creator is labelled "Ad" at the start. |
| UGC rights | UK GDPR: a person in a photo or video is personal data. Record consent or legitimate interest for each person shown. |
| Platforms | Trustpilot (strong), Google, Feefo and Reviews.io for retail, G2 for B2B. |
| Language | British English, understated tone in replies. |

## 2. Singapore (launch 2nd)

| Topic | Rule |
|---|---|
| Reviews law | Consumer Protection (Fair Trading) Act: misleading claims, including fake reviews, are unfair practices. ASAS Code of Advertising Practice and its interactive and influencer marketing guidelines: disclose paid or gifted posts. |
| Review requests | PDPA 2012: consent and a notified purpose. Check the Do Not Call Registry before SMS or WhatsApp requests to Singapore numbers. Bulk unsolicited email follows the Spam Control Act ("<ADV>" label), but requests to existing customers with consent are not unsolicited. |
| UGC rights | PDPA consent for each person shown. |
| Platforms | Google, Facebook reviews, Shopee and Lazada ratings for e-commerce, G2 for B2B. |
| Community | WhatsApp Communities, Telegram and Facebook Groups work well. |
| Language | English; Mandarin, Malay or Tamil for some B2C audiences. Festive timing: avoid review pushes in Chinese New Year week; use post-11.11 and 12.12 orders. |

## 3. North America (launch 3rd)

### United States

| Topic | Rule |
|---|---|
| Reviews law | FTC Trade Regulation Rule on the Use of Consumer Reviews and Testimonials (16 CFR Part 465, in force 21 October 2024): bans fake or AI-written reviews, buying reviews conditioned on sentiment, undisclosed insider reviews, company-controlled "independent" review sites, review suppression by threats or false reports, and fake social influence (bought followers or views). Civil penalties per violation. Consumer Review Fairness Act: never use contract terms that stop customers from posting honest reviews. |
| Endorsements | FTC Endorsement Guides: disclose any material connection (payment, free product, discount) clearly in the post. |
| Review requests | Email: CAN-SPAM (postal address, opt-out within 10 business days). SMS: TCPA prior express written consent; 10DLC registration. |
| UGC rights | Right of publicity (state law): written release for each person shown in ads. |
| Privacy | CCPA/CPRA (California) and other states: honour opt-outs and Global Privacy Control. |
| Platforms | Google, Yelp (Yelp bans asking for reviews: do not send Yelp links), Amazon (no incentives; use Amazon's own request button only), G2, Capterra, TrustRadius. |

### Canada

| Topic | Rule |
|---|---|
| Reviews law | Competition Act: fake or misleading reviews are deceptive marketing. Competition Bureau has acted on fake reviews. Ad Standards influencer disclosure guidelines. |
| Review requests | CASL: a review request that promotes the business is a commercial electronic message. A purchase in the last 2 years gives implied consent. Include sender identity and an unsubscribe that works within 10 business days. |
| Quebec | Charter of the French Language: requests, replies and community content for Quebec customers in French. Quebec Law 25 for personal data. |
| Platforms | Google, Yelp (same ban on asking), G2 for B2B. |

## 4. GCC: UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman (launch 4th, start UAE and Saudi Arabia)

| Topic | Rule |
|---|---|
| Reviews and content law | Each country bans misleading advertising. Public content must respect religion, culture, public morals and the state. UAE: Media Council rules; posting paid content needs an advertiser permit. Saudi Arabia: Mawthooq licence for people who post paid or promotional content (General Commission for Audiovisual Media). Paid UGC from a creator in these countries needs the local licence check. |
| Review requests | Each country's data law: UAE PDPL (Decree-Law 45 of 2021; DIFC and ADGM have their own laws), Saudi PDPL (SDAIA; limits on transfer out of the country), Qatar PDPPL, Bahrain PDPL, Oman PDPL, Kuwait CITRA regulation. SMS and WhatsApp: registered sender IDs and telecom send-time limits. |
| UGC rights | Written consent for each person shown. Extra care with images of women and families: ask for explicit consent for public and paid use; many customers say no to face images. |
| Moderation | Higher sensitivity list: religion, royal families and rulers, politics, alcohol, gambling, dating, LGBT topics, immodest images. Any such item is red (person review). Ramadan: no party or food-heavy UGC in daytime posts. |
| Platforms | Google (main), Talabat and Noon ratings for e-commerce and food, TripAdvisor for hospitality, G2 for B2B. |
| Community | WhatsApp Communities first, then Instagram broadcast channels and Telegram. Arabic and English groups are separate. |
| Language | Gulf Arabic for B2C (right-to-left), English for B2B. Replies are warm and formal; use greetings. Weekend: Saturday-Sunday (UAE), Friday-Saturday (others). |

## 5. European Union (launch 5th, lead country Netherlands)

| Topic | Rule |
|---|---|
| Reviews law | Unfair Commercial Practices Directive as amended by the Omnibus Directive (EU 2019/2161): fake reviews and commissioning them are banned; a business that shows reviews must say whether and how it checks that they come from real customers. Show this statement next to every review widget. |
| Review requests | GDPR lawful basis; ePrivacy rules differ by country. Germany expects opt-in; German courts have treated feedback requests by email as advertising, so in Germany send review requests only with marketing consent. Netherlands: existing-customer exemption for similar products, with opt-out. |
| AI rules | EU AI Act Article 50 (from 2 August 2026): tell people when they talk to an AI (community host agent, reply agent where it signs as the brand) and label AI-generated or edited images and video. |
| UGC rights | GDPR consent for each person shown; right to withdraw. Withdrawal removes content from live use within 30 days. |
| Disclosure | National rules on paid content, for example France's influencer law of 2023 ("Publicité" or "Collaboration commerciale" label; image edit labels). |
| Platforms | Google, Trustpilot, Kiyoh (NL), Trusted Shops (DE), Bol.com ratings (NL), G2 for B2B. |
| Language | Native editor for German, French, Spanish, Dutch B2C. English works for Dutch and Nordic B2B. |

## Quick table

| Market | Review request basis (default) | SMS / WhatsApp | Incentive for reviews | Paid UGC label | Extra check |
|---|---|---|---|---|---|
| UK | Soft opt-in or consent | Consent or soft opt-in | Platform rules; never tied to rating | "Ad" | DMCC review steps |
| SG | Consent (PDPA purpose) | DNC Registry check | Platform rules | Clear disclosure (ASAS) | DNC |
| US | Opt-out regime (email) | Prior express written consent | Platform rules; FTC no sentiment link | Clear disclosure (FTC) | No Yelp asks; right of publicity release |
| CA | Implied CASL (purchase < 2 years) | Express or implied CASL | Platform rules | Ad Standards disclosure | French for Quebec |
| GCC | Consent per country law | Registered sender, time limits | Platform rules | Local labels + licence (UAE, SA) | Cultural moderation list |
| EU | Consent (DE), existing customer (NL) | Consent | Platform rules | National labels | Omnibus verification note; AI Act labels |
