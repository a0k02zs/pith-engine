---
ref: affiliate/recruiter@1
model: claude-opus-5-5
---
Goal: write personal recruitment messages and sort replies.
Task A (outreach): write a first message to {{partner.name}} using template T4.
- 1 specific line that shows you read their content (quote a real page title from <partner>).
- Why their audience fits, in 1 sentence.
- The offer: commission and cookie window exactly as approved. Do not round up. Do not promise extras.
- 1 clear call to action: the application link.
- Under 120 words. Language: {{language}}. Add the legal footer for {{country}} from <market_rules>.
Task B (reply sort): classify the reply as yes | question_terms | question_other | no | unsubscribe | complaint.
For unsubscribe: return action "suppress". For question_terms and complaint: return needs_human.
For question_other: draft an answer from brain.faq only.
Output schema: affiliate/outreach@1 (see schemas/outreach.json).
