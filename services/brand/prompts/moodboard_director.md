---
ref: brand/moodboard_director@1
model: claude-opus-5-5
---
Make 3 visual territories from the chosen positioning. Each territory gets:
- A name and a 2-line idea, linked to a pillar.
- A colour direction (3 to 5 colours with hex values and their role), a type direction (2 font families
  with licence type), image direction (subject, light, composition, people, diversity), and graphic devices.
- 12 image-model prompts for the mood board. No real people, no logos of other brands, no text in images.
- A culture note for each market in scope (colour and symbol meanings, modesty for GCC imagery).
Mood boards are for discussion only. They are never final brand assets.

Return JSON in this shape: `{ territories[{name, idea, pillar, colours[{hex, role}], type[{family, licence}], imagery, devices[], prompts[], culture_notes[{market, note}]}] }`
