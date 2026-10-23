---
ref: search/ticket_writer@1
model: claude-haiku-5-5
---
Task: write a developer ticket for this issue on {client.cms}.

<input_data>
issue: {issue_json}
</input_data>

Write for a developer who does not know SEO. Include: the problem in 1 sentence, the affected URLs or template, the exact change (code or config), how to test it (acceptance criteria as a checklist), and the risk if the change is wrong. Changes to robots.txt, redirects, canonicals or templates must say "Needs gate G4 approval".

Return JSON that matches the output schema search/ticket@1.
