# B2C flow templates

Each email has: subject line options (the copywriter agent writes 3 final options), preview text, body skeleton and call to action (CTA). Square brackets `[ ]` show what the agent writes. Example copy is for a fictional UK skincare brand, "Northwind". The agent replaces it with the client voice.

---

## B2C-01 Welcome

### Email 1 (at once): Welcome
- **Subject options:** "Welcome to {{brand_name}}" · "You are in. Here is your {{offer}}" · "[Brand promise in 5 words]"
- **Preview:** "[What they get from this list, in 1 line]"
- **Body:**
  1. Hello {{first_name | fallback: "there"}}. [1 line thank you.]
  2. [Brand story in 3 short lines: who we are, what we make, why it is different. Use only approved claims.]
  3. [If an offer exists: the offer, the code and the end date {{offer_end_date}}.]
  4. [What to expect from these emails: how often, what kind.]
- **CTA:** "Shop [top category]" → `{{shop_url}}{{utm}}`
- **Example:** "Hello Jane. Thanks for joining us. We make skincare with 5 ingredients or fewer, tested on real skin, not on animals. Here is 10% off your first order: WELCOME10, until 31/10/2026."

### Email 2 (day 2): Best sellers
- **Subject options:** "Our 3 most-loved [products]" · "Where most people start" · "[Persona problem] solved in 3 steps"
- **Body:** 1 line intro, `{{product_block}}` with 3 products for the persona, 1 line per product on the benefit.
- **CTA:** "See the best sellers"

### Email 3 (day 4): Social proof
- **Subject options:** "[Number] people gave this 5 stars" · "Do not take our word for it" · "What [persona] say after 30 days"
- **Body:** 2 or 3 real reviews (from the review platform, never invented), 1 UGC image with usage rights, the average rating.
- **CTA:** "Read the reviews"

### Email 4 (day 7): Objections
- **Subject options:** "Your questions, answered" · "Free returns. Here is how." · "Will it work for you?"
- **Body:** 3 to 4 short questions and answers: shipping cost and time for the contact's market, returns, guarantee, how to choose.
- **CTA:** "Find your [product]"

### Email 5 (day 10, only if an offer exists): Offer reminder
- **Subject options:** "Your {{offer}} ends on {{offer_end_date}}" · "Last days for your welcome gift"
- **Body:** 2 lines. The offer, the code, the end date. No false urgency: the date is real.
- **CTA:** "Use my {{offer}}"

---

## B2C-02 Browse abandon

### Email 1 (4 hours)
- **Subject options:** "Still thinking about {{product_name}}?" · "{{product_name}}: a closer look" · "You have good taste"
- **Body:** product image, name, price in local currency, 3 key benefits, 2 related products.
- **CTA:** "Take another look"

### Email 2 (day 2)
- **Subject options:** "What people say about {{product_name}}" · "{{rating}} stars from {{review_count}} reviews"
- **Body:** 2 reviews of that product, 1 line on returns.
- **CTA:** "See {{product_name}}"

---

## B2C-03 Cart abandon

### Email 1 (1 hour)
- **Subject options:** "You left something behind" · "Your cart is saved" · "{{product_name}} is waiting"
- **Body:** cart items with images, quantities and prices; 1 line on delivery time to the contact's market.
- **CTA:** "Return to my cart" → `{{cart_url}}`

### Email 2 (hour 24)
- **Subject options:** "Any questions about your order?" · "Here is what others asked"
- **Body:** 2 reviews and 3 short answers to common questions. A reply-to that a person reads.
- **CTA:** "Complete my order"

### Email 3 (hour 72, only if the client brain allows an incentive)
- **Subject options:** "A little something to help you decide" · "{{offer}} on your cart, for 48 hours"
- **Body:** the incentive, the real end time, the cart.
- **CTA:** "Use my {{offer}}"

---

## B2C-04 Post-purchase

### Email 1 (day 1): Thank you
- **Subject options:** "Thank you, {{first_name}}" · "Your order is on its way soon"
- **Body:** thanks, what happens next, delivery estimate, 1 line on the brand mission. Not the receipt.
- **CTA:** "Track my order" (if a tracking link exists)

### Email 2 (delivery + 3 days): Get the best use
- **Subject options:** "How to get the best from {{product_name}}" · "3 tips for your first week"
- **Body:** 3 numbered tips, 1 short video link if Service 3 made one.
- **CTA:** "Watch the 1-minute guide"

### Email 3 (delivery + 10 days): Review request
- **Subject options:** "How is {{product_name}} working for you?" · "1 minute: tell us what you think"
- **Body:** a simple ask. Every customer gets the same ask (no review gating). No reward for a positive review.
- **CTA:** "Write a review"

### Email 4 (day 30): Cross-sell
- **Subject options:** "Goes well with your {{product_name}}" · "Your next step"
- **Body:** 2 or 3 products that fit the first purchase.
- **CTA:** "Shop the set"

---

## B2C-05 Win-back

### Email 1 (day 0): What is new
- **Subject options:** "It has been a while, {{first_name}}" · "New since your last visit"
- **Body:** 3 new products or changes since the last purchase.
- **CTA:** "See what is new"

### Email 2 (day 7): Personal pick
- **Subject options:** "Picked for you" · "Based on your last order"
- **Body:** 3 recommendations from purchase history.
- **CTA:** "Shop my picks"

### Email 3 (day 14, only if an offer is allowed): Offer
- **Subject options:** "We would like you back: {{offer}}" · "{{offer}}, just for you"
- **Body:** the offer and the end date.
- **CTA:** "Use my {{offer}}"

---

## B2C-06 Replenish

### Email 1 (80% of use period)
- **Subject options:** "Running low on {{product_name}}?" · "Time for a top-up"
- **Body:** product image, 1-click re-order, an option to subscribe if the client sells subscriptions.
- **CTA:** "Re-order in 1 click"

### Email 2 (100% of use period)
- **Subject options:** "Do not run out" · "Your {{product_name}} refill"
- **CTA:** "Re-order now"

---

## B2C-07 Birthday

### Email 1 (day -7)
- **Subject options:** "A birthday gift from us" · "Happy early birthday, {{first_name}}"
- **Body:** the gift or offer, the end date (14 days after the birthday).
- **CTA:** "Claim my gift"

### Email 2 (day -1, only if no click)
- **Subject options:** "Your birthday gift is waiting"
- **CTA:** "Claim my gift"
