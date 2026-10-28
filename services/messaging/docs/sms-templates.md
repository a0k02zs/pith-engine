# SMS templates

Draft 1, 21 Oct 2026. Variables use `{{double_braces}}`. The copywriter agent fills `{{brand}}` from the client brain.

Rules for every template:
- `{{brand}}:` at the start.
- The opt-out line from `market-rules.yaml` at the end of every marketing message.
- 1 link, on the branded short domain.
- The count below is the worst case with typical variable lengths. Target: 1 segment (160 GSM-7 characters). An emoji or a non-Latin letter changes the limit to 70 characters per segment.

## Consent and service messages

| ID | Use | Category | Text | Chars |
|---|---|---|---|---|
| S-OPTIN-US | US double opt-in confirm (first message) | Compliance | `{{brand}}: Thanks for joining our text alerts! Up to 4 msgs/mo. Msg & data rates may apply. Reply HELP for help, STOP to cancel. Terms: {{terms_link}}` | ~150 |
| S-OPTIN-UK | UK and EU opt-in confirm | Compliance | `{{brand}}: You are now subscribed to texts with offers and news. Up to 4 a month. Reply STOP to opt out at any time. Privacy: {{privacy_link}}` | ~150 |
| S-OPTIN-SG | Singapore opt-in confirm | Compliance | `{{brand}}: You agreed to receive offers by SMS. Up to 4/month. Contact us: {{support_contact}}. Reply STOP to opt out.` | ~120 |
| S-HELP | HELP reply | Compliance | `{{brand}}: Help at {{support_contact}}. Up to 4 msgs/mo. Msg & data rates may apply. Reply STOP to cancel.` | ~110 |
| S-STOP | STOP confirmation (no marketing allowed) | Compliance | `{{brand}}: You are unsubscribed and will get no more texts. Reply START to join again.` | ~90 |
| S-QC-OPTIN | Quebec opt-in confirm (French) | Compliance | `{{brand}} : Merci de votre inscription aux textos. Jusqu'à 4 msg/mois. Des frais peuvent s'appliquer. Répondez ARRET pour vous désabonner.` | ~140 |

## Utility (no offer allowed)

| ID | Flow | Text | Chars |
|---|---|---|---|
| S-ORDER-SHIP | F04 | `{{brand}}: Your order {{order_id}} is on its way. Track it: {{track_link}}` | ~80 |
| S-ORDER-OUT | F04 | `{{brand}}: Your order arrives today. Track it: {{track_link}}` | ~65 |
| S-BOOK-24H | F05 | `{{brand}}: Reminder: {{service}} on {{date}} at {{time}}. Reply C to confirm or R to change. {{manage_link}}` | ~110 |
| S-BOOK-2H | F05 | `{{brand}}: See you at {{time}} today at {{location}}. Directions: {{map_link}}` | ~90 |
| S-MEET-1H | F11 | `{{brand}}: Your call with {{rep_name}} starts at {{time}}. Join: {{join_link}}` | ~85 |
| S-LEAD-ACK | F10 | `{{brand}}: Thanks {{first_name}}, we got your request. {{rep_name}} will call you within 1 business hour. Questions? Reply here.` | ~125 |
| S-RENEW-7D | F12 | `{{brand}}: Your {{plan}} renews on {{date}}. Manage it here: {{account_link}}` | ~85 |

## Marketing

| ID | Flow | Text | Chars |
|---|---|---|---|
| S-WELCOME-D1 | F01 | `{{brand}}: Hi {{first_name}}, here is {{offer}} on your first order. Use code {{code}} by {{expiry}}: {{link}} Reply STOP to opt out` | ~150 |
| S-CART-1H | F02 | `{{brand}}: You left {{product}} in your cart. It is saved for you here: {{cart_link}} Reply STOP to opt out` | ~120 |
| S-CART-23H | F02 | `{{brand}}: Last call: your cart expires soon. {{cart_link}} Reply STOP to opt out` | ~90 |
| S-BACK-STOCK | F09 | `{{brand}}: {{product}} is back in stock. Get it before it goes: {{link}} Reply STOP to opt out` | ~110 |
| S-REPLENISH | F07 | `{{brand}}: Time to restock {{product}}? Reorder in 1 tap: {{reorder_link}} Reply STOP to opt out` | ~105 |
| S-WINBACK-90 | F08 | `{{brand}}: We miss you, {{first_name}}. Here is {{offer}} until {{expiry}}: {{link}} Reply STOP to opt out` | ~120 |
| S-FLASH | Broadcast | `{{brand}}: {{headline}}. {{offer}} ends {{expiry}}. Shop: {{link}} Reply STOP to opt out` | ~120 |
| S-REVIEW | F06 | `{{brand}}: How is your {{product}}? Tell us in 30 seconds: {{review_link}} Reply STOP to opt out` | ~110 |
| S-REPERM | F13 | `{{brand}}: Do you still want our text offers? Reply YES to stay. If not, we will stop texting you on {{date}}. Reply STOP to opt out` | ~135 |

## Arabic (GCC) examples

Arabic uses Unicode: 70 characters per segment, 67 per segment when the message has more than 1 segment. Keep Arabic marketing SMS to 2 segments max.

| ID | Text | Note |
|---|---|---|
| S-AR-CART-1H | `{{brand}}: نسيت {{product}} في سلتك. أكمل طلبك هنا: {{cart_link}} لإلغاء الاشتراك أرسل STOP` | 2 segments |
| S-AR-ORDER-SHIP | `{{brand}}: طلبك {{order_id}} في الطريق. تتبع الشحنة: {{track_link}}` | Utility |
| S-AR-RAMADAN | `{{brand}}: رمضان كريم 🌙 {{offer}} حتى {{expiry}}: {{link}} لإلغاء الاشتراك أرسل STOP` | Send after Iftar only. A native Gulf Arabic editor checks each version |

## Character and encoding check (the compliance pre-check agent runs this)

1. Find the encoding: GSM-7 if every character is in the GSM-7 set, else UCS-2.
2. Count segments: GSM-7 = 160 for 1 segment, 153 per segment after that. UCS-2 = 70, then 67.
3. Fail the template if a marketing SMS is more than 2 segments in either encoding, unless the messaging lead approves it.
4. Warn on "smart quotes", long dashes and other characters that change the encoding by accident.
