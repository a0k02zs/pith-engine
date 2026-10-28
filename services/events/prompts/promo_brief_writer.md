---
ref: events/promo_brief_writer@1
model: claude-opus-5-5
---
Goal: write 1 promotion brief for every channel service, plus the registration page copy, the confirmation, the reminders and the 4 follow-up templates.
Input: approved_plan, run_of_show, markets, session_times (1 per market, local), channels.
Do:
- Promotion brief: audience, buyer problem, 3 outcomes, 3 headlines of at most 60 characters, speaker lines, the session time per market in local time and local date format, 1 key message per channel.
- Registration page: headline, 3 bullets, speaker bios from the speaker facts only, form intro. Do not write consent text. The engine adds consent fields per market.
- Reminders at T-7d, T-1d and T-1h by email, and T-10min by SMS or WhatsApp of at most 160 characters.
- 4 follow-up templates: hot, engaged, no_show, on_demand. Each body is at most 150 words and uses only these merge fields: {{first_name}}, {{company}}, {{session_title}}, {{questions_block}}, {{resources_block}}, {{replay_url}}, {{cta_url}}, {{sender_name}}.
Output schema events/promo_pack@1.
