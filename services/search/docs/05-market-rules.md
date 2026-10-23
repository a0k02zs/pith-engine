# Service 5: SEO, SEM and GEO — Rules per market

Launch order (from the master plan): United Kingdom, Singapore, North America, Middle East (GCC), European Union.

The agents read this file as config (see `workflows.yaml`, key `markets`). This is a planning summary. It is not legal advice. A local lawyer confirms each market before launch.

## Rules for all markets

- Each market gets its own URL set: subfolder (`/en-gb/`, `/en-sg/`, `/en-us/`, `/en-ca/`, `/fr-ca/`, `/ar-ae/`, `/nl-nl/`) by default. Use ccTLDs only when the client already has them.
- Every localized page has `hreflang` tags for all its versions plus `x-default`, and a self-referencing canonical.
- Keywords are researched per market and language. We never translate a keyword list. Search volume, intent and words differ.
- GEO prompt sets are written per market and language, with local brands as competitors.
- SEM: 1 campaign per market and language. Ad schedule and currency follow the market. Never mix markets in 1 campaign.
- Ads on health, finance, gambling, alcohol, crypto, housing, jobs and credit need a country check before gate G3.

## 1. United Kingdom (launch 1st)

| Topic | Rule |
|---|---|
| Engines | Google about 90%+ share. Bing matters for B2B desktop users and ChatGPT search. |
| Language | British English spelling (optimise, colour). GBP with £. Dates DD/MM/YYYY. |
| Local SEO | Google Business Profile, Bing Places, Yell, Trustpilot (strong in UK B2C). |
| Ads rules | CAP Code and ASA. Price claims must include VAT for consumers. Comparative claims must be checkable. Financial promotions need FCA-authorised sign-off. |
| Data | UK GDPR and PECR. Cookie consent before analytics and ads tags. Google Consent Mode v2 on. |
| Reviews | DMCC Act 2024 bans fake reviews and hidden incentives. |
| Season | January sales, Black Friday, Christmas, Boxing Day, end of tax year (5 April) for B2B. |

## 2. Singapore (launch 2nd)

| Topic | Rule |
|---|---|
| Engines | Google dominant. Bing small. |
| Language | English first (UK spelling). Simplified Chinese for some B2C. Malay and Tamil only when the client asks. SGD with S$. |
| Local SEO | Google Business Profile. Marketplaces (Shopee, Lazada) have their own search: list products there for e-commerce clients. |
| Ads rules | ASAS Code of Advertising Practice. Health products: HSA rules. Financial products: MAS rules. |
| Data | PDPA 2012. Cookie notice and purpose statement. |
| Season | Chinese New Year, Hari Raya Puasa, Deepavali, 9.9, 11.11, 12.12, Great Singapore Sale. |

## 3. North America (launch 3rd)

| Topic | United States | Canada |
|---|---|---|
| Engines | Google about 87%; Bing about 7–9% and higher on desktop B2B. | Same as US. |
| Language | US English, USD, MM/DD/YYYY. | Canadian English (UK-style spelling), CAD. **Quebec: French version of every page and ad (Charter of the French Language, Bill 96).** `fr-ca` hreflang. |
| Local SEO | Google Business Profile, Bing Places, Apple Business Connect, Yelp, BBB. | Google Business Profile, Yelp.ca. |
| Ads rules | FTC Act (truthful claims), FTC fake reviews rule (2024), special ad categories (housing, jobs, credit). State rules on health and alcohol. | Competition Act (misleading claims, drip pricing), Ad Standards Code. |
| Data | State privacy laws (CCPA/CPRA and others). Honour Global Privacy Control on tags. | PIPEDA, Quebec Law 25 (consent for tracking tech). |
| Season | Super Bowl, July 4, Labor Day, Thanksgiving (4th Thursday Nov), Black Friday, Cyber Monday, Q4 B2B budget season. | Canada Day, Thanksgiving (2nd Monday Oct), Boxing Day. |

Plan for 6 time zones in ad schedules.

## 4. Middle East — GCC (launch 4th; start UAE and Saudi Arabia)

| Topic | Rule |
|---|---|
| Engines | Google dominant in all 6 countries. Bing small. |
| Language | English for most B2B. Gulf Arabic (Modern Standard Arabic for formal B2B) for B2C and government buyers. Arabic pages need a native writer, right-to-left layout, `ar-ae` / `ar-sa` hreflang, and Arabic keyword research (many users mix Arabic and English, and type Arabic words in Latin letters — "Arabizi"). |
| Currency | AED, SAR, QAR, KWD, BHD, OMR. |
| Week | Ad schedules follow the local working week: Mon–Fri in the UAE, Sun–Thu in the other 5. |
| Local SEO | Google Business Profile with Arabic name. Local directories (for example Yellow Pages UAE). |
| Ads rules | Content must respect religion, culture and public morals. No alcohol, gambling or dating ads. Saudi Arabia is the most conservative. UAE Media Council rules for advertising content. Ramadan: change tone and ad hours (evening peak after iftar). |
| Data | Each country has its own data law (UAE PDPL, Saudi PDPL with data transfer limits, Qatar PDPPL, Bahrain PDPL, Oman PDPL, Kuwait CITRA regulation). Cookie consent banner in English and Arabic. |
| Season | Ramadan and Eid (dates move each year), White Friday, Dubai Shopping Festival, national days (UAE 2 Dec, Saudi 23 Sep and 22 Feb, Qatar 18 Dec, Kuwait 25 Feb). |

## 5. European Union (launch 5th; start with 1 or 2 lead countries, Netherlands first)

| Topic | Rule |
|---|---|
| Engines | Google about 90%. Bing higher in some B2B markets. |
| Language | Netherlands: Dutch for B2C, English accepted for B2B. Germany, France, Spain: native-language pages and keyword research, edited by a native editor. EUR. Dates DD/MM/YYYY or DD.MM.YYYY. |
| Local SEO | Google Business Profile. Marketplaces: Bol.com (NL), Zalando, Amazon.de/.fr. |
| Ads rules | Unfair Commercial Practices Directive. Price indication rules (Omnibus Directive: show the lowest price of the last 30 days next to a discount). Digital Services Act ad transparency. |
| Data | GDPR and national ePrivacy rules. Consent before any analytics or ads tag. **Google Consent Mode v2 is required** for EEA ad personalization and audiences. |
| AI | EU AI Act Article 50: label AI-generated or manipulated content where it applies (from 2 Aug 2026). Our pages are expert-edited, so the main risk is AI images. Label them. |
| Season | Black Friday, Christmas, local holidays (King's Day NL 27 Apr, Sinterklaas NL 5 Dec). |

## Market config used by the agents

See `workflows.yaml` → `markets`. Each market has: `locale`, `hreflang`, `currency`, `date_format`, `spelling`, `engines`, `ad_week`, `languages_required`, `restricted_ad_categories`, `consent_mode_required`, `review_sources`, `season_calendar`.
