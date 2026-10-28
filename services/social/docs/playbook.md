# Organic social media playbook

This playbook is the strategy that the agents follow. Each client gets its own copy of the variables (pillars, platforms, cadence) in the client brain. The rules here are the defaults.

## 1. Principles

1. **Platform first.** Write for the platform, not for "social". A LinkedIn post and a TikTok are different products. Never cross-post the same text to all platforms.
2. **Market first.** Each post has 1 target market. A post for the UK and a post for Saudi Arabia are 2 posts, even when the idea is the same.
3. **Pillars, not random posts.** Every post maps to 1 content pillar and 1 funnel stage. A post that maps to nothing does not ship.
4. **People decide, agents do volume.** Agents draft, check, schedule and learn. People approve the calendar, any flagged post, and every escalation.
5. **Data picks winners.** Each month the analyst changes the pillar mix and the formats from results, not from opinions.
6. **Fast and human in replies.** A real answer in 2 hours beats a perfect answer in 2 days. A complaint never gets a canned answer.

## 2. Platform roles

| Platform | B2B role | B2C role | Lead formats |
|----------|----------|----------|--------------|
| LinkedIn (company page + executive profiles) | **Primary.** Authority, hiring, demand creation | Employer brand only | Document (carousel) posts, text with 1 image, short video, polls |
| Instagram | Culture, events, employer brand | **Primary.** Brand, product, community | Reels, carousels, Stories |
| TikTok | Optional (founder-led, education) | **Primary** for under-35 audiences | Native short video, trends with brand fit |
| YouTube (Shorts + long form) | Webinars, explainers, search | Tutorials, product demos | Shorts from service 3; long form from events |
| Facebook | Low priority | Strong in Singapore and with over-45 audiences; groups | Video, link posts, events |
| X | Industry news, founders | Strong in Saudi Arabia and Kuwait; customer service | Short text, threads, replies |
| Snapchat | – | Very strong in Saudi Arabia (organic Stories, Spotlight) | Vertical video |
| Pinterest | – | Home, fashion, food, US and Canada | Static pins, idea pins |
| Threads | Optional | Optional | Text, reuse of X ideas |
| WhatsApp Channels | – | GCC, Singapore, UK broadcast | Short updates. 1-to-1 chat belongs to service 10 |
| XING | German-speaking B2B | – | Text + link |

The client brain stores the platform list per client and per market. Default sets are in `markets/market-rules.json` → `platforms`.

## 3. Content pillars

Each client has 3 to 5 pillars. The planner never invents a pillar. Pillars are set at onboarding (template: `templates/pillars.md`) and changed only at the monthly review.

Default pillar sets:

- **B2B:** (1) Point of view: the client's opinion on the industry. (2) Proof: case studies, results, customer voices. (3) How-to: practical advice that the buyer can use today. (4) People and culture: team, hiring, behind the scenes. (5) Product: launches and features, maximum 20% of posts.
- **B2C:** (1) Product in use: show, do not tell. (2) Education: tips, routines, how-to. (3) Community and UGC: customer content with rights (from service 18). (4) Entertainment: trends and formats with brand fit. (5) Offers: maximum 20% of posts, more in key sale periods.

### Funnel mix (default, per month)

| Stage | B2B share | B2C share | Primary KPI |
|-------|-----------|-----------|-------------|
| Reach (top) | 40% | 50% | Reach in target audience, shares |
| Engage (middle) | 40% | 30% | Engagement rate, saves, comments |
| Convert (bottom) | 20% | 20% | Clicks, sign-ups, sales |

## 4. Cadence (default per package)

These are proposed service packages. Pith sets the final names and prices.

| Package | Platforms | Feed posts / week / platform | Stories / week | Community hours | Markets included |
|---------|-----------|------------------------------|----------------|-----------------|------------------|
| Starter | 2 | 3 | 3 (B2C) | Business hours, 1 market | 1 |
| Growth | 3 | 4 to 5 | 5 (B2C) | Business hours, all markets in package | 2 |
| Scale | 4 to 5 | 5 to 7 | Daily (B2C) | Extended hours (7:00–22:00 local) | 3 or more |

Executive LinkedIn profiles (B2B add-on): 2 to 3 posts per week per executive. The executive approves each post (plan, service 14). This pack drafts them; the PR thread owns the programme.

## 5. Posting times

Start with the defaults below, in the **local time of the target market**. After 8 weeks, the analyst replaces them with the best windows from the account's own data.

| Audience | Default windows (local) |
|----------|-------------------------|
| B2B LinkedIn | Tue–Thu, 08:00–10:00 and 12:00–13:00 |
| B2C Instagram / TikTok | 12:00–13:00 and 19:00–22:00, plus weekend late mornings |
| GCC, B2C, during Ramadan | After iftar to late night (about 21:00–01:00) |
| GCC working week | Sunday–Thursday in Saudi Arabia, Qatar, Kuwait, Bahrain, Oman; Monday–Friday in the UAE |

These windows are starting hypotheses, not measured data.

## 6. Content sources

The planner builds the calendar from 6 sources, in this order of priority:

1. The campaign plan (service 2) and fixed dates for the month.
2. Market key dates (`markets/market-rules.json` → `key_dates`).
3. Content from other services: blog posts and reports (7), videos (3), webinars (16), UGC with rights (18), creator posts with reuse rights (6), PR coverage (14).
4. Trends and questions from the listener (step 1).
5. Top performers from the last 90 days, to reuse in a new format.
6. Pillar gaps: pillars below their target share this month.

The planner leaves 10% of slots as "reactive" by default (`reactive_share`), to fill later through the fast lane (`social.reactive_post`).

## 7. Client onboarding (2 weeks)

| Day | Step | Owner |
|-----|------|-------|
| 1 | Client fills `templates/onboarding-brief.md` in the portal. Pith gets admin or editor access to each account through the platform's business tools (Meta Business Suite, LinkedIn Page admin, TikTok Business Center). Never ask for passwords. | Social lead |
| 1–3 | Listener runs a 90-day audit: own accounts, 3 named competitors, mentions, top posts | Agent |
| 3–5 | Planner proposes pillars, platform roles, cadence and a voice sample of 10 posts | Agent |
| 6 | Workshop with the client: approve pillars, voice samples, reply rules, escalation contacts | Social lead |
| 7–8 | Load brand templates (Canva), the reply library and the banned-topic list into the client brain | Social lead |
| 9–10 | First calendar through Gate A. First 2 weeks: every post goes through Gate B (trust period) | Agent + client |
| After 30 days | If the client accepts more than 90% of posts unchanged, move the client to autonomy level 2 (`approvals-and-kpis.md`) | Social lead |

## 8. Handoffs to other services

| Need | Goes to | How |
|------|---------|-----|
| A video or Reel | Service 3 (video) | `video/brief.requested` event with the post brief |
| A post to boost with money | Service 11 (paid social) | Approval item of kind `budget`. Organic agents never start paid spend |
| Customer content to reuse | Service 18 (community and UGC) | Read assets with `rights_status = granted` only |
| A creator collaboration post | Service 6 (influencer) | Collab posts need the creator contract and disclosure |
| A press or journalist message | Service 14 (PR) | Escalation, category `press` |
| A 1-to-1 chat that becomes a sale or a support case | Service 10 (messaging) or the client's support desk | Escalation, category `service` |

## 9. What we never do

- Buy followers, likes, views or comments, or use engagement pods. This is banned by platform rules, and in the US the FTC rule on fake reviews and testimonials (2024) also bans fake indicators of social media influence.
- Post about politics, religion, tragedies or disasters for marketing.
- Use a trend, sound or meme that the platform does not license for business accounts. Business accounts use the commercial music library only.
- Reply to a complaint, a journalist or a regulator with an agent alone.
- Post a new product claim, price, or health, finance or legal statement without Gate B.
- Use a person's face, voice or content without written rights.
- Send unsolicited promotional DMs. Outbound DMs are treated as electronic marketing messages (for example under CASL in Canada and PECR in the UK).
