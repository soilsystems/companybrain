# Company Brain — System Architecture (No-Code)

| | |
|---|---|
| **Document** | Architecture.md |
| **Version** | 2.0 |
| **Date** | 2026-07-06 |
| **Status** | Draft — pending approval |
| **Stack** | Bubble · Xano · n8n · Google Document AI · OpenAI · Google Drive · GitHub |
| **Related** | [PRD.md](PRD.md) · [Database.md](Database.md) · [Workflow.md](Workflow.md) · [Bubble.md](Bubble.md) · [AI.md](AI.md) · [API.md](API.md) |

---

## 1. Architectural Principles

1. **Xano is the single source of truth.** Only Xano touches the database. Bubble and n8n interact with data exclusively through Xano's REST API. Business rules, auth, tenancy, and validation live in one place — which is also what makes the frontend or automation layer replaceable.
2. **Core vs. Modules.** Shared core services (identity, organizations, storage, notifications, **AI assistant**, **Market Intelligence Engine**, audit) are reused by every business module. Market Intelligence is module #1; future modules plug in without redesign.
3. **AI proposes, the database disposes.** Document AI and OpenAI extract, interpret, and select queries. They never author facts. Every user-visible number comes from a database row; every extracted value passes a **staging/validation gate** before becoming truth.
4. **Precompute for reads.** The Market Intelligence Engine computes dashboards and AI-serving aggregates at write time. Read paths never scan the fact table (scale + speed).
5. **Configurable, append-only, idempotent.** Markets/mappings/thresholds are config, not code. Published history is append-only. Every automation is safe to retry.

---

## 2. The Stack, Layer by Layer

```
        ┌─────────────────────────────────────────────────────────┐
        │  BUBBLE  — Presentation (responsive web, mobile-friendly)│
        │  Dashboard · Chat · Upload · Explorers · Reports · Admin │
        └───────────────────────────┬─────────────────────────────┘
                                     │  REST + JWT  (Bubble API Connector)
        ┌───────────────────────────▼─────────────────────────────┐
        │  XANO  — Backend, Database & Business Logic              │
        │  Auth · REST API · PostgreSQL(managed) · Validation      │
        │  Publish transaction · Market Intelligence Engine        │
        │  AI Chat Orchestrator · Notifications · Audit            │
        └───┬───────────────────────────────────▲─────────────────┘
            │ signed webhook (trigger)           │ REST (service token)
        ┌───▼───────────────────────────────────┴─────────────────┐
        │  n8n  — Automation / Orchestration (stateless)           │
        │  WF1 Upload · WF2 OCR · WF3 Cleaning · WF4 Validation    │
        │  WF5 Publish · WF6 Recompute · (WF7 AI Chat = future)    │
        │  WF8 Daily Insights · WF9 Notifications                  │
        └───┬───────────────┬───────────────┬──────────────────────┘
            │               │               │
   ┌────────▼──────┐ ┌──────▼───────┐ ┌─────▼────────┐
   │ Google        │ │  OpenAI API  │ │ Google Drive │
   │ Document AI   │ │  (tool call, │ │  source-file │
   │ (OCR)         │ │   compose)   │ │  archive     │
   └───────────────┘ └──────────────┘ └──────────────┘

   GitHub — version control for: this doc set, Xano schema exports,
            n8n workflow JSON exports, AI tool/intent configs, seeds, fixtures.
```

### Component responsibilities

| Component | Owns | Explicitly does **not** own |
|-----------|------|------------------------------|
| **Bubble** | All UI, display state, navigation, responsive layout, calling Xano APIs, rendering charts | Business logic, data, secrets, role decisions |
| **Xano** | Database, REST API, JWT auth, role enforcement, validation rules, fact-write + recompute, Market Intelligence Engine functions, **AI chat orchestration (Phase 1)**, notification fan-out, audit | UI, long-running ingestion orchestration, third-party OCR calls that belong in n8n |
| **n8n** | Async pipelines: ingestion (upload→OCR→clean→validate→stage), scheduled jobs (daily insights, dashboard refresh), notification delivery, calling Document AI / OpenAI / Drive | Being a source of truth — n8n holds **no state**; all state is written back to Xano |
| **Google Document AI** | Extracting tabular text + per-field confidence from PDFs/scanned images | Interpreting business meaning |
| **OpenAI API** | Intent detection, product-name normalization (unresolved rows only), grounded answer composition, insight narration | Producing facts/numbers on its own |
| **Google Drive** | Immutable archive of every original source file, structured by market/year/month | Being queried for data (it's an archive, not a database) |
| **GitHub** | Version-controlled memory of schema, workflows, AI configs, docs | Runtime |

### Why n8n *and* Xano both exist (division of labor)
Xano can call external APIs, but OCR + multi-step AI ingestion is long-running, branchy, and retry-heavy — a natural fit for n8n's visual, resumable, logged workflow model. Rule of thumb: **synchronous, transactional, data-integrity logic → Xano; asynchronous, multi-service, orchestrated pipelines → n8n.** **The AI chat request runs entirely in Xano in Phase 1** (synchronous, low-latency); n8n is reserved for automation. Moving chat orchestration into n8n (WF7) is a documented future option only — see §7.2.

---

## 3. Authentication & Authorization

```
User → Bubble login form → POST /auth/login (Xano) → JWT
Bubble stores JWT → sends "Authorization: Bearer <jwt>" on every API call
Xano resolves user_id → looks up organization_id + role SERVER-SIDE (never trusts client)
Xano enforces the role matrix per endpoint → 403 on violation
```

- **Roles**: `admin`, `analyst`, `viewer`, `service` (n8n machine account). Role is read from the DB per request, not from the token payload alone.
- **Tenancy**: `organization_id` is injected into every query from the authenticated user; no endpoint accepts it from the client. Cross-org access returns 404 (indistinguishable from "not found").
- **n8n ↔ Xano**: n8n authenticates to Xano with a dedicated **service token** (role `service`: may write staging, read reference data; cannot manage users). Xano→n8n webhooks are **HMAC-signed** (`X-CB-Signature`) and n8n verifies before acting.
- **Secrets**: OpenAI, Document AI, and Drive credentials live only in n8n's credential vault (and Xano's env for anything Xano calls directly). **Bubble never holds a third-party key.** Nothing secret is committed to GitHub — `.env.example` documents names only.

Full contracts: [API.md](API.md).

---

## 4. Data Flow — lifecycle of one report

```
Daily PDF/scan ─► Bubble Upload ─► Xano creates upload (status=uploaded) ─► signed webhook ─► n8n
   │
   ├ WF1 Upload      : validate, archive original to Drive, mark queued
   ├ WF2 OCR         : Document AI extract → OCR log (confidence, timing) → raw rows
   ├ WF3 Cleaning    : keep price_raw; parse weight/packing/price (NA→null, derive
   │                    is_available); resolve product/variant/
   │                    country/shipment via alias+synonym rules; LLM only for leftovers
   ├ WF4 Validation  : anomaly checks (price spike, missing fields, unknown product,
   │                    low OCR confidence) → per-row status ok/warning/error
   └ writes STAGING rows in Xano (upload_rows), status = review_pending
   │
   ▼
Admin Review screen (Bubble) ─ edit / approve / reject / confirm-new-product
   │
   ▼  POST /uploads/{id}/publish
Xano PUBLISH — write facts first, then recompute (two idempotent steps):
   Step A: staging → daily_prices (append-only)   ← the ONLY source-of-truth write
   Step B: trigger WF6 → recompute derived tables (latest cache, history, summaries)
   │
   ▼
Market Intelligence Engine recomputes summaries/aggregates for that date (rerunnable)
   │
   ▼
Dashboards & AI now serve the new data (from precomputed tables, not the fact table)
```

**Guarantees:** asynchronous (admin never waits on OCR); **write-facts-then-recompute** (no reliance on a big atomic multi-table transaction — derived tables are fully rebuildable from `daily_prices`, so an interruption between A and B is safe: rerun B); idempotent (staging upserts on `upload_id+row_hash`, fact write guarded per `upload_id`, recompute rerunnable); auditable (every stage timestamped in `uploads.status_timeline`, every OCR run in `ocr_logs`, every mutation in `audit_logs`).

---

## 5. Market Intelligence Engine (the heart of the platform)

A dedicated, reusable layer — **not** scattered dashboard queries. It is implemented as a set of **Xano functions** (the calculations, run by WF6 right after the facts are written) plus **n8n WF6/WF8** (scheduled/triggered orchestration and narration). It is the *single* place market analytics is computed, and it feeds **both** the dashboard and the AI so logic is never duplicated (NFR-8).

### What it produces (stored, not computed on read)
Per market + report date, written to `market_summaries` and the aggregate/cache tables (see [Database.md](Database.md)):

| Output | Definition |
|--------|-----------|
| Daily market summary | Counts (products, origins, entries), total observations, headline avg change |
| Average price | Overall, per category, per product (and per-kg where weight known) |
| Most expensive / cheapest | Ranked products for the date |
| Top gainers / losers | Largest ± % change vs previous report date |
| **Missing products** | In the trailing-N-report catalog but absent today (supply signal) |
| Country distribution | Product counts & avg price per origin |
| Shipment distribution | Counts & avg price per Air/Sea/Land/Local |
| Availability distribution | Counts available vs not-available (derived from price: NA→not available) |
| Trends | Per-product time series (via `price_history_daily` aggregate) |
| Outliers | Rows deviating > threshold vs rolling average (also flagged upstream in WF4) |

### Why a dedicated engine
1. **Performance (NFR-1/2):** dashboard and AI read *precomputed* rows — O(days shown), never O(all history).
2. **Consistency:** the number on the dashboard and the number the AI quotes come from the same computed row.
3. **Reusability:** future modules (sales, procurement, finance) follow the same "engine computes → dashboard & AI consume" pattern.
4. **Configurability:** thresholds (anomaly %, "recent" window for missing products) are org settings, not constants.

### When it runs
- **On publish** (WF6, immediately after the facts are written): recompute for the affected date. This makes new data instantly correct and is safe to rerun.
- **Every morning** (n8n WF8, scheduled): produce the day's narrated insight + notification even if publish already ran; detect a *missing report* (no publish today) and raise it.
- **Nightly** (n8n WF6 rebuild): recompute aggregates from `daily_prices` to self-heal any drift; rebuildable from the fact table at any time.

---

## 6. OCR Flow (detail)

```
WF2 receives {upload_id, drive/xano file_url, file_type, report_date, template_id}
1. Download file (working copy)
2. Send to Google Document AI (custom extractor trained on the market layout)
      → table entities: cells + per-field confidence
3. Write an OCR LOG row: processor id, page count, avg/min confidence,
   duration, token/spend estimate, pointer to raw JSON, status
4. Reassemble rows from table geometry; strip headers/footers/page numbers;
   merge rows split across pages; assert 7-field shape; preserve price_raw (may be NA)
5. Attach per-field confidence; rows < threshold flagged low_confidence
6. Hand rows to WF3 (Cleaning)   ── never straight to production (FR-2.2)
```
- **Scanned images / poor scans:** Document AI handles image input; low-confidence rows are flagged for the review screen rather than dropped.
- **Excel path:** structural parse (n8n spreadsheet node) replaces steps 2–5; confidence = 1.0; still an OCR-log row for uniform history.
- **Template versioning:** `extraction_templates` config (column order, header signatures, processor id, threshold) is versioned so a report redesign (Risk R7) adds a new version without breaking old uploads.
- **Failure:** any step → upload `failed` + `ocr_logs.status=error` + error log + admin notification; retry restarts WF2 from the archived file.

---

## 7. AI Flow

Two AI subsystems share only the OpenAI account. Neither can write a fact. Full design: [AI.md](AI.md).

### 7.1 Ingestion AI (normalization) — inside WF3
Rules first (alias + synonym tables resolve most rows for free), **LLM only for unresolved rows** (batched, one call per report), returning canonical mappings + confidence. The LLM may suggest a *new* product but never create one — the review screen confirms it, which writes the alias (learning loop). Cost trends toward zero as aliases accumulate.

### 7.2 Chat AI (query engine) — Xano orchestrator (Phase 1)
**Function/tool calling, not RAG** (prices are structured & exact):
```
User question (Bubble) → Xano /chat/messages
  1. Load conversation context + tool registry
  2. OpenAI call #1: pick tool(s) + arguments  (get_current_price, get_price_history,
     compare_prices, get_extreme_price, list_products, get_market_summary, …)
  3. Xano executes the tool → parameterized, org-scoped query on precomputed tables
  4. OpenAI call #2: compose an answer from query results ONLY (+ cite report date)
  5. Persist the turn (text, tool calls, latency, tokens); return text + optional chart
```
- **Where it runs:** **entirely in Xano in Phase 1** — Bubble → `POST /chat/messages` → Xano runs the tool loop, queries, and OpenAI calls synchronously. n8n is *not* in the chat path (reserved for automation). Delegating orchestration to **n8n WF7** is a future option only, taken only if the tool loop grows complex; the `POST /chat/messages` contract is identical either way, so the move would be transparent to Bubble.
- **Pluggable tools:** the tool registry is a config table. The future Documents module adds `search_documents` (the one RAG tool) without touching existing tools (NFR-7).
- **Anti-hallucination:** the composer sees only tool results; empty result → "no data" answer; ambiguous args → clarification; unsupported intent → refusal. There is no path for the model to see or invent free-form prices.

---

## 8. Upload Flow (user-facing)

```
Admin (Upload page) → file + report_date(default today) + market
  POST /uploads → Xano: validate type/size/role; duplicate-day check
      (published exists? → 409 "replace?"); store file; status=uploaded; fire webhook
  Bubble → Upload Detail; polls GET /uploads/{id} (stepper: uploaded→ocr→cleaning→
      validation→review_pending)
  Review & Publish grid: per-row status chips + anomaly reasons; inline edit;
      confirm-new-product; bulk approve OK rows; reject with reason
  POST /uploads/{id}/publish → guarded publish → intelligence recompute
  Confirmation: rows published/rejected; dashboard reflects it immediately
```
Edge cases handled: duplicate day (replace + archive + audit), backfilled dates (allowed; engine recomputes that date), partial publish (rejected rows retained for audit), cancel before publish. Detail: [Bubble.md](Bubble.md) §4 and [Workflow.md](Workflow.md).

---

## 9. Dashboard Flow

```
Bubble Dashboard load →
  GET /analytics/summary   → reads market_summaries (PRECOMPUTED) — snapshot cards,
                             most expensive/cheapest, gainers/losers, missing products,
                             country & shipment distribution
  GET /prices/latest       → product explorer grid (paginated, from latest-price cache)
  GET /analytics/price-history → trend chart series (from price_history_daily aggregate)
```
**Rule:** no dashboard call scans `daily_prices`; every card maps to a precomputed row from the Market Intelligence Engine. This is what delivers < 3 s loads at millions of rows (NFR-1/2). The daily dashboard is effectively *pre-rendered as data* each morning by WF8.

---

## 10. Future Scalability & Expansion

### 10.1 Module blueprint (every future module supplies only these)
1. **Tables** (org-scoped, [Database.md](Database.md) conventions),
2. **Xano API group** (`/api/{module}/…`, [API.md](API.md) conventions),
3. **n8n workflows** for its ingestion/jobs (reusing shared sub-workflows — no duplication),
4. **Intelligence Engine calculators** following the compute→store→serve pattern,
5. **AI tools** registered in the chat tool registry,
6. **Bubble pages** mounted into the shared shell.

Core it may consume but not modify: auth/roles, organizations, storage, notifications, AI orchestrator, intelligence-engine framework, audit. **Pluggability test:** adding module #2 changes nothing in module #1.

### 10.2 Path to SaaS — *architect for many, build for one*
**Multi-tenant SaaS is aspirational, not a Phase 1 requirement.** Phase 1 serves a **single organization** (our own company) with one market dataset. We do **not** build tenant management, billing, subscription plans, or tenant-isolation features now.

What we *do* keep now (cheap SaaS-readiness, so enabling it later is minimal change): `organization_id` on every business table, no organization-specific logic hardcoded anywhere (markets/mappings/thresholds are config), per-org roles, org-segmented Drive paths, org settings for thresholds/markets. All queries carry the org filter as a matter of hygiene, but with a single seeded org it is effectively a constant today.

Deferred entirely to the SaaS phase ([Roadmap.md](Roadmap.md) Phase 7): onboarding flow, per-org markets/templates, billing + usage metering, plan-limit middleware, tenant-isolation audit, optional white-label. In short: **build for one customer today, architect for many tomorrow.**

### 10.3 Scale-out escape hatches (contracts unchanged)
| Pressure point | Escape hatch |
|----------------|--------------|
| Analytics on 10M+ rows exceeds Xano comfort | Nightly sync of `daily_prices` to an external warehouse; analytics endpoints re-pointed; API unchanged |
| Documents need vector search | Dedicated vector store behind the `search_documents` tool |
| Bubble perf/branding limits | Replace Bubble with a custom frontend on the *same* Xano API |
| n8n throughput | Split workflows per module; queue fan-out; self-hosted n8n cluster |

### 10.4 Non-negotiable invariants (every phase)
1. Only Xano touches the database.
2. Every table carries `organization_id`; every query filters by it.
3. OCR/AI output never becomes truth without the staging gate.
4. Published price history is append-only; corrections are audited revisions.
5. Dashboards & AI read precomputed intelligence, never the raw fact table (except single-row drill-downs).
6. No workflow is duplicated; shared logic is a reusable sub-workflow/function.
7. Schema, workflows, AI configs, and docs are versioned in GitHub.
