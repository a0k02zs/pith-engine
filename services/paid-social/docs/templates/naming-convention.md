# Naming convention

The agents read names to find the market, stage and test. Use this pattern on every platform. Use `_` between parts. Use only letters, digits and `-` inside a part.

## Campaign
`{client}_{market}_{platform}_{stage}_{objective}_{yyyymm}`

Example: `acme_GB_meta_prospect_purchase_202611`

## Ad set (or ad group)
`{audience}_{placement}_{optimization}_{test-id or AO}`

Example: `broad-25-54_auto_purchase_T014`. `AO` means always-on (not a test).

## Ad
`{test-id}-{variant}_{format}_{angle}_{hook}_{lang}`

Example: `T014-V03_vid915_socialproof_q-hook_en`

## Codes

| Part | Allowed values |
|---|---|
| market | GB, SG, US, CA, CA-QC, AE, SA, QA, KW, BH, OM, NL, DE, FR, ES (ISO 3166 codes; add others with the engine) |
| platform | meta, linkedin, tiktok, snapchat, x |
| stage | prospect, retarget, retain, test |
| objective | purchase, lead, signup, install, sql, traffic, awareness |
| format | img11, img45, car, vid915, vid11, vid45, doc (LinkedIn document), ugc |
| angle | problem, outcome, socialproof, offer, founder, compare, demo, howto |
| lang | en, fr, ar, zh, ms, ta, nl, de, es |

## UTM tags

Follow `engine/specs/analytics.md`. Default for this service:

`utm_source={platform}&utm_medium=paid_social&utm_campaign={campaign name}&utm_content={ad name}&utm_term={ad set name}`
