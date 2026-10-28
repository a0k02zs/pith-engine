# PR and thought leadership: market rules

Service 14. Version 0.1, 21 Oct 2026.
Markets and launch order come from the plan: UK, Singapore, North America (US and Canada), GCC, EU.
Country codes match `engine/contracts/enums.json` (`market_groups`).

> This file is a planning summary. It is not legal advice. A local lawyer confirms each market before launch, as the plan says. The compliance gate (`POST /compliance/check`) is the system of record. This file lists the PR-specific rules that the service asks the engine thread to add to `specs/compliance-rules.json`.

## 1. Rules for every market

These rules apply in all 5 markets.

| # | Rule | How the service applies it |
|---|---|---|
| G1 | Journalist data is personal data. Lists from Muck Rack, Cision or Meltwater still need a lawful basis, a privacy notice and an opt-out. | Each journalist is a party (kind `journalist`) with channel `press_pitch` and `attributes.consent_basis` `legitimate_interest` (or the local equivalent) and a source field. Every pitch has a 1-line opt-out. An opt-out removes the journalist from all clients' lists. |
| G2 | Listed clients have disclosure rules. Price-sensitive news goes to the market first. | Client intake records the stock exchange. If the client is listed, every announcement and every executive post on results, deals or guidance needs `client_legal` approval. Embargoes are never offered on price-sensitive news. |
| G3 | Advertorials and paid placements must be labelled. | Any paid media placement is a paid ad, not PR. It goes to Service 11 or 2 with the local label ("Advertisement", "Sponsored", "Ad"). |
| G4 | No invented quotes, customers, numbers or awards. | The QA agent blocks a draft that has a claim not on the approved claims list. New claims go to the claim gate. |
| G5 | Embargoes are an agreement. | An embargoed release goes only to journalists who agree to the embargo by reply. The agent records the agreement. A person decides if an embargo break needs action. |
| G6 | AI-generated content rules. | Every published text has a named human editor and the executive's or the client's approval. Images and video follow the AI label rules of the market and the platform. |
| G7 | Defamation and comparative claims. | No negative statement about a named competitor or person. The QA agent flags names of competitors and people for a person to check. |
| G8 | Sensitive topics. | Politics, religion, race, war, health and finance advice need `pr_lead` approval and, where listed below, `client_legal`. |

## 2. United Kingdom (GB). Launch 1st

| Area | Rule |
|---|---|
| Data | UK GDPR and the Data Protection Act 2018. Legitimate interest for journalist lists, with a legitimate interest assessment on file. Article 14 notice link in the pitch footer. PECR: pitches to corporate addresses are allowed with sender identity and an opt-out. Personal addresses need consent. |
| Listed clients | UK Market Abuse Regulation (UK MAR): inside information goes out through a Regulatory Information Service first, not in a pitch. |
| Media standards | Most UK press follow the IPSO Editors' Code. Respect a journalist's right to decline and to correct. |
| Advertising | CAP Code and the ASA: paid content says "Ad". |
| Tone | Low hype, understatement, evidence. UK journalists dislike "world-leading" and "revolutionary". |
| Timing | Pitch Tuesday to Thursday, 08:00 to 10:30 UK time. Avoid Friday afternoon. Budget day and party conference weeks are crowded. |
| Request feeds | ResponseSource, Qwoted, #journorequest on X. |
| Tier 1 starter list | Financial Times, The Times and Sunday Times, The Guardian, The Telegraph, BBC, Sky News, Reuters, Bloomberg UK, City AM, The Economist, plus the top trade title for the client's sector. |

## 3. Singapore (SG). Launch 2nd

| Area | Rule |
|---|---|
| Data | PDPA 2012: notify the purpose and offer an opt-out for journalist lists. Spam Control Act: bulk unsolicited commercial email needs the "<ADV>" label. Pitches are 1-to-1 and not bulk, so the label does not normally apply. The engine gate decides. |
| Political content | Foreign Interference (Countermeasures) Act 2021 (FICA): no political content for foreign clients. Protection from Online Falsehoods and Manipulation Act 2019 (POFMA): correct any false statement of fact at once. Maintenance of Religious Harmony Act: no content on religion. These topics need `client_legal`. |
| Listed clients | SGX listing rules on continuing disclosure: announce through SGXNet first. |
| Languages | English first. Mandarin for Lianhe Zaobao and some B2C. Malay and Tamil media for some audiences. A native editor checks every translation. |
| Tone | Practical, value-led, with regional (APAC or ASEAN) relevance. Many SG journalists cover the region, so a regional angle helps. |
| Timing | Pitch 09:00 to 11:00 SGT. Avoid Chinese New Year week and Hari Raya. |
| Tier 1 starter list | The Straits Times, The Business Times, CNA, Bloomberg and Reuters Singapore bureaus, Nikkei Asia, Tech in Asia, e27, DealStreetAsia, Lianhe Zaobao. |

## 4. North America (US, CA). Launch 3rd

### 4.1 United States

| Area | Rule |
|---|---|
| Email | CAN-SPAM covers commercial email. A news pitch is often not commercial, but we still use honest headers, a postal address and an opt-out in every pitch. |
| Listed clients | SEC Regulation FD: no selective disclosure of material non-public information to journalists or analysts. Earnings quiet periods block executive posts on results. |
| Endorsements | FTC Endorsement Guides: an executive who praises their own product makes their connection clear (the profile title usually does this). Customer stories need written approval. The FTC rule on fake reviews and testimonials applies to every quote. |
| State privacy | CCPA/CPRA and other state laws: honour opt-outs and Global Privacy Control on web tracking for coverage pages. |
| Tone | Confident, benefit-first, with proof. Exclusives are common and valued. |
| Timing | Pitch Tuesday to Thursday, 07:00 to 10:00 in the journalist's own time zone (plan for 6 time zones). Avoid major holidays and earnings peaks for business press. |
| Request feeds | Qwoted, Featured, Help a B2B Writer, Muck Rack requests. |
| Wire | Business Wire, PR Newswire, GlobeNewswire for listed clients and big announcements. |
| Tier 1 starter list | The Wall Street Journal, The New York Times, Bloomberg, Reuters, AP, CNBC, Forbes (staff writers, not contributors), Fortune, Axios, TechCrunch and The Verge for tech, plus top sector trade titles. |

### 4.2 Canada

| Area | Rule |
|---|---|
| Email | CASL: a pitch that promotes a commercial activity is a commercial electronic message. We use the business exemption for published journalist addresses only when the message is relevant to the journalist's role and the address has no "no unsolicited messages" note. Basis code `casl_business_exemption`. Sender identity and an unsubscribe in every pitch. |
| Data | PIPEDA; Quebec Law 25 for Quebec contacts. |
| Quebec | French-language media need French pitches and French spokespeople where possible. The Charter of the French Language applies to marketing in Quebec. |
| Listed clients | Canadian securities rules (National Policy 51-201 on disclosure): no selective disclosure. |
| Tone | Less hype than the US. Canadian data and a Canadian spokesperson help. |
| Tier 1 starter list | The Globe and Mail, National Post, Financial Post, CBC/Radio-Canada, CTV, The Canadian Press, BNN Bloomberg, La Presse, Le Devoir, Les Affaires, BetaKit for tech. |

## 5. GCC (AE, SA, QA, KW, BH, OM). Launch 4th

Start with the UAE and Saudi Arabia, as the plan says. Add the other 4 countries later.

| Area | Rule |
|---|---|
| Data | Each country has its own data law (UAE PDPL and the DIFC and ADGM laws; Saudi PDPL with limits on data transfer out of the country; Qatar PDPPL; Bahrain PDPL; Oman PDPL; Kuwait CITRA regulation). Keep Saudi journalist data in a store that the Saudi transfer check allows. |
| Media law | UAE: the media regulation law (Federal Decree-Law 55 of 2023) and the UAE Media Council content standards. Saudi Arabia: the General Authority for Media Regulation (GAMR, formerly GCAM). Each country has its own media regulator; check before launch. |
| Content limits | No criticism of rulers, governments, religion or public morals. No political comment. No content that could be seen as defamation, which can be a criminal offence. Sensitive topics need `client_legal`. |
| Influencer link | Executives who post paid promotion may need the UAE advertiser permit or the Saudi Mawthooq licence. Service 6 owns licence checks. |
| Languages | English for most B2B and for English-language titles. Gulf Arabic for Arabic titles and B2C, written by a native Arabic writer, not machine translated. Arabic releases have right-to-left layout. |
| Relationships | Journalists expect a relationship. Plan coffee meetings and events (GITEX, LEAP, FII, Abu Dhabi Finance Week). Cold pitches work less well than in the UK or US. |
| Paid placement | Paid "sponsored" content is common. It is a paid ad (rule G3) and is labelled. |
| Government news | State news agencies (WAM in the UAE, SPA in Saudi Arabia, QNA in Qatar, KUNA in Kuwait, BNA in Bahrain, ONA in Oman) carry official news. A partnership with a government body needs that body's approval of every word. |
| Timing | Weekends: Saturday and Sunday in the UAE; Friday and Saturday in the other 5 countries. Pitch volume falls during Ramadan; plan announcements before Ramadan or after Eid. National days are crowded. |
| Tier 1 starter list | UAE: The National, Gulf News, Khaleej Times, Arabian Business, Al Khaleej, Al Bayan, Zawya. Saudi Arabia: Arab News, Saudi Gazette, Asharq Al-Awsat, Al Eqtisadiah, Argaam, Al Arabiya Business. Qatar: The Peninsula, Gulf Times. Region: Reuters, Bloomberg Asharq, AGBI, Wamda and MAGNiTT for start-ups. |

## 6. European Union. Launch 5th

Start with 1 or 2 lead countries, as the plan says. The Netherlands is the pipeline example.

| Area | Rule |
|---|---|
| Data | GDPR: legitimate interest assessment for journalist lists; Article 14 notice within 1 month of getting the data, or at the first pitch; honour the right to object at once. Germany is strict: pitch only on clear relevance to the journalist's beat. |
| Listed clients | EU Market Abuse Regulation (MAR): inside information goes out through the official channel first. |
| AI content | EU AI Act Article 50 (applies from 2 August 2026): AI-generated text published to inform the public on matters of public interest is disclosed, unless a person reviewed it and a person or company holds editorial responsibility. Our gates give human review. The approval record names the editor and the responsible party. AI images and deepfakes are always labelled. |
| Consumer law | Unfair Commercial Practices Directive and national laws (for example the French influencer law of 2023) for any paid or gifted content. |
| Languages | English works for Dutch and Nordic B2B press. German, French, Spanish and Italian titles need a native writer. A machine translation is never sent to a journalist. |
| Tone | Factual and precise. No US-style hype. Data from that country helps. |
| Press agencies | ANP (NL), dpa (DE), AFP (FR), EFE (ES), ANSA (IT). |
| Timing | Pitch 09:00 to 11:00 local time. August is slow in France, Italy and Spain. |
| Tier 1 starter list (NL first) | Het Financieele Dagblad, NRC, de Volkskrant, NOS, Sprout and Emerce for business and tech. EU-wide: Financial Times Europe, Politico Europe (policy only), Sifted (start-ups), Reuters, Bloomberg. |

## 7. Requested additions to the engine compliance rules

The service asks the engine thread to add these checks for channel `press_pitch` and for executive `social_post` items.

| Check id | Applies to | Outcome |
|---|---|---|
| `pr.optout_line` | `press_pitch`, all markets | `block` if the pitch has no opt-out line |
| `pr.sender_identity` | `press_pitch`, all markets | `block` if the sender name, company and address are missing |
| `pr.listed_client_legal` | Any item for a listed client that mentions results, guidance, deals or funding | `block` until a `client_legal` approval exists |
| `pr.casl_basis` | `press_pitch` to CA | `block` without basis `casl_business_exemption`, `express_casl` or `implied_casl` |
| `pr.fr_quebec` | `press_pitch` to CA-QC French-language outlets | `warn` if the language is not French |
| `pr.sensitive_topic` | All items in SG and GCC | `block` on politics or religion until `client_legal` approves |
| `pr.ai_editor_named` | All published text in EU | `block` if the approval record has no named human editor |
| `pr.unapproved_claim` | All items, all markets | `block` on a number, customer name or award not on the approved claims list |
