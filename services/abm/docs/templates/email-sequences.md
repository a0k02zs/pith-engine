# Email sequences

Each step has 2 subject options. Placeholders in `{{ }}`. Tier 1 uses these as a starting point and the personalizer rewrites each step for 1 person. Tier 3 uses only the dynamic fields listed in the personalizer prompt.

Required in every email (the compliance gate checks): sender identity, opt-out. US and Canada: postal address. EU: Article 14 notice link. Singapore Tier 3: "<ADV>" at the start of the subject.

## Sequence S1 · Insight-led (play P3), 4 steps over 3 weeks

**Step 1 (day 0) — the insight**
Subject: "{{account_priority_short}}" / "A question on {{topic}}"
> Hi {{first_name}},
> {{hook_with_source}}. Teams in {{industry}} that work on this often find {{problem}}.
> We wrote a short note on how {{peer_type}} handled it: {{asset_link}}.
> Is {{topic}} on your list for {{period}}?
> {{sender_name}}, {{sender_title}}

**Step 2 (day 4) — proof**
Subject: "How {{approved_reference}} did it" / "{{result_metric}} in {{timeframe}}"
> {{first_name}}, 1 example: {{approved_reference}} {{approved_result}} ({{claim_id}}).
> The main change was {{how}}. Worth 20 minutes to see if it fits {{account_name}}?

**Step 3 (day 9) — role angle**
Subject by role: economic buyer "Cost of waiting on {{topic}}"; technical "{{integration}} and {{product}}"; champion "A 1-page brief for your team".
> 2 or 3 lines on what this role cares about (from the committee map). 1 ask.

**Step 4 (day 16) — close the loop**
Subject: "Should I close this?" / "Last note on {{topic}}"
> {{first_name}}, I do not want to fill your inbox. If {{topic}} is not a priority now, I will stop here. If it is, here is my calendar: {{meeting_link}}.

## Sequence S2 · Executive open (play P2), 2 steps

**Step 1** — from the client executive to the economic buyer. 80 words or less. Peer to peer tone. Reference 1 public priority of the account. Ask for a short call with the executive, not a demo.
**Step 2 (day 7)** — follow-up that mentions the direct mail item (if sent) or a relevant event.

## Sequence S3 · Surge response (play P5), 2 steps within 2 days

**Step 1** — content that matches the top intent topic. No mention that we track their research.
**Step 2** — offer a short, specific session (for example "a 20-minute review of your {{topic}} set-up").

## Sequence S4 · Event (play P4), 3 steps

Invite (3 to 6 weeks before) → meeting request at the event (1 to 2 weeks before) → follow-up within 24 hours after, with a summary of what was discussed.

## Market changes
- GCC: put S4 before S2. Use formal greetings ("Dear Mr {{last_name}}" for first touch to senior government-linked buyers). Arabic version for government-linked buyers. No sends on the local weekend.
- EU (DE, FR): formal address in the local language. Add the Article 14 line: "We found your business contact details on {{source}}. Here is how we use them: {{notice_link}}."
- Canada (QC): French version. Only contacts with CASL express or implied consent.
- Singapore: proof from Asia-Pacific peers.
