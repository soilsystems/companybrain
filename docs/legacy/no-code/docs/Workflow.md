# Company Brain — n8n Workflow Design

| | |
|---|---|
| **Document** | Workflow.md |
| **Version** | 1.0 |
| **Status** | Draft — pending approval |
| **Platform** | n8n (self-hosted or cloud). Workflow JSON exports live in `/automation/workflows`. |
| **Related** | [Architecture.md](Architecture.md) · [Database.md](Database.md) · [API.md](API.md) · [AI.md](AI.md) |

> **This is the operational heart of the platform.** n8n is stateless — every workflow reads inputs from and writes results back to Xano. No workflow holds data between runs. Secrets (Document AI, OpenAI, Drive) live only in n8n credentials.

---

## 0. Cross-Cutting Standards (apply to ALL workflows — defined once, reused, never duplicated)

These are the shared building blocks. Individual workflows *reference* them instead of re-implementing (NFR-8, "never duplicate workflows").

### 0.1 Naming & versioning
`WF{n}-{name}-v{major}` (e.g. `WF2-ocr-processing-v1`). Sub-workflows: `SUB-{name}`. Every save is exported to GitHub in the same PR as the change.

### 0.2 Shared sub-workflows (called via n8n *Execute Workflow* node)
| Sub-workflow | Responsibility | Reused by |
|--------------|----------------|-----------|
| `SUB-verify-signature` | Validate `X-CB-Signature` HMAC on inbound webhooks | WF1 (WF7 future) |
| `SUB-xano-call` | Authenticated Xano REST call (service token header) + standard error shaping | all |
| `SUB-set-upload-status` | `POST /ingest/uploads/{id}/status` with stage + optional error; appends to `status_timeline` | WF1–WF5 |
| `SUB-log-error` | Write `error_log` entry + create `failed` notification + (optionally) mark upload `failed` | all |
| `SUB-retry-wrapper` | Standard retry policy (see 0.4) around a fragile external call | WF2, WF8 |
| `SUB-notify` | `POST /notifications` fan-out (in-app now; email later) | WF1–WF9 |
| `SUB-ai-usage-log` | `POST /ingest/ai-usage` after any OpenAI/Document AI call | WF2, WF3, WF8 (+ Xano chat) |

### 0.3 Idempotency (NFR-4)
Every ingestion write carries `upload_id + row_hash`. `POST /ingest/uploads/{id}/rows` **upserts** on that key. A workflow re-run therefore updates rather than duplicates. Publish is guarded per `upload_id` in Xano. Scheduled workflows are keyed by `(market, date)` so a double-fire is a no-op.

### 0.4 Retry policy (standard, via `SUB-retry-wrapper`)
| External call | Max attempts | Backoff | On final failure |
|---------------|-------------|---------|------------------|
| Google Document AI | 3 | 5s / 20s / 60s | mark upload `failed`, notify, keep file for manual retry |
| OpenAI | 3 | 3s / 10s / 30s | fall back (rules-only for WF3; error bubble for chat) |
| Google Drive | 3 | 5s / 15s / 45s | archive is non-fatal → flag `archive_pending`, continue |
| Xano write | 5 | 2s ×5 | dead-letter to `SUB-log-error`; alert admin |

Transient (5xx/timeout) → retried; deterministic (4xx/validation) → **not** retried, straight to `SUB-log-error`.

### 0.5 Logging (every workflow)
- n8n native execution log retained (for step-level debugging).
- Business-level logging written **to Xano**: `uploads.status_timeline` (pipeline stages), `ocr_logs` (OCR runs), `ai_usage_log` (AI/OCR cost), `audit_logs` (data mutations), `notifications` (user-facing events). A failure is never silent — it always produces a Xano log row **and** a notification.

### 0.6 Pipeline state machine (WF1→WF5 advance one upload through this)
```
uploaded → queued → ocr → cleaning → validation → review_pending
   → (human) → publishing → published
Any stage error → failed  (retryable from the failed stage; no re-upload, no dupes)
```

---

## Workflow 1 — Daily Upload (ingestion entrypoint)

**Purpose:** receive the upload event from Xano, archive the original, and kick off OCR.

- **Trigger:** Webhook (Xano fires `POST {n8n}/ingestion` on `POST /uploads`), signed with `X-CB-Signature`. *(Not a schedule — the admin controls timing; a scheduled reminder to upload is a separate concern handled by WF9.)*
- **Actions:**
  1. `SUB-verify-signature` → reject unsigned/invalid (401, no processing).
  2. `SUB-set-upload-status` → `queued`.
  3. Download working copy of the file from `xano_file_url`.
  4. Archive original to Google Drive `/CompanyBrain/{market}/{yyyy}/{mm}/{report_date}-{upload_id}.{ext}` → `SUB-xano-call POST /ingest/uploads/{id}/archive` with `drive_file_id`, `drive_url`.
  5. Trigger **WF2** (Execute Workflow) with `{upload_id, file_ref, file_type, report_date, template_id}`.
- **Decision points:**
  - Signature invalid → stop, 401.
  - File missing/corrupt/oversized → `failed` (deterministic, no retry).
  - Drive archive fails → **non-fatal**: flag `archive_pending`, continue to WF2 (WF9 retries archive later).
- **Failure handling:** deterministic errors → `SUB-log-error` + `failed`. Transient download/Drive → retry per 0.4.
- **Retries:** Drive per 0.4; the webhook itself is idempotent (re-fire with same `upload_id` resumes, no duplicate archive because filename is deterministic).
- **Logging:** status → `queued`; archive result to `uploads`; any error to `error_log` + notification.

---

## Workflow 2 — OCR Processing

**Purpose:** extract structured rows + confidence from the file; never write to production.

- **Trigger:** Execute Workflow from WF1.
- **Actions:**
  1. `SUB-set-upload-status` → `ocr`.
  2. Branch on `file_type`: **pdf/image** → Google Document AI (custom extractor, processor id from `extraction_templates`); **xlsx/xls** → n8n Spreadsheet parse.
  3. Wrap the Document AI call in `SUB-retry-wrapper`.
  4. Create an **`ocr_logs`** row: processor, page_count, rows_detected, avg/min confidence, duration, cost estimate, `raw_output_ref` (store raw JSON to Drive/Xano), status. `SUB-ai-usage-log` for cost.
  5. Post-process (Code/Function node): reassemble rows from table geometry, strip headers/footers/page numbers, merge cross-page rows, assert the 7-field shape (date, product, origin, shipment, weight, packing, price), preserve each cell's raw text (esp. `price_raw`, which may be `NA`), attach per-field confidence.
  6. Pass raw rows in-memory to **WF3** (Execute Workflow).
- **Decision points:**
  - Confidence below template threshold → don't fail; tag rows `low_confidence` (resolved in review).
  - Zero rows detected → `failed` with "no rows extracted — check scan quality/template."
  - Row count wildly off expected (e.g. < 50 or > 500) → continue but flag upload `warning: unexpected_row_count`.
- **Failure handling:** Document AI hard failure after retries → `failed` + notify + keep file for manual retry; `ocr_logs.status=error`.
- **Retries:** Document AI per 0.4 (3×).
- **Logging:** `ocr_logs` (always, even on success), status → `ocr`, cost to `ai_usage_log`.

---

## Workflow 3 — Data Cleaning (normalization)

**Purpose:** turn raw text into canonical, reference-linked rows. **Rules first, LLM only for leftovers** ([AI.md](AI.md) §2, Architecture §7.1).

- **Trigger:** Execute Workflow from WF2.
- **Actions:**
  1. `SUB-set-upload-status` → `cleaning`.
  2. Fetch dictionaries once: `GET /ingest/catalog/aliases`, country/shipment/packing synonyms.
  3. **Rule pass** (Code node, deterministic, free): keep `price_raw` exactly as imported, then normalize price (strip currency, parse ranges → price_min/max; **`NA`/blank → price=null**), **derive `is_available` = price is not null**, parse weight & packing (`5kg Box` → unit=box, unit_weight_kg=5, packing_type=Box, packing_raw kept), map product/variant via `product_aliases`, country via synonyms, shipment via synonyms, compute `price_per_kg` where weight known.
  4. **LLM pass** (only rows unresolved by rules): one **batched** OpenAI call mapping raw names → `product_id/variant_id | NEW` + confidence. `SUB-ai-usage-log`.
  5. Emit cleaned rows to **WF4**.
- **Decision points:**
  - Row fully resolved by rules → skip LLM (cost control).
  - LLM returns `NEW` → set `suggested_product_name`, leave `product_id` null (review will confirm — never auto-create).
  - LLM low confidence (< 0.6) → mark row `warning: low_match_confidence`.
- **Failure handling:** OpenAI failure after retries → **degrade gracefully**: proceed with rules-only results; unresolved rows flagged `unknown_product` for review (pipeline still reaches `review_pending`; nothing is lost). Log the degradation.
- **Retries:** OpenAI per 0.4; on exhaustion, degrade (don't fail the upload).
- **Logging:** status → `cleaning`; AI cost; count of rules-resolved vs LLM-resolved vs unresolved (feeds the "alias auto-resolution rate" success metric).

---

## Workflow 4 — Validation (anomaly gate)

**Purpose:** attach per-row quality status so the admin's review queue is pre-triaged.

- **Trigger:** Execute Workflow from WF3.
- **Actions:**
  1. `SUB-set-upload-status` → `validation`.
  2. Fetch `GET /ingest/prices/rolling-averages?report_date=…` (7-day avg per product/variant/country).
  3. For each row compute `validation_flags`:
     - `price_spike` if |price − rolling_avg| / rolling_avg > org `anomaly_threshold_pct` (default 40%).
     - `missing_field` if any required field null.
     - `unknown_product` if `product_id` null.
     - `low_ocr_confidence` / `low_match_confidence` (carried from WF2/WF3).
     - `duplicate_row` if same (product,variant,country,shipment,packing) already staged this upload.
  4. Set `validation_status`: `error` (missing required / unknown product), else `warning` (any flag), else `ok`.
  5. **Write staging rows** to Xano: `POST /ingest/uploads/{id}/rows` (idempotent upsert on row_hash), with counts.
  6. `SUB-set-upload-status` → `review_pending`; `SUB-notify` admins ("287 rows ready to review: 270 ok / 14 warn / 3 error").
- **Decision points:**
  - **Auto-publish** (org setting, FR-2.12, Phase 5): if 100% `ok` and enabled → skip review, call WF5 directly. Default off.
  - All rows `error` → still stage them + notify (better than dropping); status `review_pending` with a strong warning.
- **Failure handling:** Xano bulk-insert failure → retry (0.4, 5×) → dead-letter + `failed`.
- **Retries:** Xano writes per 0.4.
- **Logging:** status → `review_pending`, triage counts to `uploads`, notification.

> **Human step (not n8n):** the admin reviews/edits/approves/rejects in Bubble ([Bubble.md](Bubble.md) §4). Confirming a new product writes a `product_aliases` row (learning loop). Publishing is the admin action that triggers WF5.

---

## Workflow 5 — Publish to Xano

**Purpose:** promote approved staging rows into append-only history, then recompute all derived data — as **two decoupled, individually idempotent steps** (per approved simplification).

> **Design (write facts → recompute):** we do **not** rely on one big atomic multi-table transaction (Xano's cross-write guarantees are limited). Instead: **Step A — write facts only** (`daily_prices`), which is the sole source of truth; **Step B — recompute derived tables** (`product_latest_price`, `price_history_daily`, `market_summaries`) via WF6. Because the derived tables are 100% rebuildable from `daily_prices`, a failure or interruption between A and B is safe — rerunning B reconstructs correct derived state. This is simpler and more robust than pretending the whole fan-out is atomic.

- **Trigger:** Xano fires WF5 after `POST /uploads/{id}/publish` succeeds (or WF4 auto-publish path).
- **Actions:**
  1. `SUB-set-upload-status` → `publishing`.
  2. **Step A (Xano, done by the endpoint):** insert approved `upload_rows` → `daily_prices` (append-only), link `published_price_id` both ways. Guarded per `upload_id` — re-invoke is a no-op (rows already linked are skipped). This is the *only* write that must succeed for data to be safe.
  3. **Step B:** trigger **WF6** for `report_date` to recompute `product_latest_price`, `price_history_daily`, `market_summaries` from the facts. Idempotent and rerunnable.
  4. Anomaly check on the published set → if outliers, `SUB-notify` (`price_anomaly`).
  5. `SUB-set-upload-status` → `published`; `SUB-notify` ("284 prices for {date} are live").
- **Decision points:**
  - Duplicate-day / already-published (`replaced`) → publish endpoint handles replace (supersede old rows via `is_current`, archive, audit); WF5 proceeds, then WF6 recomputes.
  - Zero approved rows → block publish (endpoint returns 422); WF5 not invoked.
- **Failure handling:** Step A partial failure → the guarded insert is retried; only fully-linked rows count as published (no half-facts). **Step B failure never unpublishes data** — facts are safe; WF6 is re-queued and the dashboard simply refreshes a moment later (it keeps serving the last good `market_summaries` meanwhile).
- **Retries:** both steps idempotent → safe to re-invoke independently.
- **Logging:** status → `published`, `published_by/at`, counts, anomalies, `audit_logs` for the publish and any replace.

---

## Workflow 6 — Dashboard Refresh (Market Intelligence recompute)

**Purpose:** (re)compute the precomputed intelligence so dashboard & AI serve fresh, consistent numbers.

- **Trigger:** (a) from WF5 on publish (targeted date); (b) nightly **Schedule** (full self-healing rebuild + drift check).
- **Actions:**
  1. Call the Market Intelligence Engine Xano functions for `(market, report_date)`: averages, most expensive/cheapest, top gainers/losers, **missing products** (vs trailing-window catalog), country/shipment/availability distributions, category overview, outliers → **upsert `market_summaries`** (`computed_by=publish|rebuild`).
  2. Refresh `price_history_daily` / `product_latest_price` if the nightly rebuild finds drift vs `daily_prices`.
  3. On nightly run: verify aggregates == recomputed-from-facts; if mismatch, correct + `SUB-notify` (`system` warning) so silent drift is impossible.
- **Decision points:**
  - Targeted (single date, fast) vs full nightly rebuild (all recent dates).
  - Drift detected → auto-correct + alert.
- **Failure handling:** compute failure → retry; persistent → `SUB-log-error` + admin notify; last good `market_summaries` stays served (dashboard degrades to "as of last refresh", never breaks).
- **Retries:** standard Xano retry.
- **Logging:** `market_summaries.updated_at`, drift corrections to `audit_logs`.

> **Naming note:** WF6 is *recompute/refresh of the intelligence data*. It does not "refresh Bubble" — Bubble always reads live from Xano; there is nothing to push.

---

## Workflow 7 — AI Chat Request *(FUTURE — not built in Phase 1)*

**Purpose:** answer a user question **only from database data** via tool calling ([AI.md](AI.md)).

> **Phase 1 decision:** the AI chat orchestration runs **entirely in Xano** — Bubble calls the Xano `/chat/messages` endpoint, and Xano performs the tool-calling loop, database queries, and OpenAI calls directly. **n8n is reserved for automation** (OCR, scheduled jobs, notifications, background tasks), *not* for the synchronous chat request. WF7 below is documented as a **future enhancement**: if the tool-calling loop later grows complex enough to warrant n8n's visual orchestration, this is the design to lift it into — the Bubble contract (`POST /chat/messages`) stays identical, so moving it is transparent to the frontend. The steps below therefore describe the *orchestration logic* (which lives in Xano today) in workflow form.

- **Trigger:** *(future)* called by the Xano `/chat/messages` endpoint (signed) if/when orchestration is delegated to n8n. In Phase 1 these steps execute inside the Xano endpoint itself.
- **Actions:**
  1. `SUB-verify-signature`; load conversation context + tool registry from Xano.
  2. **OpenAI call #1 (tool selection):** model picks tool(s) + arguments from the registry (`get_current_price`, `get_price_history`, `compare_prices`, `get_extreme_price`, `list_products`, `get_market_summary`).
  3. Execute selected tool(s) → parameterized, org-scoped Xano queries on **precomputed tables** (`product_latest_price`, `price_history_daily`, `market_summaries`).
  4. **OpenAI call #2 (compose):** answer built **only** from tool results, citing report date; attach `chart_spec` when a trend/comparison is returned.
  5. Persist the turn (`chat_messages`: content, tool_calls, sources, latency, tokens); `SUB-ai-usage-log`.
- **Decision points:**
  - Model cannot bind a required arg (ambiguous product) → return `clarify` with options (no query run).
  - Intent unsupported / out of scope → return `refused` (no query, no fabrication).
  - Tool result empty → compose a truthful "no data for X" answer.
- **Failure handling:** OpenAI failure after retries or > 20s timeout → `status:error` + retry affordance in UI; failed turn logged for eval review. **No fabrication path exists** because the composer only ever sees tool results.
- **Retries:** OpenAI per 0.4; hard timeout 20s.
- **Logging:** full turn incl. tool_calls (reproducibility/eval mining), latency, token cost; user 👍/👎 later attached.

---

## Workflow 8 — Daily Market Insights

**Purpose:** every morning, guarantee the day's intelligence + narrative exist and notify users — and catch a *missing* report.

- **Trigger:** **Schedule** (e.g. 07:30 local, org-configurable).
- **Actions:**
  1. Check: is there a `published` upload for `(market, today)`?
  2. **If yes:** ensure `market_summaries` for today exists (call WF6 if not); generate a **narrative** (OpenAI, grounded on the summary row only — it narrates precomputed numbers, invents nothing); `SUB-ai-usage-log`; store `market_summaries.narrative`; `SUB-notify` all users (`daily_insight`: headline, top mover, missing products).
  3. **If no report yet:** `SUB-notify` admins (`review_pending`/reminder: "No market report published for {today} yet").
- **Decision points:** report present vs absent; summary present vs needs compute.
- **Failure handling:** narration (OpenAI) failure → still send the numeric digest from `market_summaries` (narrative is enhancement, not dependency). Notify failure → retry.
- **Retries:** OpenAI + notify per 0.4; schedule re-fires next day regardless (idempotent per date).
- **Logging:** insight generation + cost; digest delivery; missing-report events.

---

## Workflow 9 — Notifications (delivery & housekeeping)

**Purpose:** central delivery + retries for outbound comms and small housekeeping jobs — so notification logic is defined **once** and reused by all workflows (via `SUB-notify`), never duplicated.

- **Trigger:** (a) event-driven via `SUB-notify` (writes a `notifications` row; WF9 handles any external-channel delivery); (b) **Schedule** for housekeeping (retry `archive_pending` uploads, purge chat history > retention, purge read notifications > 6 mo, email digests in Phase 5).
- **Actions:**
  1. In-app: notification rows are written directly; Bubble polls `GET /notifications/unread-count` — no delivery step needed now.
  2. External channels (Phase 5): read pending email/WhatsApp, deliver via provider node, update `channel_status`.
  3. Housekeeping sweeps on schedule (retry pending Drive archives; retention purges).
- **Decision points:** channel enabled? delivery already done (idempotent by `notification_id + channel`)?
- **Failure handling:** delivery failure → retry (0.4) → mark `channel_status.email=failed`; in-app is the always-on fallback so a user never misses a critical event.
- **Retries:** per 0.4.
- **Logging:** `channel_status` per notification; housekeeping counts to `audit_logs`.

---

## Workflow Map (dependencies & reuse)

```
WF1 Upload ─► WF2 OCR ─► WF3 Cleaning ─► WF4 Validation ─► [human review] ─► WF5 Publish
                                                                                │
                                                                       WF6 Recompute (write-facts→recompute; also nightly schedule)

AI Chat            (Phase 1: runs IN XANO, not n8n; reads precomputed tables)
WF7 AI Chat        (FUTURE only — n8n orchestration if the loop grows complex)
WF8 Daily Insights (schedule; calls WF6 if needed; catches missing report)
WF9 Notifications  (SUB-notify used by WF1–WF6, WF8; schedule for housekeeping)

Shared: SUB-verify-signature · SUB-xano-call · SUB-set-upload-status ·
        SUB-log-error · SUB-retry-wrapper · SUB-notify · SUB-ai-usage-log
```

**Anti-duplication guarantees:** status transitions, error handling, retries, notifications, and AI-usage logging each exist in exactly one sub-workflow. Adding a future module reuses the same subs; only new module-specific WFs are added ([Architecture.md](Architecture.md) §10).
