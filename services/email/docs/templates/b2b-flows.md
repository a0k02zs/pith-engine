# B2B flow templates

Square brackets `[ ]` show what the agent writes. Example copy is for a fictional SaaS client, "Ledgerly" (finance automation). B2B emails look like a note from a person: plain layout, short paragraphs, 1 link. Sender: a named person from the client, for example "{{sender_name}}, Ledgerly".

---

## B2B-01 Lead magnet nurture

### Email 1 (at once): Deliver
- **Subject options:** "Your copy of {{asset_title}}" · "Here is the {{asset_title}}"
- **Body:**
  1. Hi {{first_name}}, here is {{asset_title}}: {{asset_url}}
  2. [1 line: the most useful page or finding, and why it matters for the persona's role.]
  3. [Sign-off from a named person.]
- **CTA:** "Download the report"
- **Example:** "Hi Tom, here is the 2026 Month-End Close Benchmark. Page 6 is the one most finance leads ask about: teams that close in 5 days or less do 3 things differently."

### Email 2 (day 3): Key insight
- **Subject options:** "The 1 number in the report that surprised us" · "[Insight] in 2 minutes"
- **Body:** 1 insight from the asset, 3 to 5 sentences. Link to a related case study.
- **CTA:** "Read how [customer] did it"

### Email 3 (day 7): Problem to solution
- **Subject options:** "Why [persona problem] keeps happening" · "A fix for [problem]"
- **Body:** name the problem in the persona's words, the cost of it, 1 way to fix it, where the product helps. Approved claims only.
- **CTA:** "See how it works"

### Email 4 (day 12): Proof
- **Subject options:** "How [customer] cut [metric] by [number]" · "[Industry] team, [result]"
- **Body:** customer, situation, result with a number from the approved claims list, 1 quote.
- **CTA:** "Read the full story"

### Email 5 (day 18): Soft call to action
- **Subject options:** "Worth a 20-minute chat?" · "Questions about [topic]?"
- **Body:** 3 sentences. Offer a short call, or the next webinar from the events thread.
- **CTA:** "Pick a time" → `{{booking_url}}`

---

## B2B-02 Demo no-show

### Email 1 (1 hour)
- **Subject options:** "Sorry we missed you" · "Shall we find another time?"
- **Body:** "Hi {{first_name}}, we had a call booked today and I think something came up. No problem. Here is my calendar: {{booking_url}}. {{rep_name}}"
- **CTA:** booking link (plain text)

### Email 2 (day 2)
- **Subject options:** "The demo in 2 minutes" · "A short version for you"
- **Body:** 2-minute recorded demo, and the booking link for questions.
- **CTA:** "Watch the 2-minute demo"

### Email 3 (day 7)
- **Subject options:** "Should I close your file?" · "Last note from me"
- **Body:** plain text from {{rep_name}}. Polite, short. "If the timing is wrong, reply 'later' and I will check in next quarter."
- **CTA:** reply

---

## B2B-03 Trial onboarding

| # | When | Subject options | Body | CTA |
|---|---|---|---|---|
| 1 | At once | "Welcome to {{brand_name}}: start here" · "Your first step" | Welcome, the 1 first step to value, time it takes | "Do step 1" |
| 2 | Day 1 (skip if activated) | "Need a hand with [activation step]?" | 3 numbered steps, a 60-second video, a help contact | "Finish setup" |
| 3 | Day 3 | "How [persona role]s use {{brand_name}}" | 1 use case for the persona | "Try [feature]" |
| 4 | Day 7 | "How [customer] got [result] in 30 days" | Customer story with an approved number | "Read the story" |
| 5 | Trial end -3 days | "Your trial ends on {{trial_end_date}}" | What stays, what stops, plan options, a sales contact | "Choose a plan" |
| 6 | Trial end day | "Today is the last day of your trial" | 2 lines, the plan link, an offer to extend if sales approves | "Keep my account" |

---

## B2B-04 Closed-lost re-engage

| # | When | Subject options | Body | CTA |
|---|---|---|---|---|
| 1 | Day 90 | "Something changed since we last spoke" | 1 product change that matches the loss reason in the CRM (price, feature, integration) | "See what is new" |
| 2 | Day 120 | "[Industry] report: [finding]" | 1 useful insight, no pitch | "Read the report" |
| 3 | Day 150 | "Worth another look?" | 3 sentences from the original rep | "Pick a time" |

---

## B2B-05 Account-based sequence

The ABM thread gives the account brief: account name, trigger (hiring, funding, new leader, tech change), buying committee and roles. The agent writes 1 sequence per role.

### Email skeleton (per contact)
- **Subject options:** "[Account trigger] at {{company}}" · "{{company}} and [problem]" · "[Peer company] and {{company}}"
- **Body (under 120 words):**
  1. [The trigger, in 1 line, with a real source.]
  2. [Why it matters for this person's role.]
  3. [1 proof point from a peer company, approved claims only.]
  4. [A simple ask.]
- **CTA:** reply, or the account landing page from the CRO thread.

**Approval:** every tier 1 email goes to the account owner (approval kind `copy`).
