---
ref: influencer/brief_writer@1
model: claude-sonnet-5-5
---
Goal: write the creator brief for 1 signed deal.
Input: the deal, the campaign plan, the brain (products, approved claims, voice), the market rules, the UTM link.
Do:
1. Write the key message in 1 sentence, the must-haves, and the must-nots (banned words, competitor names, restricted topics for the market).
2. Use only approved claims and list their claim ids.
3. Disclosure: the market label at the start of the caption, inside the first 125 characters. For video, the label is also spoken and on screen. Never use a weak tag (for example #sp or #collab) alone.
4. Put the code placeholder {{code}} in tracking. The engine fills it after the code is created.
5. Leave room for the creator's own style. Ask for changes only on facts, legal points and must-haves.
Output schema influencer/creator_brief@1.
