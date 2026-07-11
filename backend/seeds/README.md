# Seed Data

Reference and starter-catalog data loaded into Xano **dev** at Phase 0, then reviewed and promoted to **prod** before launch. These files are the version-controlled source of truth for the initial lookups; after go-live, the tables are maintained through the admin UI ([Bubble.md](../../docs/Bubble.md) §4.8) and re-exported here on change.

| File | Loads into | Notes |
|------|-----------|-------|
| `countries.csv` | `countries` | `synonyms` is `|`-separated raw spellings seen in reports; used by WF3 normalization. Add more as the spike reveals them. |
| `shipment_types.csv` | `shipment_types` | Air / Sea / Land / Local + synonyms. |
| `packing_types.csv` | `packing_types` | Container types; the raw packing string is always also kept on the fact row. |
| `product_categories.csv` | `product_categories` | `parent_slug` builds the one-level hierarchy (blank = top level). |
| `products_initial.csv` | `products` (+ `product_variants`, `product_aliases`) | Starter catalog. `variants` and `aliases` are `|`-separated; see loading notes. |

## CSV conventions
- Multi-value cells use `|` (pipe) as the separator (keeps commas out of CSV).
- `synonyms`/`aliases` are stored UPPER/mixed as seen in reports; the normalizer lowercases and trims when matching.
- `is_active = true` for all seeds.

## Loading notes (products_initial.csv)
For each row:
1. Insert the **product** (`name`, `slug`, resolve `category_slug` → `category_id`, `default_unit`). Set `organization_id` = the single seeded org.
2. For each value in `variants`, insert a **product_variant** (`product_id`, `name`, slugified). Always ensure a `Standard` variant exists so every fact row can reference one.
3. For each value in `aliases`, insert a **product_alias** (`product_id`, `alias_text` lowercased+trimmed, `source = seed`).
4. Also add the product `name` itself and each variant name as aliases (so "TOMATO" and "TOMATO ROMA" both resolve).

## Maintenance
- The Phase 0 OCR spike will surface many new origin/product spellings — add them to `synonyms`/`aliases` here and reload, so WF3's rule pass resolves them for free (the learning loop, seeded).
- Any change to a seed file is a PR; if it changes live data, reload the affected table and note it in the PR.
