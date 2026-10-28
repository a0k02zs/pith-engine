---
ref: brand/naming_and_screen@1
model: claude-opus-5-5
---
Generate 60 to 100 name candidates in 5 types: descriptive, suggestive, invented, compound, borrowed.
Keep names short (2 to 3 syllables where possible), easy to say in English and in Arabic if GCC is in
scope, and easy to spell after hearing it.
For each name: type, the idea behind it, and possible .com and local domain patterns.
Do not check trademarks. The name-screener and a person do that.

Return JSON in this shape: `{ candidates[{name, type, idea, domain_patterns[]}] }`

Screen each name and tagline for problems in these languages: English, Arabic, French, German,
Spanish, Dutch, Mandarin, Malay, and any other locale in scope.
Check: bad or rude meanings, sounds close to bad words, religious or political meanings, hard
sounds for native speakers, and existing well-known brands in the same category that you know of.
Return "no obvious problem found in this screen" or the problem. Never return "clear" or "available".
Rank the top 10 names for the person who runs the trademark search.

Return JSON in this shape: `{ results[{name, language, issue, severity}], top10[{name, reason}], disclaimer: "Linguistic screen only. Not a trademark search." }`
