# Company Brain — Database Design (Xano)

| | |
|---|---|
| **Document** | Database.md |
| **Version** | 2.0 |
| **Date** | 2026-07-06 |
| **Status** | Draft — pending approval |
| **Platform** | Xano (managed PostgreSQL). Tables here map 1:1 to Xano tables; JSON exports live in `/backend/schema`. |
| **Related** | [Architecture.md](Architecture.md) · [Workflow.md](Workflow.md) · [API.md](API.md) |

---

## 1. Conventions (apply to every table)

| Rule | Detail |
|------|--------|
| Naming | `snake_case`, plural tables, `_id` FK suffix |
| Primary key | `id` (Xano auto-increment) — shown as `PK` |
| **Tenancy** | **`organization_id` on every business table** (FK → organizations). Phase 1 = one seeded org; queries still filter by it (NFR-6) |
| Timestamps | `created_at` everywhere; `updated_at` on mutable tables (UTC epoch) |
| Soft delete | Mutable entities use `deleted_at`; **fact/history tables are append-only, never deleted** |
| Money | `decimal(10,2)`, explicit `currency` column (`AED` now; multi-currency later) |
| Enums | Short lowercase strings, validated in Xano input rules |
| **Future-proof fields** | Every table carries a `meta` JSON column for additive, schema-free extension without migrations; reference tables carry `synonyms` JSON; catalog carries `search_text` |
| Indexes | Declared per table; every FK used in a filter is indexed |
| Audit | Corrections to published data create revision rows + `audit_logs` entries — never silent in-place edits |

### Table inventory (20 tables)
Core: `organizations`, `users` · Reference: `countries`, `shipment_types`, `packing_types`, `product_categories` · Catalog: `products`, `product_variants`, `product_aliases` · Ingestion: `uploads`, `upload_rows` (staging), `ocr_logs`, `extraction_templates` · Facts & intelligence: `daily_prices` (fact), `price_history_daily` (historical/aggregate), `product_latest_price` (cache), `market_summaries` (intelligence engine) · AI & comms: `chat_sessions`, `chat_messages`, `notifications` · Platform: `audit_logs`, `ai_usage_log`. *(`alert_rules` reserved for Phase 5.)*

---

## 2. Core

### 2.1 `organizations` — tenancy root
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| name | text | |
| slug | text, unique | |
| status | enum | `active` \| `suspended` |
| plan | enum | `internal` \| `starter` \| `pro` (SaaS) |
| settings | json | anomaly_threshold_pct, auto_publish, missing_product_window_days, retention_months, default_market |
| meta | json | future-proof |
| created_at / updated_at | ts | |

### 2.2 `users`
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id | FK | **idx** |
| email | text, unique | Xano auth identity |
| password | internal | Xano-managed, never exposed |
| name | text | |
| role | enum | `admin` \| `analyst` \| `viewer` \| `service` |
| status | enum | `invited` \| `active` \| `deactivated` |
| last_login_at | ts, null | |
| avatar_url | text, null | |
| notification_prefs | json | per-event in-app/email toggles |
| meta | json | |
| created_at / updated_at / deleted_at | ts | |

**Idx**: `email` (unique), `organization_id`.

---

## 3. Reference (admin-managed lookups; `organization_id` null = global default, or org-specific)

### 3.1 `countries`
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| name | text | canonical, e.g. `India` |
| iso_code | text(2), unique | `IN`, `PK`, `AE` |
| region | enum | `gcc`·`south_asia`·`africa`·`europe`·`americas`·`east_asia`·`oceania` |
| flag_emoji | text | UI chips |
| synonyms | json[] | raw spellings: `["INDIA","Ind.","الهند"]` — normalization input |
| is_active | bool | |
| meta / created_at | | |

### 3.2 `shipment_types`
`id, name (Air/Sea/Land/Local), code (unique), synonyms[], is_active, meta`.

### 3.3 `packing_types`
`id, name (Box/Carton/Bag/Bunch/Tray/Loose…), code (unique), synonyms[], is_active, meta`. The **raw** packing string is always also kept on the fact row.

### 3.4 `product_categories`
`id, organization_id, name, slug (unique), parent_id (FK self, nullable — one-level hierarchy), sort_order, meta`.

---

## 4. Canonical Product System

Separation of **Product / Variant / Country / Packing / Weight / Alias** (FR-3.1) makes search intelligent. Product and Variant are catalog; Country/Packing are reference; Weight is a parsed attribute on each observation; Alias is the learned raw→canonical memory.

### 4.1 `products` — canonical product
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id | FK | idx |
| name | text | canonical, e.g. `Tomato`, `Onion` |
| slug | text | unique per org |
| category_id | FK → product_categories | idx |
| default_unit | enum | `kg`·`box`·`carton`·`bunch`·`piece` |
| image_url | text, null | |
| is_active | bool | inactive hidden from pickers, history kept |
| search_text | text | lowercased name+variants+aliases for fast search |
| meta | json | |
| created_at / updated_at / deleted_at | ts | |

**Idx**: (`organization_id`,`slug`) unique, `category_id`, `search_text`.

### 4.2 `product_variants` — variety of a product
Separates `Onion → Red / White`, `Tomato → Roma / Cherry`, `Grapes → Red Globe`.
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id | FK | |
| product_id | FK → products | **idx** |
| name | text | `Red`, `Roma`, `Nagpur` |
| slug | text | unique per product |
| grade | text, null | `A`/`Premium` if reports grade |
| is_active | bool | |
| meta | json | |
| created_at / updated_at | ts | |

**Idx**: (`product_id`,`slug`) unique. A product always has at least a default variant (`Standard`) so every fact row references a variant.

### 4.3 `product_aliases` — learned normalization memory
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id | FK | |
| product_id | FK → products | idx |
| variant_id | FK → product_variants, null | alias may pin a variant too |
| alias_text | text | exact raw string, lowercased/trimmed |
| source | enum | `seed`·`admin`·`ai_confirmed` |
| confidence | decimal, null | LLM confidence at suggestion |
| created_by | FK → users, null | |
| meta / created_at | | |

**Idx**: (`organization_id`,`alias_text`) unique — one alias → one product/variant. The rule pass hits this table before any LLM call (Architecture §7.1).

---

## 5. Ingestion

### 5.1 `uploads` — Upload History (audit spine)
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id | FK | idx |
| market | text | `dubai_fnv` (config-driven) |
| report_date | date | date the report *covers* — **idx** |
| file_name / file_type | text / enum | enum `pdf`·`image`·`xlsx`·`xls` |
| file_size_bytes | int | |
| xano_file_url | text | working copy |
| drive_file_id / drive_url | text, null | archive |
| extraction_template_id | FK → extraction_templates, null | |
| status | enum | `uploaded`·`queued`·`ocr`·`cleaning`·`validation`·`review_pending`·`publishing`·`published`·`partially_published`·`failed`·`cancelled`·`replaced` |
| status_timeline | json | `[{status,at,actor}]` — stamped every transition |
| rows_extracted / rows_ok / rows_warning / rows_error | int | staging triage |
| rows_published / rows_rejected | int | outcome |
| error_log | json, null | `[{stage,code,message,at}]` |
| uploaded_by / published_by | FK → users | |
| published_at | ts, null | |
| replaced_by_upload_id | FK → uploads, null | set on old upload when a day is re-published |
| meta / created_at / updated_at | | |

**Idx**: (`organization_id`,`market`,`report_date`), `status`, `uploaded_by`.
**Rule (Xano logic):** ≤ 1 upload with status `published` per (`organization_id`,`market`,`report_date`).

### 5.2 `upload_rows` — STAGING (AI output before it is trusted, FR-2.2)
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id / upload_id | FK | upload_id **idx** |
| row_index | int | position in source |
| row_hash | text | idempotency key with upload_id |
| raw | json | untouched extraction incl. per-field OCR confidence |
| product_id / variant_id | FK, null | resolved canonical (null = unresolved) |
| suggested_product_name | text, null | LLM `NEW` suggestion |
| country_id / shipment_type_id / packing_type_id | FK, null | resolved reference |
| packing_raw | text | original packing string, always kept |
| unit | enum | `kg`·`box`·`carton`·`bunch`·`piece` |
| unit_weight_kg | decimal, null | parsed weight per unit |
| price_raw | text | **original imported value, preserved exactly** (e.g. `12.00`, `NA`, `-`) |
| price | decimal(10,2), **null** | parsed numeric price; **null when the report shows NA/blank** |
| price_min / price_max | decimal, null | if report gives a range |
| currency | text | `AED` |
| price_per_kg | decimal, null | derived — comparison backbone |
| is_available | bool | **derived, not a report field**: `true` when `price` is not null, else `false` |
| validation_status | enum | `ok`·`warning`·`error` |
| validation_flags | json[] | `["price_spike_45pct","unknown_product","low_ocr_confidence","missing_field"]` |
| resolution | enum | `pending`·`approved`·`edited`·`rejected` |
| resolved_by | FK → users, null | |
| rejection_reason | text, null | |
| published_price_id | FK → daily_prices, null | set at publish (two-way provenance) |
| meta / created_at / updated_at | | |

**Idx**: (`upload_id`,`row_index`) unique, (`upload_id`,`row_hash`) unique, `validation_status`.

### 5.3 `ocr_logs` — every OCR run (FR-2.6)
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id / upload_id | FK | upload_id idx |
| processor | text | Document AI processor id / version (or `excel_parser`) |
| page_count | int | |
| rows_detected | int | |
| avg_confidence / min_confidence | decimal | |
| raw_output_ref | text | pointer to stored raw JSON (Drive/Xano) |
| duration_ms | int | |
| cost_estimate_usd | decimal(10,4) | |
| status | enum | `ok`·`partial`·`error` |
| error | json, null | |
| meta / created_at | | |

### 5.4 `extraction_templates` — versioned parsing config (Risk R7)
`id, organization_id(null=global), market, version, file_type, config(json: column map, header signatures, processor id, confidence threshold), valid_from(date), is_active, meta, created_at`.

---

## 6. Facts, History & Intelligence

### 6.1 `daily_prices` — the fact table (Daily Prices)
**Append-only.** One row per published observation (product+variant+country+shipment+packing) per report date. The 10M-row table (NFR-1); reads go through the aggregate/cache/summary tables below.
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id / market | | in every index |
| report_date | date | idx |
| product_id / variant_id | FK | idx |
| country_id / shipment_type_id / packing_type_id | FK | |
| packing_raw | text | |
| unit / unit_weight_kg | enum / decimal | |
| price_raw | text | **original imported value, preserved exactly** (e.g. `12.00`, `NA`) |
| price | decimal(10,2), **null** | parsed numeric; **null when report shows NA/blank** |
| price_min / price_max | decimal, null | |
| currency | text | `AED` |
| price_per_kg | decimal, null | |
| is_available | bool | **derived** at publish: `true` when `price` is not null (idx for availability filters) |
| upload_id / upload_row_id / ocr_log_id | FK | provenance (FR-4.2) |
| revision_of_id | FK → daily_prices, null | set when correcting an earlier row |
| is_current | bool | `false` on superseded revisions; queries filter `true` |
| revised_by / revised_reason | FK / text, null | correction audit |
| meta / created_at | | |

**Idx**: (`org`,`product_id`,`report_date`) · (`org`,`report_date`) · (`org`,`product_id`,`country_id`,`report_date`) · `upload_id`.
**Correction model (append-only, FR-4.1):** insert a new row with `revision_of_id` → old row; flip old row's `is_current=false` (the single permitted update); log to `audit_logs`. History is never destroyed.

### 6.2 `price_history_daily` — Historical Prices (aggregate)
Pre-computed rollup, upserted in the publish transaction, rebuildable from `daily_prices` (WF6 nightly). **All trend/history queries read only this table.**
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id / market | | |
| product_id | FK | |
| variant_id | FK, null | null = product-level rollup |
| country_id | FK, null | **null = all-origins rollup** (plus one row per origin) |
| report_date | date | |
| price_min / price_avg / price_max | decimal | across matching fact rows |
| price_per_kg_avg | decimal, null | |
| observation_count | int | |
| pct_change_vs_prev | decimal, null | drives gainers/losers |
| meta / updated_at | | |

**Idx**: (`org`,`product_id`,`variant_id`,`country_id`,`report_date`) unique; (`org`,`report_date`,`pct_change_vs_prev`).

### 6.3 `product_latest_price` — cache
One row per (product,variant,country,shipment) = most recent published observation; upserted at publish. Powers Product Explorer & most chat lookups in one indexed read.
`id, org, market, product_id, variant_id, country_id, shipment_type_id, report_date, price_raw, price(null=NA), price_per_kg, unit, packing_raw, is_available(derived), daily_price_id(FK), pct_change_vs_prev, meta, updated_at`.
**Idx**: (`org`,`product_id`,`variant_id`,`country_id`,`shipment_type_id`) unique.

### 6.4 `market_summaries` — Market Intelligence Engine output (Architecture §5)
One row per market + report date holding the **precomputed daily intelligence** that feeds dashboard *and* AI (single source, no duplicated logic).
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id / market | | |
| report_date | date | idx (unique with org+market) |
| products_count / origins_count / observations_count | int | |
| avg_price / avg_price_per_kg | decimal | overall |
| avg_change_pct | decimal | vs previous report date |
| most_expensive | json | `[{product,variant,country,price}]` top N |
| cheapest | json | top N |
| top_gainers / top_losers | json | `[{product,country,price,change_pct}]` |
| missing_products | json | present in trailing window, absent today |
| country_distribution | json | `[{country,count,avg_price}]` |
| shipment_distribution | json | `[{shipment,count,avg_price}]` |
| availability_distribution | json | **derived**: `[{status:"available",count},{status:"not_available",count}]` (from `is_available`) |
| category_overview | json | per-category avg + change |
| outliers | json | rows beyond anomaly threshold |
| narrative | text, null | AI-generated morning summary (WF8) |
| computed_by | enum | `publish`·`scheduled`·`rebuild` |
| meta / created_at / updated_at | | |

**Idx**: (`organization_id`,`market`,`report_date`) unique. Rebuildable from facts at any time; never a source of truth, always derivable.

---

## 7. AI & Communications

### 7.1 `chat_sessions`
`id, organization_id, user_id(idx), title, last_message_at, message_count, meta, created_at, deleted_at`.

### 7.2 `chat_messages` — AI Chat History
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id / session_id | FK | session_id idx |
| user_id | FK | author/scoping |
| role | enum | `user`·`assistant`·`system` |
| content | text | rendered message |
| tool_calls | json, null | `[{tool,arguments,result_row_count,duration_ms}]` — reproducibility & eval mining |
| chart_spec | json, null | inline chart returned to Bubble |
| sources | json, null | `[{report_date,upload_id}]` grounding citations |
| status | enum | `ok`·`clarify`·`refused`·`error` |
| latency_ms | int, null | |
| feedback | enum, null | `up`·`down` |
| meta / created_at | | |

**Idx**: `session_id`. Retention configurable (NFR): purge > `retention_months` via scheduled workflow.

### 7.3 `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| organization_id / user_id | FK | (user_id,is_read,created_at) idx |
| type | enum | `upload_published`·`upload_failed`·`review_pending`·`price_anomaly`·`daily_insight`·`price_alert`·`system` |
| title / body | text | |
| entity_type / entity_id | text / int, null | deep-link target |
| severity | enum | `info`·`warning`·`critical` |
| is_read | bool | |
| read_at | ts, null | |
| channel_status | json | `{in_app:"delivered",email:"queued"}` |
| meta / created_at | | |

---

## 8. Platform

### 8.1 `audit_logs`
`id, organization_id, actor_id(FK users, null=system), action(text: price.revise, product.merge, user.deactivate, upload.replace…), entity_type, entity_id, before(json), after(json), meta, created_at`.

### 8.2 `ai_usage_log` (cost/observability, NFR-10)
`id, organization_id, feature(enum: chat·normalization·ocr·insight), model, prompt_version, tokens_in, tokens_out, cost_usd_estimate, entity_type, entity_id, duration_ms, meta, created_at`.

### 8.3 `alert_rules` *(Phase 5 — reserved now)*
`id, organization_id, user_id, product_id, variant_id(null), country_id(null=any), condition(above·below·pct_change_above), threshold, is_active, last_triggered_at(debounce: max once per report date), meta, created_at`.

---

## 9. Relationships

```
organizations 1─* users
organizations 1─* products 1─* product_variants
                 products 1─* product_aliases (─* variant_id optional)
                 products *─1 product_categories (─ self parent)
countries / shipment_types / packing_types  → shared reference

uploads 1─* upload_rows ──(publish)──► daily_prices
uploads 1─* ocr_logs
uploads   *─1 extraction_templates
upload_rows.published_price_id ◄──► daily_prices   (two-way provenance)

daily_prices *─1 products / product_variants / countries / shipment_types / packing_types
daily_prices ── revision_of_id ── daily_prices           (append-only correction chain)
daily_prices ──(aggregated into)──► price_history_daily  (Historical Prices)
daily_prices ──(latest cached in)──► product_latest_price
daily_prices ──(summarized into)──► market_summaries     (Intelligence Engine)

users 1─* chat_sessions 1─* chat_messages
users 1─* notifications      ·      * ──► audit_logs / ai_usage_log (write-only sinks)
```

**Narrative**
- A **product** is canonical; **variants** are its varieties; **aliases** map every raw spelling (optionally to a variant). Ingestion resolves raw → alias → product/variant; unresolved rows block on human confirmation, which writes a new alias — the learning loop.
- An **upload** owns its **staging rows** and its **OCR logs**; publishing copies approved staging rows into **daily_prices** with two-way links, so any dashboard number traces to the exact source cell, and any source row shows where it landed.
- **daily_prices** is the only price source of truth (append-only). **price_history_daily** (history/trends), **product_latest_price** (explorer), and **market_summaries** (dashboard + AI) are all **derived, disposable, and rebuildable** — they exist so reads never scan the fact table (NFR-1/2) and so the dashboard and AI quote identical numbers.
- **Everything** hangs off **organizations** — the switch that turns this into SaaS by configuration.

---

## 10. Scale & Retention

| Table | ~1 yr (1 org) | 10 yr multi-tenant | Strategy |
|-------|--------------|--------------------|----------|
| daily_prices | ~110K | 10M+ | append-only, composite idx, read via derived tables |
| price_history_daily | ~220K | 20M | unique-key upserts; rebuildable |
| market_summaries | ~365 | small | one row/day/market; rebuildable |
| upload_rows | ~110K | archive > 12 mo to Drive JSON |
| ocr_logs | ~365 | keep (small); raw JSON on Drive |
| chat_messages | usage-based | purge > retention_months (config) |
| notifications | small | purge read > 6 mo |
| audit_logs | small-med | never purged |
| ai_usage_log | small-med | summarized monthly |

If Xano analytics slow past ~5M fact rows: nightly warehouse sync (Architecture §10.3) — **no schema or API change**, because reads already go through derived tables.
