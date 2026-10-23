# ABM rules per market

These rules add ABM-specific points to the plan's market sections and to the engine compliance gate. ABM is B2B, so the main questions are: can we email a business contact before they opt in, what must every message contain, what gifts are allowed, and how does each market like to buy.

**Not legal advice.** This is a planning summary. A local lawyer confirms each market before launch. Points that need a lawyer check are marked "Confirm".

The gift limits in `rules.json` are Pith policy start values, not legal limits. The client and the target account can set lower limits.

## Summary table

| Market | First B2B email without opt-in | Must be in every email | Gifts and direct mail | Buying style |
|--------|--------------------------------|------------------------|-----------------------|--------------|
| United Kingdom | Allowed to corporate addresses (PECR) with a legitimate interests assessment (UK GDPR). Not allowed to sole traders or partnerships without consent | Sender identity, a working opt-out | Low value only; Bribery Act 2010 applies; extra care with public sector | Direct, evidence-led, short emails |
| European Union | Varies by country. Germany: treat as opt-in. France: allowed if relevant to the role. Netherlands: allowed to corporate addresses with care. Confirm per country | Sender identity, opt-out, Article 14 notice within 1 month of first use of the data | Low value; local anti-bribery rules; public sector often has a 0 limit | Formal, native language, data-protection questions early |
| United States | Allowed (CAN-SPAM is opt-out) | Honest header and subject, physical postal address, opt-out honoured in 10 business days | FCPA risk for foreign officials; many state and federal agencies cap gifts; check the account's own gift policy | Fast, benefit-first, proof with numbers |
| Canada | Needs consent (CASL). Exception: address is conspicuously published, no "no spam" statement, and the message is relevant to the role | Sender identity, postal address, unsubscribe working for 60 days | Low value; public sector has strict rules | Like the US but more conservative; French for Quebec (Law 25 and Charter of the French Language) |
| GCC (6 countries) | Allowed with care under each country's data law. Saudi Arabia: confirm consent need and data transfer limits (PDPL, SDAIA). Confirm per country | Sender identity, opt-out, Arabic version for government-linked buyers | Very strict with government and government-linked entities: send no gifts unless the account approves. No alcohol or pork products, no items that conflict with local culture | Relationship-first. Introductions, events and in-person meetings come before cold email |
| Singapore | Business contact information is mostly outside the PDPA consent rules when used for business purposes. Bulk unsolicited email: Spam Control Act. Confirm | "<ADV>" label in the subject for unsolicited bulk commercial email, sender details, unsubscribe | Low value; Prevention of Corruption Act; public sector has strict rules | Practical, value-led, proof from Asia-Pacific peers |

## United Kingdom (launch 1st)

- Basis: legitimate interests for corporate subscribers. Do a legitimate interests assessment (LIA) for each client and store its ID on the campaign.
- Check each email domain. Generic domains (gmail.com, outlook.com) suggest a sole trader. Treat those as consent-only.
- Telephone: check the Corporate Telephone Preference Service (CTPS) before sales calls.
- LinkedIn and display ads to an account list: allowed; the list upload needs a lawful basis and a privacy notice that covers it.
- Public sector buyers: follow the Procurement Act 2023. Do not market to a buyer during an open tender for the same contract.
- Key events: Tech Week London, sector shows. Avoid August and the last 2 weeks of December for Tier 1 launches.

## European Union (launch 5th)

- Basis: legitimate interests with an LIA, unless the country's ePrivacy law asks for opt-in. Default to opt-in for Germany and Austria. Confirm each country before launch.
- Article 14 GDPR: tell each contact where we got their data, within 1 month or at first contact. The first email includes a short notice and a link to the full notice.
- Data residency: keep EU contact data in the EU region of the CRM and the data platform where the client asks for it.
- Language: write in the contact's business language. Use native translators for Tier 1. English is acceptable in the Netherlands and the Nordic countries for most B2B roles.
- Works councils and procurement: large German and French buyers involve them early. Add procurement and legal to the committee from the start.
- Key events: Web Summit (Lisbon), sector fairs. Avoid August.

## North America (launch 3rd)

- United States: CAN-SPAM. Include a physical postal address and a working opt-out. Honour opt-out in 10 business days. State privacy laws (for example CCPA/CPRA) cover B2B contact data in California: honour opt-out and Global Privacy Control.
- Canada: CASL. Store the consent type for each contact: express, implied (existing business relationship in the last 2 years, or conspicuous publication), or none. A contact with "none" gets no email and is not uploaded to ad platforms. Use company-level ad targeting for that account only.
- Quebec: French version of every asset. Law 25 privacy rules apply.
- Public sector (US federal, state, Canadian government): check gift and lobbying rules; do not send gifts unless the account approves.
- Plan touches across 6 time zones. Send at 9:00 to 11:00 local time.
- Key events: SaaStr, sector conferences. Avoid US Thanksgiving week and late December.

## GCC: UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman (launch 4th, UAE and Saudi Arabia first)

- Data laws: UAE PDPL (and DIFC and ADGM laws for companies in those free zones), Saudi PDPL with limits on sending data out of the country, Qatar PDPPL, Bahrain PDPL, Oman PDPL, Kuwait CITRA regulation. Confirm each country.
- Saudi Arabia: before you sync Saudi contact data to a cloud CRM outside the Kingdom, check the transfer rules. Use an in-country region where the client asks for it.
- Order of plays: P1 warm-up, then P4 event or a warm introduction, then P2 executive open. Cold email alone has low results.
- WhatsApp: use it only after the contact gives their number for that purpose or a meeting took place. Use the SMS and WhatsApp service (Service 10) for the send.
- Language: English for most private-sector B2B. Gulf Arabic for government and government-linked buyers. Right-to-left landing pages.
- Weekends: Saturday and Sunday in the UAE; Friday and Saturday in the other 5 countries. Do not send on the local weekend.
- Ramadan: reduce cold touches; send short, respectful messages; plan meetings after Iftar only if the contact proposes it. Restart full cadence after Eid.
- Gifts: no gifts to government officials unless the account approves in writing. No alcohol or pork products. Premium, simple items are best.
- Key events: GITEX (Dubai), LEAP (Riyadh), sector shows. Tier 1 meetings at these events are the main play.

## Singapore (launch 2nd)

- PDPA: business contact information used for business purposes is mostly outside the consent rules. Still keep a purpose notice and honour opt-out. Confirm.
- Spam Control Act: for unsolicited commercial email sent in bulk, add "<ADV>" in the subject, give sender details and an unsubscribe. Treat Tier 3 sends as bulk. Treat Tier 1 1-to-1 emails as not bulk. Confirm.
- Do Not Call Registry: check rules before marketing calls or SMS to Singapore numbers. B2B messages have exemptions. Confirm.
- Public sector: the Prevention of Corruption Act and government procurement rules (GeBIZ). Do not send gifts to public officers.
- Proof: use Asia-Pacific case studies. Many accounts run regional headquarters for Southeast Asia, so the committee can be in several countries.
- Key events: Singapore FinTech Festival, SuperReturn Asia, sector shows. Avoid Chinese New Year week.

## Rules for all markets

1. Contacts come from `POST /audiences/resolve` only. The engine removes contacts with no valid basis for their country.
2. No touch goes out without `POST /compliance/check`. A `block` stops the touch.
3. Gifts above the market limit in `rules.json` need gate G4 approval and an account-side check.
4. The account's own country decides the language and the weekend. The contact's country decides the data law.
5. Never claim a peer customer by name without a signed reference approval in the client brain.
