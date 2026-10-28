# Push notification templates

Draft 1, 21 Oct 2026.

## Limits

- Title: max 40 characters. Body: max 120 characters. Longer text is cut on the lock screen.
- 1 deep link per notification. It opens the exact screen, not the home screen.
- iOS: the app must ask for permission. Android 13 and later: the app must ask for the `POST_NOTIFICATIONS` permission.
- Apple App Review Guideline 4.5.4: do not send promotions or direct marketing by push unless the user opted in through consent wording in the app, and the app gives a way to opt out. Pith applies the same rule on Android.

## In-app consent screen (ask before the OS prompt)

Show this screen first. Ask for the OS permission only when the user taps "Turn on". This keeps the OS prompt for users who want it, so more users say yes.

> **Title:** Get updates that matter
> **Body:** We will tell you when your order moves, when saved items drop in price, and about offers you can switch off at any time.
> **Toggle 1 (on by default):** Order and account updates
> **Toggle 2 (off by default in UK and EU, user choice elsewhere):** Offers and news
> **Buttons:** Turn on / Not now

Store the result of toggle 2 as the marketing consent for channel `push`.

## Templates

| ID | Flow | Category | Title | Body | Deep link |
|---|---|---|---|---|---|
| P-ORDER-SHIP | F04 | Utility | Your order is on its way | Order {{order_id}} ships today. Tap to track it. | `app://orders/{{order_id}}` |
| P-BROWSE | F03 | Marketing | Still thinking about it? | {{product}} is waiting for you. | `app://product/{{sku}}` |
| P-PRICE-DROP | F09 | Marketing | Price drop on a saved item | {{product}} is now {{price}}. | `app://product/{{sku}}` |
| P-BACK-STOCK | F09 | Marketing | Back in stock | {{product}} is back. Sizes go fast. | `app://product/{{sku}}` |
| P-CART | F02 | Marketing | Your cart is saved | {{item_count}} items are waiting. Check out in 1 tap. | `app://cart` |
| P-STREAK | Engagement | Marketing | Keep your streak going | You are on day {{n}}. 2 minutes keeps it alive. | `app://home` |
| P-TRIAL-D3 | B2B trial | Marketing | Set up {{feature}} in 2 minutes | Teams that do this on day 3 get value 2x faster. | `app://setup/{{feature}}` |
| P-RENEW | F12 | Utility | Your plan renews soon | {{plan}} renews on {{date}}. Review it here. | `app://billing` |

The claim in P-TRIAL-D3 ("2x faster") is an example. Use it only if the client brain holds this claim as approved and true.

## Web push

- Ask only after a clear action (for example, "Notify me when back in stock"). Never on page load.
- iOS Safari supports web push only for sites added to the home screen. Do not plan core flows on web push.
