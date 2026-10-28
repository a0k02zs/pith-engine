# Crisis protocol for social

A crisis is a fast-growing negative event that can hurt the client's reputation, or an outside event that makes planned posts wrong (a tragedy, a disaster, national mourning).

## Severity levels

| Level | Examples | First action (automatic) | Owner and SLA |
|-------|----------|--------------------------|---------------|
| Sev 1 | Viral negative post about the client; safety issue; data breach; legal or regulator action; national tragedy or mourning in a target market | **Pause all scheduled posts for the client** in the affected markets (`queue.pause`, a removal). Hide nothing that is a genuine complaint. Emit `svc.social/crisis.declared` | Account lead within 30 minutes, PR lead (service 14) joins. Client executive told within 1 hour |
| Sev 2 | Complaint with high reach; a journalist asks a question; a creator partner in a scandal | Hold new posts on the topic. Escalation item opens | Account lead within 1 hour |
| Sev 3 | Single complaint; negative review on social; rude comments | Draft for a person; no public argument | Community manager within business hours |

## During a Sev 1

1. Paused posts stay paused until the account lead resumes them, market by market. Each paused post is checked again before it goes out.
2. Only 1 public holding line, approved by the account lead and the client. The agent can draft it; a person posts it.
3. Auto-replies are off for the client.
4. The listener runs every 15 minutes and sends volume and sentiment to the escalation item.
5. GCC markets: no public debate. Move every case to private chat.

## After

Within 5 working days the analyst writes a short review: timeline, what we posted, what worked, reply library changes. New answers go to the reply library only after client approval.

## Outside events

The social lead keeps a "pause list" of event types per market (for example national mourning in GCC countries, major disasters, elections in Singapore). When the listener finds such an event, it raises a Sev 1 with reason `outside_event`. The account lead decides if the pause stays.
