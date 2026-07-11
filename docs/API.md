# Company Brain — API Contracts

| | |
|---|---|
| **Document** | API.md |
| **Version** | 1.1 |
| **Date** | 2026-07-06 |
| **Status** | Draft — pending approval |
| **Platform** | Xano REST API groups |
| **Related docs** | [Architecture.md](Architecture.md) · [Database.md](Database.md) · [Workflow.md](Workflow.md) · [Bubble.md](Bubble.md) · [AI.md](AI.md) |

> **Data-model alignment (v1.1):** the canonical product system separates **product + variant**. **Availability is derived, not stored as a report field**: each observation keeps `price_raw` (original imported value, exactly as printed, incl. `NA`), a nullable numeric `price` (null when `NA`/blank), and a derived `is_available` boolean. Where an example below shows a product, a `variant` object may also appear; `list_products` / `GET /prices/latest` accept an `availability` filter (backed by `is_available`); `/analytics/summary` includes `missing_products` and an `availability_distribution` (available vs not-available). **Chat orchestration runs in Xano in Phase 1** (n8n WF7 is future-only). **Publish is write-facts-then-recompute** (two idempotent steps), not one atomic multi-table transaction. All additive and non-breaking per §11.

Contracts only — no implementation. These are the stable seams of the platform: Bubble, n8n, and any future frontend depend on nothing but what is written here.

---

## 1. Global Conventions

### 1.1 Base structure

Xano API groups map to URL prefixes:

| Group | Prefix | Consumers | Auth |
|-------|--------|-----------|------|
| Auth | `/api/auth` | Bubble | Public (login) / JWT |
| Uploads | `/api/uploads` | Bubble | JWT (admin) |
| Ingestion (internal) | `/api/ingest` | n8n only | Service token + HMAC |
| Products & Reference | `/api/catalog` | Bubble, n8n | JWT / service |
| Prices & Analytics | `/api/prices`, `/api/analytics` | Bubble | JWT |
| Chat | `/api/chat` | Bubble | JWT |
| Notifications | `/api/notifications` | Bubble | JWT |
| Admin | `/api/admin` | Bubble (admin) | JWT (admin) |

### 1.2 Authentication & authorization

- `Authorization: Bearer <jwt>` on every endpoint except `POST /api/auth/login` and password-reset initiation.
- JWT carries `user_id`; Xano resolves `organization_id` and `role` server-side on every request — never trusted from the client.
- Role matrix per endpoint is stated in each section. `service` role is restricted to `/api/ingest` and read-only catalog.
- n8n calls additionally send `X-CB-Service-Key` (shared secret) — defense in depth.
- Xano→n8n webhooks are signed: `X-CB-Signature: hmac_sha256(body, secret)`.

### 1.3 Standard response envelope

```json
// success
{ "data": …, "meta": { "page": 1, "per_page": 50, "total": 1234 } }

// error
{ "error": { "code": "DUPLICATE_REPORT_DATE", "message": "A published report already exists for 2026-07-06.", "details": {…} } }
```

HTTP codes: `200` OK · `201` created · `400` validation · `401` unauthenticated · `403` role denied · `404` not found or cross-org access (indistinguishable by design) · `409` conflict · `422` semantic error · `429` rate-limited · `500` internal.

### 1.4 Pagination, filtering, sorting

All list endpoints: `?page=1&per_page=50` (max 200), `?sort=field&order=asc|desc`. Filters are explicit query params per endpoint. **No endpoint returns an unbounded list** (NFR-1).

### 1.5 Dates & money

Dates: `YYYY-MM-DD` (report dates), ISO-8601 UTC (timestamps). Money: decimal string with `currency` field, e.g. `{"price": "4.50", "currency": "AED"}`.

---

## 2. Auth API — `/api/auth`

| Method & path | Role | Purpose |
|---|---|---|
| `POST /login` | public | Email+password → JWT |
| `POST /logout` | any | Invalidate token |
| `GET /me` | any | Current user profile + role + org |
| `PATCH /me` | any | Update own name, avatar, notification_prefs |
| `POST /password/forgot` | public | Send reset magic link |
| `POST /password/reset` | public (token) | Set new password |

**`POST /login`**
```json
// request
{ "email": "ayesha@company.com", "password": "…" }
// 200
{ "data": { "token": "…", "expires_in": 86400,
  "user": { "id": 1, "name": "Ayesha", "role": "admin", "organization": { "id": 1, "name": "Default Org" } } } }
// 401 { "error": { "code": "INVALID_CREDENTIALS" } }
```

---

## 3. Uploads API — `/api/uploads` (Bubble, admin)

| Method & path | Role | Purpose |
|---|---|---|
| `POST /` | admin | Upload report file, create upload record, trigger pipeline |
| `GET /` | admin, analyst | Upload history (paginated; filters: `status`, `report_date_from/to`, `uploaded_by`) |
| `GET /{id}` | admin, analyst | Full upload detail incl. status_timeline, counts, error_log |
| `GET /{id}/rows` | admin | Staging rows (filters: `validation_status`, `resolution`; paginated) |
| `PATCH /{id}/rows/{row_id}` | admin | Edit/approve/reject a staging row |
| `POST /{id}/rows/bulk` | admin | Bulk action: `{"action":"approve","row_ids":[…]}` (approve/reject) |
| `POST /{id}/publish` | admin | Publish approved rows (write facts → recompute derived; idempotent) |
| `POST /{id}/retry` | admin | Re-trigger pipeline from failed stage |
| `POST /{id}/cancel` | admin | Cancel before publish |

**`POST /api/uploads`** — multipart: `file` (binary, ≤ 20 MB, pdf/xlsx/xls), `report_date`, `market` (default `dubai_fnv`), `replace_existing` (bool, default false).
```json
// 201
{ "data": { "id": 812, "status": "queued", "report_date": "2026-07-06", "file_name": "market-06-07.pdf" } }
// 409 when a published upload exists and replace_existing=false
{ "error": { "code": "DUPLICATE_REPORT_DATE", "details": { "existing_upload_id": 799 } } }
```

**`GET /api/uploads/{id}`**
```json
{ "data": { "id": 812, "status": "review_pending",
  "report_date": "2026-07-06", "file_name": "market-06-07.pdf", "file_type": "pdf",
  "drive_url": "https://drive.google.com/…",
  "rows_extracted": 287, "rows_ok": 270, "rows_warning": 14, "rows_error": 3,
  "rows_published": null, "uploaded_by": { "id": 1, "name": "Ayesha" },
  "status_timeline": [ { "status": "uploaded", "at": "2026-07-06T06:02:11Z" },
                       { "status": "extracting", "at": "2026-07-06T06:02:15Z" },
                       { "status": "review_pending", "at": "2026-07-06T06:05:40Z" } ],
  "error_log": [] } }
```

**`PATCH /api/uploads/{id}/rows/{row_id}`**
```json
// request — any editable subset; resolution drives the state machine
{ "product_id": 45, "country_id": 3, "price": "4.75", "resolution": "edited" }
// or confirm a new product suggestion:
{ "create_product": { "name": "Dragon Fruit", "category_id": 5 }, "resolution": "approved" }
// 200 → updated row; alias auto-written on product confirm
```

**`POST /api/uploads/{id}/publish`**
```json
// request
{ "confirm_row_count": 284 }   // optimistic-concurrency guard: must equal current approved count
// 200
{ "data": { "upload_id": 812, "status": "published", "rows_published": 284, "rows_rejected": 3,
            "aggregates_updated": true, "anomalies_detected": 2 } }
// 409 { "error": { "code": "ROW_COUNT_MISMATCH" } }  — rows changed since screen load
// 422 { "error": { "code": "UNRESOLVED_ROWS", "details": { "pending": 5 } } }
```

---

## 4. Ingestion API — `/api/ingest` (n8n service only)

Internal contract between the pipeline and the backend. Never called by Bubble.

| Method & path | Purpose |
|---|---|
| `POST /uploads/{id}/status` | Pipeline stage transition: `{"status":"extracting","error":null}` |
| `POST /uploads/{id}/rows` | Bulk insert staging rows (idempotent upsert on `row_hash`) |
| `POST /uploads/{id}/archive` | Record Drive archival: `{"drive_file_id","drive_url"}` |
| `GET /catalog/aliases?market=…` | Full alias + synonym dictionaries for the rule pass |
| `GET /prices/rolling-averages?report_date=…` | 7-day averages per product for anomaly detection |
| `POST /ai-usage` | Log an AI call (model, tokens, cost, entity) |

**`POST /api/ingest/uploads/{id}/rows`**
```json
// request (batched, ≤500 rows per call)
{ "rows": [ { "row_index": 1, "row_hash": "a1b2…",
    "raw": { "product": "TOMATO ROMA", "origin": "JORDAN", "shipment": "By Land",
             "weight": "5kg", "packing": "Box", "price": "12.00", "confidence": { "price": 0.97 } },
    "product_id": 45, "country_id": 12, "shipment_type_id": 3,
    "unit": "box", "unit_weight_kg": "5", "price": "12.00", "price_per_kg": "2.40",
    "validation_status": "ok", "validation_flags": [] } ] }
// 200 { "data": { "inserted": 480, "updated": 20 } }
```

**Webhook: Xano → n8n (pipeline trigger)** — `POST {n8n_webhook_url}/ingestion`
```json
{ "upload_id": 812, "organization_id": 1, "market": "dubai_fnv",
  "report_date": "2026-07-06", "file_url": "…", "file_type": "pdf",
  "extraction_template_id": 4 }
// header: X-CB-Signature
```

---

## 5. Catalog API — `/api/catalog`

| Method & path | Role | Purpose |
|---|---|---|
| `GET /products` | any | Search/list products (`?q=tom&category_id=&is_active=`; paginated) |
| `GET /products/{id}` | any | Product detail + aliases + latest price summary |
| `POST /products` | admin | Create product |
| `PATCH /products/{id}` | admin | Edit name/category/variety/image/active |
| `POST /products/{id}/merge` | admin | Merge duplicate: `{"merge_from_id": 87}` — moves aliases + repoints facts, audited |
| `GET /products/{id}/aliases` · `POST` · `DELETE /aliases/{alias_id}` | admin | Alias management |
| `GET /categories` | any | Category tree |
| `GET /countries` | any | Countries (`?region=&is_active=`) |
| `GET /shipment-types` / `GET /packing-types` | any | Reference lists |
| `POST/PATCH` on countries & types | admin | Manage reference data |

**`GET /api/catalog/products?q=onion`**
```json
{ "data": [ { "id": 12, "name": "Onion Red", "slug": "onion-red", "category": { "id": 1, "name": "Vegetables" },
              "variety": null, "default_unit": "kg", "image_url": null, "is_active": true,
              "latest": { "report_date": "2026-07-06", "price_min": "2.80", "price_max": "4.10", "origins": 4 } } ],
  "meta": { "page": 1, "per_page": 50, "total": 3 } }
```

---

## 6. Prices API — `/api/prices`

| Method & path | Role | Purpose |
|---|---|---|
| `GET /latest` | any | Product Explorer grid: latest price per product/origin/shipment. Filters: `q`, `category_id`, `country_id`, `shipment_type_id`, `price_min`, `price_max`, `report_date` (defaults latest). Sort: `price`, `pct_change`, `product_name`. Paginated |
| `GET /by-date` | any | Full published table for one `report_date` (paginated) |
| `GET /{daily_price_id}` | any | Single fact row + provenance (upload, source file link, revision chain) |
| `POST /{daily_price_id}/revise` | admin | Correction: `{"price":"4.20","reason":"OCR fixed"}` → new revision row, audited |
| `GET /export` | analyst, admin | Async CSV/XLSX export of any `/latest` or `/by-date` filter set → `{export_id}`; poll `GET /export/{id}` for file URL |

**`GET /api/prices/latest?country_id=5&sort=price&order=asc`**
```json
{ "data": [ { "product": { "id": 12, "name": "Onion Red" },
              "country": { "id": 5, "name": "India", "flag_emoji": "🇮🇳" },
              "shipment_type": "Sea", "packing": "Bag 25kg", "unit": "bag",
              "price": "2.80", "price_per_kg": "0.11", "currency": "AED",
              "report_date": "2026-07-06", "pct_change_vs_prev": -3.4 } ],
  "meta": { "page": 1, "per_page": 50, "total": 61, "latest_report_date": "2026-07-06" } }
```

---

## 7. Analytics API — `/api/analytics`

All endpoints read pre-aggregated tables only (Architecture §7).

| Method & path | Role | Purpose |
|---|---|---|
| `GET /summary` | any | Dashboard snapshot: latest date, product/origin counts, avg market change, top gainers/losers |
| `GET /price-history` | any | Time series for charts. Params: `product_id` (req), `range` (`7d/30d/90d/1y/custom`+`from/to`), `country_id` (optional; omit = all-origins rollup), `granularity` (`day/week/month`) |
| `GET /comparison` | any | One product across a dimension. Params: `product_id`, `dimension` (`country`\|`shipment`), `date` (default latest), optional `range` for trend overlay |
| `GET /movers` | any | Top-N by `pct_change_vs_prev` (`?direction=up|down&limit=10&date=`) |
| `GET /shipment-breakdown` | any | Counts + avg price by shipment type for a date |
| `GET /category-overview` | any | Per-category avg price + change |

**`GET /api/analytics/summary`**
```json
{ "data": { "latest_report_date": "2026-07-06", "previous_report_date": "2026-07-05",
  "products_count": 284, "origins_count": 31,
  "avg_change_pct": 1.2,
  "top_gainers": [ { "product": "Tomato", "country": "Jordan", "price": "4.50", "change_pct": 18.4 } ],
  "top_losers":  [ { "product": "Cucumber", "country": "UAE", "price": "2.10", "change_pct": -12.0 } ],
  "last_upload": { "id": 812, "status": "published", "published_at": "2026-07-06T06:41:00Z" } } }
```

**`GET /api/analytics/price-history?product_id=45&range=30d&granularity=day`**
```json
{ "data": { "product": { "id": 45, "name": "Tomato" }, "currency": "AED",
  "series": [ { "date": "2026-06-07", "min": "3.80", "avg": "4.10", "max": "4.60", "observations": 5 } ],
  "stats": { "period_min": "3.20", "period_max": "5.10", "period_avg": "4.05", "trend_pct": 6.2 } } }
```

---

## 8. Chat API — `/api/chat`

| Method & path | Role | Purpose |
|---|---|---|
| `POST /messages` | any | Send a message; runs the AI orchestrator; returns the assistant turn |
| `GET /sessions` | any | Own sessions, newest first (paginated) |
| `GET /sessions/{id}/messages` | any | Full transcript of own session |
| `PATCH /sessions/{id}` | any | Rename |
| `DELETE /sessions/{id}` | any | Soft-delete own session |
| `POST /messages/{id}/feedback` | any | `{"feedback":"up"|"down"}` |
| `GET /suggestions` | any | Suggested/starter questions (config-driven; doubles as eval set) |

**`POST /api/chat/messages`**
```json
// request — omit session_id to start a new session
{ "session_id": 91, "text": "compare onion prices between india and pakistan" }

// 200 — grounded answer
{ "data": { "session_id": 91, "message_id": 3411, "status": "ok",
  "content": "Based on today's report (6 Jul 2026): Red onion from India averages 2.80 AED (Sea), while Pakistan averages 3.10 AED (Land). India is about 10% cheaper.",
  "chart": { "type": "bar", "unit": "AED",
             "series": [ { "label": "India", "value": 2.80 }, { "label": "Pakistan", "value": 3.10 } ] },
  "sources": [ { "report_date": "2026-07-06", "upload_id": 812 } ],
  "latency_ms": 4210 } }

// 200 — clarification needed
{ "data": { "status": "clarify",
  "content": "Which onion would you like to compare — Red, White, or all varieties?",
  "options": ["Onion Red", "Onion White", "All onions"] } }

// 200 — out of scope
{ "data": { "status": "refused",
  "content": "I can answer questions about market prices, origins, shipments and trends. I don't have data about weather forecasts." } }
```

Constraints: `text` ≤ 1,000 chars; rate limit 20 messages/min/user (`429 RATE_LIMITED`); hard timeout 20 s → `status:"error"` with retry affordance.

---

## 9. Notifications API — `/api/notifications`

| Method & path | Role | Purpose |
|---|---|---|
| `GET /` | any | Own notifications (`?is_read=&type=`; paginated) |
| `GET /unread-count` | any | Badge count (polled by Bubble header) |
| `POST /{id}/read` · `POST /read-all` | any | Mark read |
| `GET /alert-rules` · `POST` · `PATCH /{id}` · `DELETE /{id}` | any | Personal price alert rules *(Phase 5)* |

---

## 10. Admin API — `/api/admin`

| Method & path | Role | Purpose |
|---|---|---|
| `GET /users` | admin | List org users |
| `POST /users/invite` | admin | `{"email","name","role"}` → invited user + email |
| `PATCH /users/{id}` | admin | Change role / deactivate–reactivate |
| `GET /audit-log` | admin | Filterable audit trail (`?actor_id=&action=&entity_type=`; paginated) |
| `GET /usage` | admin | Ops metrics: uploads success rate, chat volume, AI cost by feature/month |
| `GET /settings` · `PATCH /settings` | admin | Org settings (anomaly threshold, auto-publish, retention) |
| `GET /extraction-templates` · `POST` · `PATCH /{id}` | admin | Template version management |

---

## 11. Versioning & Change Policy

- Breaking changes require a new Xano API group version (`/api/v2/...`); v1 endpoints are maintained through one full phase after deprecation notice.
- Additive changes (new optional params, new response fields) are non-breaking and allowed at any time; consumers must ignore unknown fields.
- Every contract change lands as a PR to this document **before** implementation.
