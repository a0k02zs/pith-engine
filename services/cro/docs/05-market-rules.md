# CRO and Landing Pages: Market Rules

Status: v1, 21 Oct 2026. Markets and launch order come from the plan: UK, Singapore, North America (US and Canada), GCC, EU.

**Not legal advice.** This is a planning summary. The engine compliance gate (`specs/compliance-rules.json` in the engine folder) holds the rules as data. A local lawyer confirms each market before launch, as the plan says.

## 1. Rules for all markets

1. **Test cookies are not essential.** A/B test tools and heatmap tools set cookies or similar storage. In markets that need cookie consent, load them only after consent. Visitors without consent see the control and are not in the test.
2. **No dark patterns.** No fake urgency, fake scarcity, hidden costs, pre-ticked boxes or confirmshaming. Consumer law in all 5 markets can treat these as unfair or deceptive.
3. **Price display.** Consumer pages show the full price, with tax where the market expects it, and all fixed fees at the start.
4. **Accessibility.** Build to WCAG 2.2 level AA in every market, even where the law asks for less. 1 standard is cheaper than 5.
5. **Consent on forms.** Forms collect consent per channel and purpose. The engine stores it (`consent.json`). The compliance gate checks the form text.

## 2. Per-market rules

### 2.1 United Kingdom (launch 1st)

| Topic | Rule for CRO and landing pages |
|---|---|
| Language and format | British English. GBP (£). DD/MM/YYYY. Low-hype tone. |
| Price | Consumer prices include VAT. The Digital Markets, Competition and Consumers Act 2024 bans drip pricing: show fixed mandatory fees in the headline price. |
| Cookies and testing | PECR: consent before non-essential cookies, which includes A/B test and heatmap tools. The Data (Use and Access) Act 2025 adds some new cookie exemptions; a lawyer confirms whether they cover test tools before we rely on them. |
| Forms | UK GDPR privacy notice link. Email consent or soft opt-in (existing customers, similar products, opt-out offered at collection). Unticked boxes. |
| Accessibility | Equality Act 2010 duty to make reasonable adjustments. Use WCAG 2.2 AA. |
| Trust and payment | Trustpilot or Feefo ratings, Apple Pay, Google Pay, PayPal, Klarna or Clearpay for B2C. Card logos. |
| Ads and claims | CAP Code: claims need proof; "Ad" labels on creator content. |
| Test calendar (no new starts) | Black Friday week, Christmas to Boxing Day, January sales start; B2B: end of tax year (5 April) week. |

### 2.2 Singapore (launch 2nd)

| Topic | Rule for CRO and landing pages |
|---|---|
| Language and format | English first; Mandarin, Malay or Tamil versions for some B2C audiences. SGD (S$). DD/MM/YYYY. Practical, value-led tone. |
| Price | GST-registered businesses show consumer prices with GST included (9%). |
| Cookies and testing | PDPA: notify the purpose and get consent for personal data. Show a cookie notice before test and analytics tools; follow the client's PDPA policy for consent. |
| Forms | PDPA purpose statement on every form. If a form collects a Singapore phone number for marketing, the engine checks the Do Not Call Registry before any SMS or call. |
| Accessibility | No general private-sector accessibility law. Use WCAG 2.2 AA. |
| Trust and payment | PayNow, GrabPay, cards, Apple Pay; Atome for buy-now-pay-later. Google reviews. |
| Ads and claims | ASAS Code of Advertising Practice. |
| Test calendar (no new starts) | Chinese New Year, Hari Raya Puasa, Deepavali, 9.9, 11.11, 12.12, Great Singapore Sale start. |

### 2.3 United States (launch 3rd, with Canada)

| Topic | Rule for CRO and landing pages |
|---|---|
| Language and format | US English. USD ($). MM/DD/YYYY. Benefit-first tone with proof. 6 time zones for webinar pages. |
| Price | Show mandatory fees in the price. FTC rule on unfair or deceptive fees covers live-event tickets and short-term lodging; some states (for example California) require all-in prices for all sectors. Sales tax can be added at checkout. |
| Cookies and testing | No federal cookie-consent law. Honour opt-outs and Global Privacy Control in states that require it (for example California CCPA/CPRA). Give a "Do not sell or share" link where needed. |
| Forms | If the form collects a phone number for marketing SMS, show a clear TCPA consent text; consent is not a condition of purchase. Email follows CAN-SPAM (opt-out regime). |
| Accessibility | ADA: courts often apply it to websites. WCAG 2.2 AA lowers the risk of claims. |
| Trust and payment | Cards, Apple Pay, PayPal, Shop Pay, Affirm or Klarna. G2 and Capterra badges for B2B; reviews for B2C. |
| Ads and claims | FTC Act: claims need proof. FTC rule on fake reviews and testimonials: never invent reviews. |
| Test calendar (no new starts) | Super Bowl week (B2C), July 4, Thanksgiving to Cyber Monday, Christmas. B2B: Q4 budget season changes buyer behaviour; note it in the plan. |

### 2.4 Canada (launch 3rd, with the US)

| Topic | Rule for CRO and landing pages |
|---|---|
| Language and format | Canadian English. CAD ($ or CA$). Quebec: French pages required, and the French must be at least as prominent as any other language (Charter of the French Language). |
| Price | Advertised price must be the price a consumer can pay, with mandatory fees (Competition Act, drip pricing). Taxes (GST/HST/PST) can be added. |
| Cookies and testing | PIPEDA: meaningful consent; Quebec Law 25 requires that tracking tools are off by default and turned on by the visitor. |
| Forms | CASL: express consent check box, not pre-ticked, with sender identity and the purpose. Keep the consent record. |
| Accessibility | Accessible Canada Act (federal); AODA in Ontario for many organizations. Use WCAG 2.2 AA. |
| Trust and payment | Interac, cards, Apple Pay, PayPal. |
| Test calendar (no new starts) | Canada Day (1 July), Canadian Thanksgiving (October), Black Friday, Boxing Day. |

### 2.5 GCC: UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman (launch 4th; start with UAE and Saudi Arabia)

| Topic | Rule for CRO and landing pages |
|---|---|
| Language and format | English for most B2B; Gulf Arabic for B2C and government-linked buyers. Arabic pages are right-to-left (`dir="rtl"`) and need a native editor. 6 currencies: AED, SAR, QAR, KWD, BHD, OMR. KWD, BHD and OMR use 3 decimal places. Respectful, premium tone; Saudi Arabia is more conservative. |
| Price | Show VAT-inclusive consumer prices where VAT applies: UAE 5%, Saudi Arabia 15%, Bahrain 10%, Oman 5%. Qatar and Kuwait have no VAT. |
| Weekend | UAE: Saturday and Sunday. Other 5 countries: Friday and Saturday. Tests still run 14 full days, so each test covers 2 weekends in every country. |
| Cookies and testing | Each country has its own data law (UAE PDPL, with DIFC and ADGM laws; Saudi PDPL; Qatar PDPPL; Bahrain PDPL; Oman PDPL; Kuwait CITRA rules). Use a consent banner and a privacy notice. Saudi PDPL limits sending personal data out of the country: confirm where the test tool stores data before a Saudi test. |
| Forms | Consent per purpose. WhatsApp opt-in on forms is common and useful; the engine stores it as a separate channel consent. |
| Imagery and content | Respect religion, culture and public morals. Modest imagery. No alcohol, gambling or dating content. Review Ramadan pages with a native editor. |
| Trust and payment | Cards, Apple Pay, Tabby and Tamara (buy-now-pay-later), mada (Saudi Arabia), STC Pay, cash on delivery for some e-commerce. Local delivery promise. |
| Test calendar (no new starts) | Ramadan and both Eids (dates move each year), White Friday, Dubai Shopping Festival, the national days (UAE 2 December, Qatar 18 December, Saudi 23 September and 22 February, Kuwait 25 February). Behaviour in Ramadan shifts to late evening: do not compare Ramadan data with other months. |

### 2.6 European Union (launch 5th; start with 1 or 2 countries, Netherlands first)

| Topic | Rule for CRO and landing pages |
|---|---|
| Language and format | English works for Dutch and Nordic B2B. German, French and Spanish need native translation. EUR (€). DD/MM/YYYY or DD.MM.YYYY. Factual tone. |
| Price | Consumer prices include VAT. Price Indication Directive (as changed by the Omnibus Directive): a price reduction must show the lowest price of the last 30 days. |
| Cookies and testing | ePrivacy rules: consent before non-essential cookies, including test and heatmap tools. Germany is strict. Consent mode lets analytics model data without cookies. |
| Forms | GDPR lawful basis per purpose; opt-in for marketing email (double opt-in is normal in Germany). Unticked boxes. Privacy notice. |
| Accessibility | European Accessibility Act applies from 28 June 2025 to many consumer e-commerce and banking services (standard EN 301 549, based on WCAG). Micro-enterprises are exempt for services. |
| Trust and payment | Netherlands: iDEAL first. Belgium: Bancontact. France: Cartes Bancaires. Germany: PayPal, invoice payment, Klarna. SEPA debit. Trusted Shops badges. |
| Ads and AI | Unfair Commercial Practices Directive bans dark patterns and fake reviews. EU AI Act Article 50: label AI-generated or manipulated images and video (from 2 August 2026). |
| Test calendar (no new starts) | Black Friday, Christmas, local summer holiday peak (July and August) for B2B, King's Day (Netherlands, 27 April). |

## 3. Market setting file (for the workflow)

The page builder and the test designer read this per market. The values follow `contracts/enums.json` market codes.

```json
{
  "GB":  { "lang": "en-GB", "dir": "ltr", "currency": "GBP", "decimals": 2, "date": "DD/MM/YYYY", "tax_in_price": true,  "cookie_consent_for_tests": true,  "weekend": ["sat","sun"] },
  "SG":  { "lang": "en-SG", "dir": "ltr", "currency": "SGD", "decimals": 2, "date": "DD/MM/YYYY", "tax_in_price": true,  "cookie_consent_for_tests": true,  "weekend": ["sat","sun"] },
  "US":  { "lang": "en-US", "dir": "ltr", "currency": "USD", "decimals": 2, "date": "MM/DD/YYYY", "tax_in_price": false, "cookie_consent_for_tests": false, "gpc": true, "weekend": ["sat","sun"] },
  "CA":  { "lang": "en-CA", "dir": "ltr", "currency": "CAD", "decimals": 2, "date": "YYYY-MM-DD", "tax_in_price": false, "cookie_consent_for_tests": true,  "weekend": ["sat","sun"] },
  "CA-QC": { "lang": "fr-CA", "dir": "ltr", "currency": "CAD", "decimals": 2, "date": "YYYY-MM-DD", "tax_in_price": false, "cookie_consent_for_tests": true, "tracking_off_by_default": true, "weekend": ["sat","sun"] },
  "AE":  { "lang": "ar-AE|en-AE", "dir": "rtl|ltr", "currency": "AED", "decimals": 2, "date": "DD/MM/YYYY", "tax_in_price": true,  "cookie_consent_for_tests": true,  "weekend": ["sat","sun"] },
  "SA":  { "lang": "ar-SA|en-SA", "dir": "rtl|ltr", "currency": "SAR", "decimals": 2, "date": "DD/MM/YYYY", "tax_in_price": true,  "cookie_consent_for_tests": true,  "data_residency_check": true, "weekend": ["fri","sat"] },
  "QA":  { "lang": "ar-QA|en-QA", "dir": "rtl|ltr", "currency": "QAR", "decimals": 2, "date": "DD/MM/YYYY", "tax_in_price": false, "cookie_consent_for_tests": true,  "weekend": ["fri","sat"] },
  "KW":  { "lang": "ar-KW|en-KW", "dir": "rtl|ltr", "currency": "KWD", "decimals": 3, "date": "DD/MM/YYYY", "tax_in_price": false, "cookie_consent_for_tests": true,  "weekend": ["fri","sat"] },
  "BH":  { "lang": "ar-BH|en-BH", "dir": "rtl|ltr", "currency": "BHD", "decimals": 3, "date": "DD/MM/YYYY", "tax_in_price": true,  "cookie_consent_for_tests": true,  "weekend": ["fri","sat"] },
  "OM":  { "lang": "ar-OM|en-OM", "dir": "rtl|ltr", "currency": "OMR", "decimals": 3, "date": "DD/MM/YYYY", "tax_in_price": true,  "cookie_consent_for_tests": true,  "weekend": ["fri","sat"] },
  "NL":  { "lang": "nl-NL|en-NL", "dir": "ltr", "currency": "EUR", "decimals": 2, "date": "DD-MM-YYYY", "tax_in_price": true,  "cookie_consent_for_tests": true,  "lowest_30_day_price_on_discount": true, "weekend": ["sat","sun"] },
  "DE":  { "lang": "de-DE", "dir": "ltr", "currency": "EUR", "decimals": 2, "date": "DD.MM.YYYY", "tax_in_price": true,  "cookie_consent_for_tests": true,  "lowest_30_day_price_on_discount": true, "double_opt_in": true, "weekend": ["sat","sun"] }
}
```

`CA-QC` uses the subdivision code from `enums.json` (`subdivisions_with_own_rules`). Other EU countries copy the NL or DE row and change the language and date format.
