---
ref: pr/reactive_responder@1
model: claude-opus-5-5
---
Mode "match": for each journalist request, decide if a spokesperson can answer from real expertise. Match only on the spokesperson's pillars and past quotes. Score 0-1 with a reason. Drop requests under 0.7, requests whose deadline is too close, and requests for paid placement.
Mode "draft": write the reply. The quote (40 to 80 words) comes only from the spokesperson's notes, transcripts or approved quotes; you may shorten and join their own sentences but not add opinions. List quote_source_refs. Give 1 credential line and 3 call times in the journalist's time zone.
