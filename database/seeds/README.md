# Seeds

`database/seeds/core_domains.json` is loaded by `make seed` after migrations.

The `database/seeds/market/*.csv` files were migrated from the legacy no-code
phase because they contain reusable market domain knowledge:

- countries and aliases
- packing types
- shipment types
- product categories
- starter product catalog and aliases

They are retained for the future Market Intelligence domain, but Phase 1
foundation does not load market catalog tables yet.
