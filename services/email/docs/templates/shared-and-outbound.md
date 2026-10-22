# Shared flow and outbound templates

---

## SHARED-01 Newsletter

**Structure:**
1. **Subject:** about the lead story, not "Newsletter #12".
2. **Preview text:** the second item, so the reader sees 2 reasons to open.
3. **Lead story (60 to 100 words):** from the content thread. 1 image, 1 link.
4. **2 or 3 short items (30 words each):** news, tips, events, a customer result.
5. **1 offer or 1 CTA** (B2C: product; B2B: webinar, report or call).
6. **Footer** for the market.

**Subject options (examples):** "[Lead story headline]" · "[Number] things [persona] should know this week" · "[Season or local date]: [topic]"

---

## SHARED-02 Sunset

### Email 1 (day 0)
- **Subject options:** "Do you still want our emails?" · "Should we stay in touch, {{first_name}}?"
- **Body:** "We have not seen you open or click for a while. We only want to send email you find useful. Click below to stay on the list. If you do nothing, we will stop emailing you in 7 days."
- **CTA:** "Yes, keep me on the list" (1 click, no login)
- **Second link:** "Send me fewer emails" → preferences

### Email 2 (day 7)
- **Subject options:** "This is our last email" · "Goodbye for now"
- **Body:** 2 lines. The "keep me" button again.
- **CTA:** "Keep me on the list"

---

## SHARED-03 Re-permission

**Warning:** send only where the market rules allow 1 request email. Not in Canada or the EU without a valid basis.

### Email 1 (day 0)
- **Subject options:** "Can we keep in touch?" · "Please confirm you want emails from {{brand_name}}"
- **Body:** what the contact gets (3 bullet points), how often, a clear button. No pre-ticked box on the landing page.
- **CTA:** "Yes, send me emails"

### Email 2 (day 5)
- **Subject options:** "Reminder: confirm your emails from {{brand_name}}"
- **CTA:** "Yes, send me emails"

---

## OUT-01 Cold outbound sequence (B2B)

**Rules:**
- Plain text. No images. No tracking pixel in step 1 (it hurts deliverability). Track replies and link clicks only.
- Under 100 words per email.
- 1 relevant reason per email, from a real, recent signal (a job post, a funding round, a published article, a tool change).
- No fake "Re:" or "Fwd:" in the subject.
- An unsubscribe line in every email: "If this is not relevant, reply 'no' and I will not email you again." Plus the market footer.
- Sender: a real person at the client, on an outbound domain.

### Step 1 (day 0)
- **Subject options:** "{{company}} and [problem]" · "Question about [their initiative]" · "[Signal] at {{company}}"
- **Body:**
  > Hi {{first_name}},
  > [1 line on the signal, with the source.]
  > [1 line on the problem that signal often brings for their role.]
  > [1 line on how a peer company solved it, approved claim only.]
  > Worth a short chat?
  > {{sender_name}}

### Step 2 (day 3)
- **Subject:** reply in the same thread (no new subject).
- **Body:** 1 new point of value: a short insight, a benchmark number or a 1-line case result. "Happy to send the 1-page summary if it helps."

### Step 3 (day 7)
- **Subject options:** "Another angle on [topic]"
- **Body:** a different pain for the same role, in 3 sentences.

### Step 4 (day 14)
- **Subject:** reply in the same thread.
- **Body:** "I will not follow up after this. If [problem] becomes a priority, my calendar is here: {{booking_url}}."

### Reply handling
The reply triage agent (see `prompts/`) sorts each reply into: interested, meeting request, not now, not interested, wrong person (with a referral), unsubscribe, out of office, bounce. Interested and meeting replies go to sales within 5 minutes in business hours.
