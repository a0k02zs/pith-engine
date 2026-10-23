# Market rules · service 12

Source: plan sections "The 5 target markets" and "Compliance summary". This is a planning summary, not legal advice. A local lawyer confirms each market before launch. Launch order: UK, Singapore, North America, GCC, EU.

| Rule | United Kingdom | Singapore | United States | Canada | GCC (6 countries) | European Union |
|------|----------------|-----------|---------------|--------|-------------------|----------------|
| Law | UK GDPR, DPA 2018, PECR, Data (Use and Access) Act 2025 | PDPA 2012 | CCPA/CPRA and other state laws | PIPEDA, Quebec Law 25 | UAE PDPL (and DIFC, ADGM), Saudi PDPL, Qatar PDPPL, Bahrain PDPL, Oman PDPL, Kuwait CITRA regulation | GDPR, ePrivacy rules per country |
| Analytics cookies before consent | No. Consent banner first. Check the 2025 Act exemption for some analytics with your lawyer before you rely on it. | Allowed with notice of purpose; offer withdrawal | Allowed; honour opt-out | Allowed with notice (implied consent); Quebec: off by default until consent | Treat as consent needed; follow each country's law | No. Consent banner first. |
| Ad pixels and conversion APIs | Only with marketing consent | With notice; honour withdrawal | Honour "Do Not Sell or Share" and Global Privacy Control | Notice; Quebec needs express consent | Consent; Saudi: check data transfer first | Only with marketing consent |
| Google Consent Mode v2 | Required (advanced mode) | Recommended | Optional; use for GPC | Recommended; required for Quebec | Recommended | Required (advanced mode) |
| Warehouse location (BigQuery) | `europe-west2` (London) | `asia-southeast1` (Singapore) | `US` multi-region | `northamerica-northeast1` (Montreal) | `me-central2` (Dammam) for Saudi data; `me-central1` (Doha) or `europe-west` for others, after the lawyer check | `EU` multi-region |
| Currency in reports | GBP | SGD | USD | CAD | AED, SAR, QAR, KWD, BHD, OMR; group totals in USD | EUR |
| Week starts | Monday | Monday | Sunday | Sunday | Sunday (UAE: Monday) | Monday |
| Report language | British English | English | US English | Canadian English; French for Quebec clients | English; Arabic summary on request | English; local language for German, French, Spanish clients |
| Reporting calendar notes | Fiscal year end 5 April for many B2B clients; Black Friday to Boxing Day peak | 9.9, 11.11, 12.12 peaks; Chinese New Year dip in B2B | Black Friday to Cyber Monday; Q4 budget season | Different Thanksgiving date from US | Ramadan changes daily traffic curves and the weekly pattern; mark Ramadan and Eid weeks in MMM | August dip in B2B; national holidays differ per country |

## Rules the workflows apply

1. **Consent-gated tags.** Every tag in a tracking plan has a `consent_category` (`necessary`, `analytics`, `marketing`). The G3 compliance check fails if a `marketing` tag fires before consent in the UK, EU or Quebec.
2. **Region-locked datasets.** The client's dataset is made in the region of the client's main market. Data from a Saudi contact goes to the Saudi dataset. Cross-region joins use totals only (no personal data).
3. **Modelled conversions.** In the UK and EU, consent mode makes modelled conversions. Reports show observed and modelled in separate columns.
4. **GPC.** For US clients, the server container drops ad-pixel forwarding when the browser sends `Sec-GPC: 1` in states that require it. The automation engineer keeps the state list current each quarter.
5. **MMM holiday controls.** Each market file in `mmm/` lists its holiday weeks. Ramadan and Eid dates move each year; the MMM agent gets them from a calendar API, not from memory.
6. **Minimum cell size 20.** In all markets, no report shows a group of under 20 people.
