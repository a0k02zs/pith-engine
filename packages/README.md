# Pith M packages

Sellable packages for each target market and industry: 5 regions (UK, SG, NA, GCC, EU, in launch order) x 8 industries (3 B2B, 5 B2C) x 3 tiers (Launch, Growth, Scale) = 120 packages.

- `build-catalog.mjs` is the source of truth: service price list, industry service mixes, regional add-ons, priority and FX assumptions.
- `catalog.json` and `MATRIX.md` are generated. Do not edit them by hand. Run `node packages/build-catalog.mjs` after a change.
- The Command Centre reads `catalog.json` at build time (`apps/command-centre/scripts/build-catalog.mjs`) and shows it on the Packages page.

Prices are **indicative**. The head of growth sets final prices. FX rates are planning assumptions. Market and industry rules are planning summaries from each service's market rules file, not legal advice.
