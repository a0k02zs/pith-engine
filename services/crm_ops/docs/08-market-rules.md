# Market rules for CRM operations

Version 1 · 21 Oct 2026. Machine format: `market-overlay.json`.

**Not legal advice.** This is a planning summary. A local lawyer confirms each market before launch, as the master plan says.

**How this file relates to the engine.** The engine compliance rules (`engine/specs/compliance-rules.json`) decide who may get a message, by channel, purpose and country (`eligible_bases`), and they run at every send. This service does not copy those rules. This file adds only what a CRM build needs: what each form must capture, where the data may live, how fast to answer a data request, the working week for routing, and the language for sales follow-up. Rule ids in brackets are engine rule ids.

## United Kingdom (GB) · launch 1st

| Topic | Rule for the CRM |
|---|---|
| Form consent | B2C: unticked opt-in box per channel, or soft opt-in for customers (similar products, with an opt-out at collection). B2B corporate email: `legitimate_interest` or `corporate_subscriber` is eligible for email. Store the basis. |
| Enrichment | Personal-profile enrichment needs a legitimate interest assessment on file [UK-LIA]. Third-party data needs a privacy notice to the person [same duty as EU-ART14]. |
| Data location | UK or EU data centre, or a transfer tool (UK IDTA or the UK addendum to EU SCCs) for other regions. |
| Data requests | Answer within 1 month. Can extend by 2 months for complex requests. |
| Working week | Monday to Friday. |
| Must capture | Privacy notice URL on every form [UK-PRIVACY-URL]. Cookie consent before tracking [UK-COOKIE]. |

## Singapore (SG) · launch 2nd

| Topic | Rule for the CRM |
|---|---|
| Form consent | Consent with a notified purpose [SG-PURPOSE]. Store the purpose text id. |
| Phone numbers | Check the Do Not Call Registry before marketing SMS or calls [SG-DNC]. The engine treats a check older than 21 days as stale. W10 lists stale checks. |
| Data location | Overseas transfer needs a comparable standard of protection (contract or binding rules). |
| Data requests | Answer access requests as soon as reasonably possible (PDPC guidance: 30 days). |
| Working week | Monday to Friday. |

## United States (US) · launch 3rd

| Topic | Rule for the CRM |
|---|---|
| Form consent | Email: opt-out regime (CAN-SPAM). SMS and auto-dialled calls: prior express written consent (TCPA). The SMS box needs its own wording and is never pre-ticked. |
| Opt-outs | Honour within 10 business days [US-OPTOUT-10D]; the CRM does it at once. Honour Global Privacy Control where state law requires it [US-GPC], for example California. Store `gpc_opt_out`. |
| Data requests | CCPA/CPRA: answer within 45 days, can extend by 45 days. |
| Working week | Monday to Friday, by the lead's time zone (6 US time zones). |
| Must capture | Physical postal address of the sender in every marketing email [US-POSTAL] (brand `sender_identity`). |

## Canada (CA) · launch 3rd

| Topic | Rule for the CRM |
|---|---|
| Form consent | CASL: express consent (`express_casl`) with sender identity and an unsubscribe; or implied consent (`implied_casl`). Cold B2B email only under the published-address exception [CA-BIZ-EXEMPTION]. |
| Consent expiry | Implied consent from a purchase or contract: 2 years. From an inquiry: 6 months. The CRM writes `expires_at` on the engine consent [CA-CONSENT-EXPIRY]. W10 lists contacts that expire in the next 30 days so a re-permission email can go first. |
| Quebec (CA-QC) | Marketing and sales follow-up in French [QC-FRENCH]. Route to a French-speaking rep. Quebec Law 25 applies to personal data. |
| Data requests | PIPEDA: 30 days, can extend by 30 days. Quebec Law 25: 30 days. |
| Working week | Monday to Friday, by the lead's time zone. |

## Middle East (GCC: AE, SA, QA, KW, BH, OM) · launch 4th

| Topic | Rule for the CRM |
|---|---|
| Form consent | Consent or double opt-in for B2C. B2B corporate email can use `legitimate_interest`. Each country has its own data law (UAE PDPL, Saudi PDPL, Qatar PDPPL, Bahrain PDPL, Oman PDPL, Kuwait CITRA regulation). |
| Saudi data location | Check the limits on moving personal data out of Saudi Arabia before you sync to a cloud CRM outside the country [SA-DATA-TRANSFER]. The Ops Architect flags this at G1. |
| UAE free zones | DIFC and ADGM contacts follow their own data protection laws (engine subdivisions). |
| Language | Arabic for B2C follow-up and for government-linked buyers [GCC-ARABIC-B2C]. Route Saudi leads to an Arabic-speaking rep where possible. |
| Data requests | Saudi PDPL: 30 days. Other GCC countries: confirm with local counsel; use 30 days as the internal target. |
| Working week | UAE: Monday to Friday. SA, QA, KW, BH, OM: Sunday to Thursday. |
| Holidays | Ramadan and Eid dates move each year. The client chooses if nurture pauses for Eid. SLA clocks pause on public holidays. |

## European Union (EU) · launch 5th

| Topic | Rule for the CRM |
|---|---|
| Form consent | Opt-in per channel; soft opt-in for customers where national law allows. Germany: double opt-in for email [DE-DOI]. The CRM holds a single opt-in DE contact as not marketable until the confirm click. |
| Third-party data | Send an Article 14 notice within 1 month of getting the data, and at the latest at the first contact [EU-ART14]. Write `art14_notice_sent_at`. |
| Enrichment | Needs a legitimate interest assessment on file, as in the UK. |
| Data location | EU data centre (HubSpot EU, Salesforce Hyperforce EU), or a transfer tool (adequacy decision or SCCs). |
| Data requests | 1 month, can extend by 2 months. |
| Working week | Monday to Friday, by the lead's time zone. |
| Must capture | Cookie consent before tracking [EU-COOKIE]. |
