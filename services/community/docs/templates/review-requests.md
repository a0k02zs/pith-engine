# Review request templates

Service 18. v1, 21 Oct 2026. Approval kind: `template` (gate G2). After approval, repeat sends skip the gate.
Placeholders use `{{ }}`. The writer agent fills them from the client brain and the event. It may change tone to match the client voice. It may not change the compliance lines.

Every template ends with the engine footer block `{{compliance_footer}}`. The compliance gate fills it per country (sender identity, postal address for US, unsubscribe, "<ADV>" where needed).

## E1 B2C email, after delivery

**Subject options (A/B):**
- How is your {{product_short_name}}?
- {{first_name}}, a quick question about your order
- 30 seconds to help other shoppers?

**Body:**

> Hi {{first_name}},
>
> Your {{product_short_name}} arrived {{days_since_delivery}} days ago. We hope it is working well for you.
>
> Would you share an honest review? Good or bad, it helps other people choose, and it helps us improve.
>
> [Write a review]({{review_link}})
>
> It takes about a minute.
>
> {{signoff_name}}, {{brand_name}}
>
> {{compliance_footer}}

Rules: the same link for every customer. No stars in the email that link to different places. No incentive line unless the platform allows it and the client approved it (then add: "Everyone who leaves a review, of any rating, gets {{incentive}}. Your review will show that you received it.").

## E2 Reminder (1 only, 5 days after E1, only if no review and no opt-out)

**Subject:** Still happy to hear from you

> Hi {{first_name}}, a short reminder: if you have a minute, your honest review of {{product_short_name}} helps other shoppers. [Leave a review]({{review_link}}). This is our last reminder for this order.
>
> {{compliance_footer}}

## E3 Happiness check variant (not gating)

> Hi {{first_name}}, how did we do with your {{order_or_visit}}?
>
> [1] [2] [3] [4] [5]
>
> Every rating opens the same page: a thank-you, the public review link, and (for 1 to 3) a note that our team will contact you to fix the problem.

Rule: the landing page always shows the public review link. Check `review_gating` in the QA list before go-live.

## S1 SMS / WhatsApp, after visit (local services, hospitality)

SMS (max 160 characters, sender ID registered):

> {{brand_short}}: Thanks for visiting today, {{first_name}}. Tell others how it went? {{short_review_link}} Reply STOP to opt out

WhatsApp (utility or marketing template, submitted to Meta for approval):

> Hello {{1}}, thank you for choosing {{2}} today. If you have a moment, would you share an honest review? It helps other customers. {{3}}

Arabic version (GCC, native reviewer must check before submission):

> مرحباً {{1}}، شكراً لاختيارك {{2}} اليوم. إذا سمح وقتك، يسعدنا أن تشاركنا تقييمك الصادق، فهو يساعد عملاءنا الآخرين. {{3}}

## B1 B2B email from the account manager (G2, Capterra, TrustRadius)

**Subject:** A favour, {{first_name}}?

> Hi {{first_name}},
>
> Thanks again for {{milestone}}. Your team has {{result_in_their_words}}.
>
> Peers in {{industry}} read {{platform}} before they choose a tool like ours. Would you write an honest review there? It takes about 10 minutes.
>
> [Review us on {{platform}}]({{review_link}})
>
> {{platform_incentive_line}}
>
> Thank you,
> {{account_manager_name}}
>
> {{compliance_footer}}

`{{platform_incentive_line}}` is used only when the review site runs its own incentive programme (for example a gift card that the site pays for any verified review). Text from the site, not from us.

## Q1 Quebec (French) B2C email

**Objet :** Comment trouvez-vous votre {{product_short_name}} ?

> Bonjour {{first_name}},
>
> Votre {{product_short_name}} est arrivé il y a {{days_since_delivery}} jours. Pourriez-vous partager un avis honnête ? Positif ou négatif, il aide les autres clients à choisir.
>
> [Écrire un avis]({{review_link}})
>
> {{compliance_footer}}

A native French editor checks every Quebec template.

## Where not to send review links

- Yelp: never ask for Yelp reviews (Yelp policy). Do not include Yelp in any template.
- Amazon: use only Amazon's "Request a Review" function. No custom emails with incentives.
- Google: no incentives of any kind.
