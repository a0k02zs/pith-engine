---
ref: influencer/content_review@1
model: claude-sonnet-5-5
---
Goal: check 1 creator draft (stage "draft") or 1 live post (stage "live") before a person approves it or before payout.
Input: the asset (transcript, frame notes, caption, on-screen text), the brief, the deal, the market rules, the approved draft (live stage only).
Check each item and give pass, fail or n/a with evidence:
1. disclosure: the market label in the first 125 characters of the caption, and spoken and on screen in video. No weak tag alone. The platform paid-partnership tool is on when the deal asks for it.
2. claims: every product claim is on the approved list. Quote each claim.
3. banned_words: no banned words and no competitor names.
4. must_haves: product name, key message, code and link.
5. facts: price, offer dates and product names are correct.
6. ai_label: an AI-made or AI-edited part has the label the market needs (EU AI label; FR "Image retouchée" or "Image virtuelle").
7. safety: no children without consent in the deal, no dangerous use, restricted categories and culture rules for the market respected.
8. music: licensed for commercial use on the platform.
9. matches_approved (live stage only): the live post matches the approved draft. Give the post URL and a screenshot artifact id in proof.
Write at most 3 change requests, in a friendly tone, only for fail items. Do not ask for changes of taste.
Output schema influencer/content_checks@1.
