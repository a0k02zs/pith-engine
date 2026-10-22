# Email marketing: rules per market

Version 0.1, 21 Oct 2026. The machine-readable version is `config/market-rules.json`.
The engine compliance gate (`POST /compliance/check`) is the final check. This file adds the email-specific rules that the copywriter, the send workflow and the QA agent use.

**Warning:** this is a planning summary from the Pith M plan. It is not legal advice. A local lawyer confirms each market before the first send in that market.

Launch order (from the plan): United Kingdom, Singapore, North America, GCC, European Union.

## Summary table

| Market | B2C marketing email | B2B email to work addresses | Cold B2B outbound | Must be in every email | Unsubscribe deadline |
|---|---|---|---|---|---|
| United Kingdom (GB) | Consent, or soft opt-in for existing customers | Allowed to corporate subscribers with sender identity and opt-out | Allowed to corporate addresses, after a legitimate interest assessment | Sender identity, a valid opt-out, privacy notice link | Promptly (we use 2 days) |
| Singapore (SG) | Consent for the notified purpose (PDPA) | Consent or notified purpose | Allowed with care; bulk unsolicited email follows the Spam Control Act | Subject starts with `<ADV>` for unsolicited bulk email; sender details; unsubscribe | 10 business days (we use 2 days) |
| United States (US) | Opt-out regime (CAN-SPAM) | Opt-out regime | Allowed | Physical postal address, clear ad identity, honest subject and headers, opt-out | 10 business days (we use 2 days) |
| Canada (CA) | Express or implied consent (CASL) | Express or implied consent | Only under narrow exceptions | Sender name, mailing address, 1 other contact method, unsubscribe | 10 business days (we use 2 days) |
| Quebec (CA-QC) | As Canada | As Canada | As Canada | As Canada, and the email is in French | As Canada |
| GCC (AE, SA, QA, KW, BH, OM) | Consent first | Allowed with care under each country's data law | Allowed with care; low volume; relationship-first | Sender identity, unsubscribe, Arabic version for B2C | We use 2 days |
| European Union | Opt-in consent; soft opt-in for existing customers | Varies by country; strict in Germany | Varies by country; not in Germany without consent | Sender identity, unsubscribe, privacy notice; Article 14 notice for third-party data | Without delay (we use 2 days) |

We use 2 days in every market because Gmail and Yahoo require bulk senders to process unsubscribes within 2 days. This is stricter than most laws, so 1 rule works everywhere.

## 1. United Kingdom

**Law:** UK GDPR, Data Protection Act 2018, PECR. The Data (Use and Access) Act 2025 raises PECR fines to UK GDPR levels.

**Consent bases the send workflow accepts:**
- B2C: `consent`, `double_opt_in`, `soft_opt_in`.
- Soft opt-in applies only when all are true: the contact bought or started to buy from the client; the email is about similar products or services of the client; the contact had a clear chance to opt out at collection and has one in every email.
- B2B to a corporate subscriber (for example `jane@company.co.uk`): `corporate_subscriber` or `legitimate_interest`. Sole traders and some partnerships count as individuals, so they need B2C rules.

**Localization:** British English spelling, GBP, dates as DD/MM/YYYY. Direct, low-hype tone.
**Key dates:** January sales, Black Friday, Christmas, Boxing Day, end of tax year (5 April) for B2B.
**Default send time:** B2B 10:00 Tuesday to Thursday; B2C 19:00 any day.

## 2. Singapore

**Law:** PDPA 2012 (consent and notified purpose). Spam Control Act for unsolicited commercial email in bulk. The Do Not Call Registry applies to phone numbers (SMS and calls), not to email.

**Consent bases the send workflow accepts:** `consent`, `double_opt_in`. For B2B: `legitimate_interest` only with a PDPA purpose notice and a Spam Control Act check.

**Spam Control Act rules for unsolicited bulk email:**
- The subject line starts with `<ADV>` and a space.
- The email has accurate sender details and a working unsubscribe.
- The subject line and headers are not misleading.

The QA agent adds the `<ADV>` label when the recipient did not ask for the email. The send workflow blocks an unsolicited bulk send that has no label.

**Localization:** English. Mandarin, Malay or Tamil for some B2C audiences. SGD, dates as DD/MM/YYYY. Practical, value-led tone.
**Key dates:** Chinese New Year, Hari Raya Puasa, Deepavali, 9.9, 11.11 and 12.12 sales, Great Singapore Sale.

## 3. United States

**Law:** CAN-SPAM Act. State privacy laws such as CCPA/CPRA (honour opt-outs and Global Privacy Control). FTC rules on endorsements and fake reviews apply to email content.

**Consent bases the send workflow accepts:** `consent`, `double_opt_in`, `opt_out_regime`. The client still needs a lawful way to have the address.

**Must be in every commercial email:**
- A valid physical postal address of the sender.
- A clear opt-out that works for at least 30 days after the send.
- Honest "From", "Reply-to" and subject line.
- A clear statement that the email is an advertisement, unless the recipient gave consent.

**Localization:** US English, USD, dates as MM/DD/YYYY. Confident, benefit-first tone with proof. 4 main time zones in the contiguous US; send at local time.
**Key dates:** Super Bowl, July 4, Labor Day, Thanksgiving, Black Friday, Cyber Monday, Q4 budget season for B2B.

## 4. Canada (and Quebec)

**Law:** CASL, PIPEDA, Quebec Law 25, Charter of the French Language (Quebec).

**Consent bases the send workflow accepts:**
- `express_casl`: valid until the contact withdraws it.
- `implied_casl`: from an existing business relationship. The workflow checks `expires_at`. Defaults: 2 years after a purchase or contract, 6 months after an inquiry.
- `casl_business_exemption`: only for B2B to an address that the person published, with no "no spam" note, and a message that is relevant to the person's role. The send workflow needs a source URL on the consent record.

**Must be in every commercial email:**
- The sender's name, and the client's name if Pith sends for the client.
- A mailing address and 1 of: phone number, email address or web address.
- An unsubscribe that works for at least 60 days after the send.

**Quebec (CA-QC):** the email is in French. An English version can follow, but French is at least as prominent.
**Localization:** Canadian English spelling, CAD. Different Thanksgiving date from the US. Canada Day (1 July), Boxing Day.

## 5. GCC: UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman

**Law:** UAE PDPL (Decree-Law 45 of 2021), with separate laws in DIFC and ADGM. Saudi PDPL (SDAIA), with limits on sending personal data out of the country. Qatar PDPPL (Law 13 of 2016). Bahrain PDPL (Law 30 of 2018). Oman PDPL (Royal Decree 6 of 2022). Kuwait data privacy regulation (CITRA).

**Consent bases the send workflow accepts:**
- B2C: `consent`, `double_opt_in`.
- B2B: `consent`, `legitimate_interest` with low volume, and only for named, relevant contacts.

**Data rule for Saudi Arabia:** before the first sync of Saudi contacts to an email platform outside Saudi Arabia, the ops lead confirms the data transfer basis. This is approval kind `go_live`.

**Localization:**
- English for most B2B. Gulf Arabic for B2C and government-linked buyers.
- Arabic emails use right-to-left layout (`dir="rtl"`) and an Arabic web font with a safe fallback.
- 6 currencies: AED, SAR, QAR, KWD, BHD, OMR.
- Respectful, premium, relationship-first tone. Saudi Arabia is more conservative. No content against religion, culture or public morals.

**Work week:** the weekend is Saturday and Sunday in the UAE, and Friday and Saturday in the other 5 countries. B2B sends go on local work days only.
**Ramadan:** B2C sends move to the evening after iftar. Offers respect the meaning of the month. Dates move each year, so the planner agent reads them from the calendar each year.
**Key dates:** Ramadan, Eid al-Fitr, Eid al-Adha, Saudi Founding Day (22 February), Kuwait National Day (25 February), Saudi National Day (23 September), UAE National Day (2 December), Qatar National Day (18 December), Dubai Shopping Festival, White Friday.

## 6. European Union

**Law:** GDPR and the ePrivacy rules in each country. The EU AI Act Article 50 transparency rules apply from 2 August 2026.

**Start with 1 or 2 lead countries.** The plan uses the Netherlands as its EU example.

**Consent bases the send workflow accepts:**
- B2C: `consent`, `double_opt_in`, `soft_opt_in` (existing customers, similar products, opt-out at collection and in every email).
- B2B: depends on the country. Default rule: `consent` or `double_opt_in`. A country can allow `legitimate_interest` for B2B only after the lawyer confirms it in the market config.
- Germany (DE): `double_opt_in` only, for B2C and B2B.

**Third-party data (for example from Apollo):** the contact gets an Article 14 privacy notice in the first email or within 1 month. The email includes the source of the data and a link to the privacy notice.

**Localization:** English works for Dutch and Nordic B2B. German, French and Spanish need a native editor. EUR, dates as DD/MM/YYYY or DD.MM.YYYY. Factual, precise tone with no US-style hype.

## 7. Rules for all markets

- Every email has a working one-click unsubscribe (RFC 8058 headers) and a visible unsubscribe link.
- Every email shows the sender identity from the client brain (legal name and postal address).
- The workflow never sends to a contact whose email consent status is `withdrawn`, `expired` or `unknown` for that purpose.
- AI-generated text in email does not need a label in most markets today. If an email shows an AI-generated image or a synthetic person, follow the label rule in the engine compliance rules.
- No subject line can be misleading. No fake "Re:" or "Fwd:" prefixes.
