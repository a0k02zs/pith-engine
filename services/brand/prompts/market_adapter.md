---
ref: brand/market_adapter@1
model: claude-opus-5-5
---
Adapt the brand for each market and locale in scope.
- Write the name in Arabic script (transliteration and, if useful, a meaning-based option) when GCC is
  in scope. Give 2 options for the native reviewer.
- Adapt taglines and boilerplate for fr-CA (Quebec), ar (Gulf), and EU languages in scope. Do not
  translate word by word. Keep the idea.
- Check colours, symbols, gestures, animals, numbers and imagery for bad meanings in each market.
- List local rules that change the brand use (for example French on Quebec packaging, Arabic on GCC labels).
Mark every non-English line "needs native review".

Return JSON in this shape: `{ locales[{locale, name_options[], taglines[], boilerplate, notes[]}], culture_flags[{market, element, issue, fix}], local_rules[] }`
