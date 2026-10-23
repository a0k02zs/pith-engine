# 04 · Templates

Copy these into the client portal or the project tool. Field names match the agent schemas in `03-agent-prompts.md`.

---

## T1 · Video brief

| Field | Required | Example |
|---|---|---|
| Job ID | auto | VID-ACME-2026-0142 |
| Client / brand | yes | Acme Coffee |
| Source service | yes | Campaigns (2) / Social (4) / Paid (11) / Content (7) / Events (16) / Client request |
| Objective | yes | Sell the new cold brew subscription |
| KPI and target | yes | CPA under £18 on Meta |
| Audience / persona | yes | Urban commuters 25–40 (persona "Rushed Rachel") |
| B2B or B2C | yes | B2C |
| Markets and languages | yes | UK (en-GB), UAE (en, ar) |
| Channels and placements | yes | Meta Reels and Stories, TikTok In-Feed |
| Format | yes | Paid ad variants, 15 s and 6 s |
| Number of videos / variants | yes | 2 bodies × 5 hooks × 2 lengths |
| Key message | yes | Cafe-quality cold brew at home for half the price |
| Approved claims to use | yes | CLM-014 "Brewed for 18 hours", CLM-021 "Cancel anytime" |
| Offer and CTA | yes | 30% off first box · "Start your subscription" |
| Mandatory items | no | Logo end card, price disclaimer |
| Do not show / say | no | No competitor names, no alcohol references |
| Tone | inferred | From brand voice |
| References | no | Links to past winners or competitor ads |
| Deadline | yes | 14 Nov 2026 |
| Budget band | yes | Growth package allocation |
| People on camera | no | None / creators / customer / employee |

---

## T2 · Script (two-column)

```
Job: VID-ACME-2026-0142   Script: S1   Angle: "Cafe at home"   Hook: H3 (question)   Length: 15 s   Market: UK en-GB
| Time    | Visual                                        | Audio (VO / dialogue)                           | On-screen text          | Claim ID |
|---------|-----------------------------------------------|-------------------------------------------------|-------------------------|----------|
| 0–3 s   | Close-up: £4.80 cafe receipt crumpled in hand  | "Still paying £4.80 for cold brew?"             | £4.80. Every. Day.      | –        |
| 3–7 s   | Pour shot from fridge jug into glass, ice      | "Ours is brewed for 18 hours..."                | Brewed for 18 hours     | CLM-014  |
| 7–12 s  | Box on doorstep, hand opens it                 | "...and lands at your door every month."        | Delivered monthly       | –        |
| 12–15 s | End card: logo, offer, CTA                     | "Get 30% off your first box."                   | 30% off · Cancel anytime| CLM-021  |
CTA: Start your subscription   Est. duration: 15 s   New claims needed: none
```

---

## T3 · Shot list

| Shot | Script rows | Type | Subject / action | Source | Duration | Notes |
|---|---|---|---|---|---|---|
| 1 | 1 | ECU | Receipt crumpled in hand | Filmed / stock | 3 s | Real price for market |
| 2 | 2 | CU | Pour into glass with ice | AI or stock | 4 s | Must match product colour |
| 3 | 3 | MS | Doorstep box reveal | Creator | 5 s | Creator's own home |
| 4 | 4 | Graphic | End card | Template | 3 s | Brand kit v3 |

For Track C, add: call time, location, crew, props, wardrobe, permits, release status per person.

---

## T4 · Consent and release record (likeness, voice, AI)

One record per person. The engine stores it; G3 checks it. A lawyer adapts the legal form per market.

| Field | Values |
|---|---|
| Consent ID | CNS-000123 |
| Person name and role | e.g. "Jane Doe, customer, Head of Ops at X" |
| Age check | Adult confirmed / guardian consent attached |
| Scope: filming | yes / no |
| Scope: use of name, job title, company | yes / no |
| Scope: AI likeness (avatar) | yes / no |
| Scope: AI voice clone | yes / no; languages allowed |
| Scope: edits | Standard edits only / translation and dub allowed |
| Channels | Organic social / paid ads / website / sales / broadcast |
| Markets | UK, SG, US, CA, GCC (list), EU (list) |
| Term | Start date, end date |
| Fee and payment terms | Amount, currency, or "none" |
| Right to withdraw | How and with what notice; what happens to live ads |
| Data notice | Privacy notice link for the market (GDPR, PDPA, PDPL and so on) |
| Signature and date | Electronic signature ID |
| Status | active / expired / revoked |

**Hard rule:** AI avatar or voice clone needs separate, explicit "yes" for that scope. Filming consent alone is not enough.

---

## T5 · Licence log

| Asset ID | Type | Source / library | Licence ID | Allowed use | Markets | Expiry | Jobs used in |
|---|---|---|---|---|---|---|---|
| MUS-0091 | Music | Licensed library (named in client brain) | LIC-88721 | Paid + organic, all platforms | Worldwide | 31 Dec 2027 | VID-0142, VID-0150 |
| STK-0312 | Stock video | Stock library | LIC-55102 | Commercial | Worldwide | Perpetual | VID-0142 |
| TAL-0007 | Talent (creator) | Creator contract | CTR-2026-044 | Paid usage 6 months | UK, UAE | 30 Apr 2027 | VID-0142 |

The orchestrator alerts 30 days before any expiry and lists live placements of the asset.

---

## T6 · Delivery spec (platform defaults; confirm against current platform specs each quarter)

| Platform / placement | Ratio | Length | Text safe zone | Captions |
|---|---|---|---|---|
| TikTok In-Feed | 9:16 | 9–34 s best | Keep clear of bottom ~20% and right edge (UI) | Burned in |
| Instagram / Facebook Reels | 9:16 | 15–30 s for ads | Keep clear of top ~14% and bottom ~35% | Burned in |
| Instagram / Facebook Feed | 4:5 or 1:1 | 15 s | Normal margins | Burned in |
| Stories | 9:16 | 15 s per card | Keep clear of top and bottom ~14% | Burned in |
| YouTube Shorts | 9:16 | up to 60 s for ads | Keep clear of bottom ~20% | Burned in |
| YouTube in-stream | 16:9 | 6 s bumper, 15 s, 30 s | Normal | Sidecar + burned for ads |
| LinkedIn feed | 1:1 or 4:5 (9:16 in mobile placements) | 15–30 s | Normal | Burned in |
| Snapchat | 9:16 | 3–10 s best | Keep clear of top and bottom | Burned in |
| Website / sales | 16:9 | any | Normal | Sidecar (WebVTT) |

File naming: `{client}_{campaign}_{format}_{hookID}_{market}_{lang}_{ratio}_{len}s_v{n}.mp4`

---

## T7 · QC checklist (automated + editor)

| # | Check | Automated | Editor |
|---|---|---|---|
| 1 | Length, resolution (min 1080 on short side), frame rate | ✓ | |
| 2 | Loudness: −14 LUFS social, −23 LUFS EU broadcast; no clipping | ✓ | |
| 3 | Captions present, in sync, spelled for the market | ✓ | ✓ |
| 4 | Text inside safe zone | ✓ | ✓ |
| 5 | Logo, colours, fonts match brand kit | ✓ | ✓ |
| 6 | Claims match approved list; disclaimers present | ✓ | ✓ |
| 7 | Consent records active for every person shown or heard | ✓ | |
| 8 | AI label present where market or platform needs it | ✓ | ✓ |
| 9 | Ad disclosure label for creator or partner content | ✓ | ✓ |
| 10 | Licence IDs for all music, stock, talent | ✓ | |
| 11 | Cultural check for each market (GCC content standards) | | ✓ |
| 12 | Picture quality, pacing, first frame works with sound off | | ✓ |

---

## T8 · Testimonial interview guide (Track C or remote record)

1. Please say your name, your role and your company. (Confirm on-screen title spelling.)
2. What did your team do before you used {{client}}?
3. What was the hardest part of that?
4. Why did you choose {{client}}?
5. What changed after you started? Do you have a number you are comfortable sharing?
6. What would you tell a peer who has the same problem?
7. Is there anything we should not include?

Rules: the customer uses their own words. We do not script answers. Any number the customer says
is checked with them and recorded as a claim before use.
