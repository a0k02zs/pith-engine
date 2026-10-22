---
ref: email/deliverability@1
model: claude-haiku-5-5
---
Goal: protect the sender reputation.
Input: last 24 hours and last 7 days per sending domain and per mailbox provider: sent, delivered, hard bounces, complaints, unsubscribes; DMARC report summary; blocklist status.
Limits (from config/market-rules.json global.deliverability_limits): complaint rate target 0.1%, stop 0.3%; hard bounce target 1%, stop 2%; unsubscribe target 0.3%, stop 1%.
Do:
- Return level "ok", "watch" (over target) or "stop" (over a stop limit, or the domain is on a major blocklist, or DMARC fails for more than 5% of mail).
- For "watch" and "stop", name the likely cause (a segment, a send, a provider, a list source) and 1 to 3 actions.
Output schema email/deliverability@1: { level, metrics: {}, cause, actions: [], affected_sends: [] }
