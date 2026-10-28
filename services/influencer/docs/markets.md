# Market rules for influencer marketing

This is a planning summary from public sources as of October 2026. It is not legal advice. A local lawyer confirms each market before the first paid campaign there. The engine compliance gate (`POST /compliance/check`, `engine/specs/compliance-rules.json`) runs these as rules `G-PAID-DISCLOSURE`, `AE-INFLUENCER-LICENCE`, `SA-INFLUENCER-LICENCE`, `EU-AI-LABEL`, `FR-INFLUENCER-LAW` and `G-CLAIM-APPROVED`. The "Gate rules" line of each market is the detail this service asks the engine to check; send any gap to the engine thread.

Common rules in all 5 markets:
- A paid, gifted or affiliate post is an ad. The creator must say so clearly, at the start, in words the audience understands.
- "Clear" means visible without a click on "more", and spoken or on screen in video.
- Platform paid-partnership tools help, but do not replace a clear label in most markets.
- The brand is also responsible. Pith M and the client can be fined for a creator's hidden ad.
- No claim that the client cannot prove.

## 1. United Kingdom (launch 1st)

- **Rules:** CAP Code and ASA rulings; CMA guidance on hidden ads; Consumer Protection from Unfair Trading rules, now in the Digital Markets, Competition and Consumers Act 2024 (the CMA can fine directly since April 2025).
- **Label:** "Ad" or "#ad" at the start. "Gifted" for gifts with no control by the brand. Affiliate links are ads: "#ad" or "affiliate".
- **Not enough alone:** "#sp", "#spon", "#collab", "thanks to", a tag of the brand, a label only in the bio.
- **Restricted:** HFSS food ads to children, gambling (creator must be 25+ looking and not appeal to under-18s), alcohol (creator must be 25+ looking), cosmetic interventions (no ads to under-18s), financial promotions (FCA rules on "finfluencers").
- **Data:** UK GDPR. Outreach to creators uses legitimate interest with a privacy notice link.
- **Payments:** GBP. VAT if the creator is VAT-registered.
- **Culture and channels:** Instagram, TikTok, YouTube for B2C; LinkedIn for B2B. Low-hype tone.
- **Gate rules:** `label_in ["Ad","#ad"] at caption start; video label in first 3 seconds; gifted -> "Gifted"; no HFSS/gambling/alcohol to under-18 audiences; finance -> FCA review`.

## 2. Singapore (launch 2nd)

- **Rules:** ASAS Singapore Code of Advertising Practice and its Guidelines on Interactive Marketing Communication and Social Media; PDPA 2012.
- **Label:** "#ad", "#sponsored", or "Sponsored by {{brand}}", clear and at the start.
- **Restricted:** health and medical claims (Health Sciences Authority rules), financial products (MAS rules), alcohol.
- **Data:** PDPA consent and purpose notice for personal data. Check the Do Not Call Registry before any SMS or call to a creator's Singapore number.
- **Payments:** SGD. GST if the creator is registered.
- **Culture and channels:** English first; Mandarin, Malay and Tamil creators for some B2C audiences. Instagram, TikTok, YouTube, Facebook. Festive peaks: Chinese New Year, Hari Raya Puasa, Deepavali, 9.9, 11.11, 12.12.
- **Gate rules:** `label_in ["#ad","#sponsored","Sponsored by"] at caption start; health claims -> HSA check; finance -> MAS check; DNC check before SMS`.

## 3. North America (launch 3rd)

### United States
- **Rules:** FTC Endorsement Guides (revised 2023); FTC rule on fake reviews and testimonials (16 CFR Part 465, in force from October 2024); state privacy laws (CCPA/CPRA and others); COPPA for audiences under 13.
- **Label:** "#ad", "Advertisement", "Sponsored", or "Paid partnership with {{brand}}". Put it in the post, not only in the bio or a hashtag crowd. In video: say it and show it. In live streams: repeat it.
- **Not enough alone:** "#sp", "#spon", "#collab", "#ambassador" alone, a label only at the end.
- **Rules for the brand:** the brand must brief creators on disclosure, monitor posts, and fix problems. Keep records (this pipeline's stage 9 proof does this). No fake or bought reviews. No creator may claim experience with a product they did not use.
- **Restricted:** health claims need proof (FTC); dietary supplements, alcohol (creator audience 21+), cannabis (varies by state), financial and crypto products.
- **Payments:** USD. Collect W-9 (US person) or W-8BEN (non-US) before the first payout. Issue Form 1099-NEC where required.
- **Platform note:** check the current status of TikTok in the US before each campaign.
- **Gate rules:** `label_in ["#ad","Ad","Sponsored","Paid partnership"] in first line; video spoken + on screen; live -> repeat; no claim without proof; W-9/W-8BEN before payout`.

### Canada
- **Rules:** Competition Act (false or misleading representations); Ad Standards Influencer Marketing Disclosure Guidelines; PIPEDA and Quebec Law 25 for personal data; CASL for commercial email to creators; Charter of the French Language (Quebec).
- **Label:** "#ad", "#sponsored", "#[brand]_partner"; in French "#pub", "#commandité".
- **Quebec:** creator content for Quebec audiences in French. Outreach to Quebec creators in French first.
- **Data:** CASL needs consent or a narrow exception before a commercial email. A creator's published business email with no "no spam" note, and a message relevant to their business, can fit the exception. Keep the record.
- **Payments:** CAD. GST/HST if the creator is registered.
- **Gate rules:** `label_in ["#ad","#sponsored","#pub","#commandité"] at start; Quebec -> French; CASL record before outreach email`.

## 4. Middle East (GCC) (launch 4th: UAE and Saudi Arabia first)

Creator marketing is very strong in the GCC. Licences are the main difference from other markets.

### UAE
- **Rules:** Federal Decree-Law 55 of 2023 on media and its regulations; UAE Media Council content standards; UAE PDPL (DIFC and ADGM have their own data laws).
- **Licence:** creators who advertise for payment need the UAE Media Council advertiser permit. The vetting agent asks for the permit number and a person verifies it before the `contract` gate. Confirm the current permit rules and any agency licence needs with a UAE lawyer.
- **Label:** a clear ad label in Arabic or English, for example "إعلان" or "#ad".
- **Content:** respect for religion, national identity, culture and public morals; no content against UAE leaders or symbols; modest dress for brand content; no alcohol promotion to general audiences.
- **Payments:** AED. VAT 5% if the creator is registered.

### Saudi Arabia
- **Rules:** GCAM (General Authority for Media Regulation) rules; Saudi PDPL (SDAIA), with limits on sending personal data out of the country.
- **Licence:** creators who advertise need the Mawthooq licence. Verify the number before the `contract` gate. Non-Saudi creators who target Saudi audiences: confirm the current rule with a Saudi lawyer.
- **Label:** a clear ad label, in Arabic for Arabic content, for example "إعلان".
- **Content:** more conservative than the UAE. No alcohol, gambling, or pork products. Dress and gender rules for brand content. Respect for religion and the state.
- **Data:** keep Saudi creator personal data in a region that the PDPL allows; check before sync to a cloud tool.
- **Payments:** SAR. VAT 15%. Check withholding tax on payments to non-resident creators.
- **Channels:** Snapchat, TikTok, Instagram, X and YouTube are all strong.

### Qatar, Kuwait, Bahrain, Oman
- **Rules:** each has its own data law (Qatar PDPPL, Kuwait CITRA regulation, Bahrain PDPL, Oman PDPL) and its own media or commerce rules for advertisers. Some require an advertiser licence or registration for creators. Confirm each country with a local lawyer before the first campaign there.
- **Label and content:** as Saudi Arabia, as a safe default.
- **Payments:** QAR, KWD, BHD, OMR.

- **Gate rules (all GCC):** `licence.required -> licence.verified == true before contract; label present (Arabic for Arabic content); culture_check pass; no alcohol/gambling/pork; Saudi data residency check`.
- **Calendar:** no paid posts with entertainment tone during sensitive moments in Ramadan without client and local review. Peaks: Ramadan and Eid, national days, White Friday, Dubai Shopping Festival.

## 5. European Union (launch 5th, start with 1 or 2 lead countries)

- **EU rules:** Unfair Commercial Practices Directive (hidden ads are banned); Audiovisual Media Services Directive (applies to some video creators); Digital Services Act (platforms show commercial content labels); GDPR; EU AI Act Article 50 (label AI-generated or manipulated content, applies from 2 August 2026).
- **Country rules (examples, check each lead country):**
  - **Netherlands** (Pith pipeline EU example): Media Act rules for large creators (registration with the Commissariaat voor de Media above follower and income thresholds); Dutch Advertising Code social media rules. Label "#adv", "#ad", "#spon", or "#reclame".
  - **France:** influencer law of 9 June 2023 (Law 2023-451): label "Publicité" or "Collaboration commerciale"; labels "Image retouchée" or "Image virtuelle" for edited or AI images; bans on promotion of cosmetic surgery, some financial and crypto products, and other listed products; a written contract is mandatory.
  - **Germany:** label "Werbung" or "Anzeige" at the start. Courts are strict. Gifts the creator keeps also need a label.
  - **Spain:** Royal Decree 444/2024 for high-reach creators ("users of special relevance"), with a register.
  - **Italy:** AGCOM guidelines and code for large creators.
- **Label:** use the local-language label of the lead country. English "#ad" is fine for English-language content in the Netherlands and Nordics.
- **Data:** GDPR legitimate interest for creator outreach, with an Article 14 notice (source of data, purpose, rights) in the first message.
- **Payments:** EUR (and local currencies outside the euro). VAT reverse charge for cross-border B2B services; collect the creator's VAT number.
- **Gate rules:** `label = local_label(country) at start; AI content -> AI label; France -> "Image retouchée"/"Image virtuelle" + banned product list; Germany -> "Werbung"/"Anzeige"; Article 14 notice in outreach`.

## Summary table for the compliance gate

| Market | Label (examples) | Licence check | Special stop |
|---|---|---|---|
| UK | Ad, #ad, Gifted | No | HFSS, gambling, alcohol to minors; finance |
| Singapore | #ad, #sponsored | No | Health, finance claims; DNC for SMS |
| US | #ad, Sponsored, Paid partnership | No | Unproven claims; W-9/W-8BEN |
| Canada | #ad, #sponsored, #pub, #commandité | No | Quebec French; CASL record |
| UAE | إعلان, #ad | Yes: Media Council advertiser permit | Culture check |
| Saudi Arabia | إعلان | Yes: Mawthooq | Culture check; data residency |
| Qatar, Kuwait, Bahrain, Oman | إعلان, #ad | Check per country | Culture check |
| EU | Local label (Werbung, Publicité, #reclame) | Register in NL, ES for large creators | AI label; France product bans |
