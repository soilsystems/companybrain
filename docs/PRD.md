# Company Brain — Product Requirements Document (PRD)

| | |
|---|---|
| **Document** | PRD.md |
| **Version** | 2.0 (no-code-first realignment) |
| **Date** | 2026-07-06 |
| **Status** | Draft — pending architecture approval |
| **Build model** | **No-code first** — Bubble · Xano · n8n · Google Document AI · OpenAI · Google Drive · GitHub |
| **Related docs** | [Architecture.md](Architecture.md) · [Database.md](Database.md) · [Workflow.md](Workflow.md) · [Bubble.md](Bubble.md) · [AI.md](AI.md) · [Roadmap.md](Roadmap.md) |

> **Build constraint (applies to the whole platform):** everything in this product is delivered on the no-code stack above. No hand-written application code, backend services, SQL scripts, or infrastructure-as-code. Xano is the database and business-logic layer; n8n is the automation layer; Bubble is the UI; Google/OpenAI are AI services. This is a product decision, not a temporary limitation.

---

## 1. Vision

**Company Brain is the AI-powered business intelligence platform that turns a company's daily operational data into an always-current, queryable brain.** Instead of reports that are read once and forgotten, every document uploaded becomes permanent structured data that anyone can ask questions of in plain language.

The first module proves the model on a high-value, high-frequency dataset: the **Dubai Fruits & Vegetables Market daily price report**. Today that intelligence lives in a PDF that lands every morning, is glanced at, and is lost. Company Brain converts it into a compounding historical asset with dashboards and an AI assistant on top.

The platform is designed from day one to expand — company documents, contracts, sales, procurement, finance, inventory, and executive reporting — each as a **pluggable module** on a shared no-code core, and to become a **multi-tenant SaaS** product sold to other trading and distribution companies.

### Guiding principles
1. **Data is an asset.** Every report ingested permanently increases the platform's value.
2. **AI proposes, the database disposes.** OCR and LLMs extract and interpret; humans validate; only validated data becomes truth. The chatbot answers **only** from structured database data — never from model memory, never from RAG for prices.
3. **Answers, not documents.** Users ask questions and get sourced answers in seconds.
4. **Modules, not a monolith.** Market Intelligence is module #1 on a core (auth, storage, AI assistant, intelligence engine) that future modules reuse without redesign.
5. **Configurable, never hardcoded.** Thresholds, markets, field mappings, product catalog, and AI behavior are data/config in Xano — not baked into workflows or pages.

---

## 2. Goals

| # | Goal | Measure |
|---|------|---------|
| G1 | Replace manual market-price lookup with instant answers | < 10 s question-to-answer |
| G2 | Build a historical price database that compounds daily | 100% of daily reports captured and retained forever |
| G3 | Make the morning market readable at a glance | Auto-generated daily dashboard, zero manual effort |
| G4 | Enable origin/timing purchasing decisions from data, not gut | Comparison & trend features used weekly by buyers |
| G5 | Establish a reusable, multi-tenant no-code foundation | New module added without touching core; `organization_id` on every table from day one |
| G6 | Keep AI trustworthy | Zero fabricated prices — every number traces to a database row |

### Non-goals (Phase 1)
Trading/ordering/payments · scraping external sites · native mobile apps (responsive web is enough) · intraday feeds (one report/day) · public/anonymous access · RAG over prices (RAG is reserved for the future Documents module).

---

## 3. User Personas

| # | Persona | Role | Needs | "Success" |
|---|---------|------|-------|-----------|
| **P1** | **Ayesha — Market Admin** | Uploads the daily report | Fast upload, clear pass/fail, an efficient review-and-correct screen | Upload + validate in < 10 min/day, then never touches data again |
| **P2** | **Rashid — Buyer / Trader** | Decides what to buy, from where, when | Instant price lookups, origin comparisons, trends, movement alerts | Buys on evidence, not memory of "last week" |
| **P3** | **Fatima — General Manager** | Oversees performance & positioning | 30-second morning dashboard, ad-hoc questions | Opens dashboard, asks the AI, no staff needed |
| **P4** | **Vikram — Analyst** | Deep-dives, prepares reports | Filterable tables, exports, comparisons, (later) API access | Monthly market report built in minutes |
| **P5** | **Platform Owner** (SaaS) | Onboards tenant companies | Tenant management, usage & ingestion monitoring | New tenant live in < 1 day |

---

## 4. Functional Requirements

Numbered `FR-x.y`; MoSCoW priority M/S/C.

### FR-1 Authentication & Users
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-1.1 | Email/password login via Xano auth (JWT); Bubble stores token | M |
| FR-1.2 | Roles: **Admin** (upload, validate, manage), **Analyst** (query, dashboards, export), **Viewer** (query, dashboards) + **Service** (n8n machine account) | M |
| FR-1.3 | Admin invites/deactivates users; deactivation revokes access immediately | M |
| FR-1.4 | Password reset via emailed link | S |
| FR-1.5 | Every table carries `organization_id`; all data is org-scoped from day one | M |

### FR-2 Upload & Staging
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-2.1 | Admin uploads one report/day (PDF or scanned image; Excel also accepted), ≤ 20 MB, tagged with report date (default today) & market | M |
| FR-2.2 | **OCR results never enter production directly.** Every upload lands in a **staging area** and must be reviewed before publishing | M |
| FR-2.3 | Duplicate publication for the same market+date is blocked; re-upload requires explicit "replace" (old data archived, audited) | M |
| FR-2.4 | Original file archived to Google Drive in `/CompanyBrain/{market}/{yyyy}/{mm}/` and linked from history | M |
| FR-2.5 | Extracted fields per entry: date, product, country of origin, shipment type, weight, packing, price (AED); optional price min/max when the report gives a range. **Availability is not a report field** — it is *derived*: `price = NA/blank` → not available, numeric price → available. The **raw imported value is preserved exactly** (`price_raw`) | M |
| FR-2.6 | Every OCR run is logged (processor, confidence, timing, raw output reference, errors) | M |
| FR-2.7 | Pipeline status visible live: `uploaded → queued → ocr → cleaning → validation → review_pending → published / failed` | M |
| FR-2.8 | On failure at any stage: status `failed`, human-readable error log, retry from the failed stage (no re-upload, no duplicates) | M |

### FR-3 Canonical Product System
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-3.1 | Separate **Product**, **Variant**, **Country**, **Packing**, **Weight**, **Alias** entities so search is intelligent (a raw "TOMATO ROMA JOR 5KG BOX" resolves to Product=Tomato, Variant=Roma, Country=Jordan, Packing=Box, Weight=5kg) | M |
| FR-3.2 | Raw report spellings map to canonical products via an **alias** table; unmatched names are flagged, never silently created | M |
| FR-3.3 | Confirming a new product/alias in review teaches the system — the same raw string auto-resolves next time | M |
| FR-3.4 | Countries, shipment types, packing types normalized to reference tables with synonym lists | M |

### FR-4 Data & History
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-4.1 | **Historical prices are append-only and never overwritten.** Corrections create audited revisions, not in-place edits | M |
| FR-4.2 | Every price row traces to its source upload, OCR log, and Drive file | M |
| FR-4.3 | History is queryable indefinitely; no automatic purging of price data | M |

### FR-5 Market Intelligence Engine
A dedicated layer (see [Architecture.md](Architecture.md) §5) that, on every publish and every morning, computes and stores:
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-5.1 | Daily market summary per market/date | M |
| FR-5.2 | Average price (overall, per category, per product) | M |
| FR-5.3 | Most expensive & cheapest products | M |
| FR-5.4 | Top gainers & top losers (vs previous report date) | M |
| FR-5.5 | **Missing products** — products present in recent reports but absent today | M |
| FR-5.6 | Country distribution & shipment distribution | M |
| FR-5.7 | Trend calculations (per product over time) & outlier/anomaly detection | M |
| FR-5.8 | These precomputed results feed **both** the dashboard and the AI (single source, no duplicate logic) | M |

### FR-6 Dashboards & Analytics
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-6.1 | **Daily dashboard auto-generated every morning**: market summary, average price, most expensive, cheapest, biggest increase, biggest decrease, missing products, country distribution, shipment distribution | M |
| FR-6.2 | Product Explorer: searchable/filterable/sortable latest-price grid (category, country, shipment, availability, price range) | M |
| FR-6.3 | Country Explorer: origins, their products, and comparative prices | M |
| FR-6.4 | Price trend charts (7/30/90/365-day, custom), optionally split by country | M |
| FR-6.5 | Country comparison (one product across origins) & shipment breakdown | M |
| FR-6.6 | Reports: export any table/chart to CSV/XLSX; scheduled report generation (later) | S |

### FR-7 AI Assistant
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-7.1 | Natural-language chat answering **only from structured database data** (function/tool calling to Xano queries), never RAG for prices | M |
| FR-7.2 | Launch intents: today's price, history/trend, country comparison, top gainers/losers, filter by shipment/availability, monthly averages, product listing by attribute | M |
| FR-7.3 | Answers cite the report date; ambiguous questions ask for clarification instead of guessing; out-of-scope questions are refused gracefully | M |
| FR-7.4 | Trend/comparison answers can render an inline chart | S |
| FR-7.5 | Chat history persisted per user with sessions; multi-turn follow-ups resolve against prior context | M |

### FR-8 Notifications
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-8.1 | In-app notification center (unread badge): upload published, upload failed, review pending, price anomaly | M |
| FR-8.2 | Daily market insight notification/digest each morning | S |
| FR-8.3 | User-defined price alerts; email/WhatsApp delivery | C (later phase) |

### FR-9 Administration & Audit
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-9.1 | Upload history with status, timings, counts, OCR logs, error logs, source-file link, uploader | M |
| FR-9.2 | Catalog & reference management: products, variants, aliases (merge duplicates), countries, shipment/packing types | M |
| FR-9.3 | Audit log of every mutation to published data and every admin action | M |
| FR-9.4 | Configurable settings: anomaly threshold, auto-publish, retention, market definitions | M |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | **Scale** | Fact table must handle **10M+ rows** without redesign (≈300/day × 365 × markets × years × tenants). Every list is paginated; every chart reads pre-aggregated tables; no endpoint returns an unbounded set. |
| NFR-2 | **Performance** | Dashboard reads pre-computed intelligence, load < 3 s; AI answer < 8 s median; price lookup < 500 ms p95; full report ingestion < 5 min to review-ready. |
| NFR-3 | **Accuracy** | ≥ 98% field accuracy of *published* data (validation gate guarantees it); the AI never invents a price — all numbers come from queries. |
| NFR-4 | **Reliability** | Ingestion is asynchronous and **idempotent** — a retried n8n run never duplicates rows (idempotency key = upload_id + row hash). Publish is a single guarded operation per upload. |
| NFR-5 | **Security** | HTTPS everywhere; JWT on every endpoint; **role checks enforced server-side in Xano**, never only in Bubble; n8n↔Xano authenticated by service token + signed webhooks; API keys live only in n8n/Xano vaults, never in Bubble or GitHub. |
| NFR-6 | **Multi-tenant readiness (aspirational, not Phase 1)** | *Build for one customer today, architect for many tomorrow.* Phase 1 serves a **single organization**; we do **not** build tenant management, billing, plans, or isolation features now. We only keep the data model SaaS-ready: `organization_id` on every business table, no org-specific logic hardcoded (markets/mappings/thresholds are config), org filter applied as hygiene. Enabling multi-tenancy later is then configuration, not migration. |
| NFR-7 | **Extensibility** | New modules and new AI tools plug into the core without modifying existing ones (see [Architecture.md](Architecture.md) §10). Nothing hardcoded — markets, mappings, thresholds are config. |
| NFR-8 | **Maintainability** | n8n workflows, Xano schema, AI tool/intent definitions, and this doc set are version-controlled in GitHub. No workflow duplicated — shared sub-workflows are reused. |
| NFR-9 | **Mobile friendliness** | All primary screens usable on phones (Bubble responsive engine): dashboard, chat, explorer. |
| NFR-10 | **Observability & cost** | Every OCR/AI/pipeline run logged; failures notify, never silently drop; AI token usage logged per call for a cost dashboard. |

---

## 6. Success Metrics

Grouped by outcome; measured from launch of Module 1.

### Adoption
- **DAU/WAU**: ≥ 70% of invited users active weekly by week 4 post-launch.
- **AI usage**: ≥ 5 chat questions per active user per week.
- **Dashboard**: opened by GM/buyer personas ≥ 5 mornings/week.

### Operational reliability
- **Ingestion success rate**: ≥ 98% of daily uploads publish without developer intervention.
- **Time-to-publish**: median admin effort < 10 min/day; pipeline review-ready < 5 min.
- **Zero-loss guarantee**: 100% of business days have a published report or an explicitly logged "no report" — no silent gaps.

### AI quality
- **Grounding**: 100% of numeric answers trace to a database row (audited sample).
- **Answer accuracy**: ≥ 95% on the standing eval question set.
- **Refusal correctness**: ≥ 95% of out-of-scope questions refused rather than answered.
- **Latency**: median < 8 s, p95 < 15 s.

### Data quality
- **Published field accuracy**: ≥ 98% on weekly spot audits vs source file.
- **Alias auto-resolution**: unresolved-row rate trends below 5% within 4 weeks (learning loop working).

### Cost
- **Monthly run cost** (platform fees + AI + OCR) known and within budget; AI cost per answered question tracked and trending down as alias table matures.

---

## 7. Risks

| # | Risk | L | I | Mitigation |
|---|------|---|---|------------|
| R1 | OCR accuracy on scanned/messy PDFs (multi-column, Arabic/English) | H | H | Google Document AI custom processor trained on real samples; **staging gate**; per-field confidence; OCR logs; manual-entry fallback grid; push source to provide Excel where possible |
| R2 | Product-name chaos (one product, many spellings) | H | M | Canonical product+variant+alias system; rules-first then LLM matching; human confirmation writes aliases (learning loop); merge tooling |
| R3 | Xano performance on analytics at scale | M | H | **Market Intelligence Engine precomputes** everything the dashboard/AI need; fact table read only for drill-downs; indexes + pagination; warehouse-sync escape hatch if ceilings hit |
| R4 | AI hallucination | M | H | Tool-calling only; LLM selects queries, never authors numbers; grounded composer sees only query results; refusal path; see [AI.md](AI.md) §8 |
| R5 | No-code platform lock-in (Bubble/Xano/n8n proprietary) | M | M | API-first seams ([API.md](API.md)); schema & workflows exported to GitHub; Bubble replaceable atop the same Xano API |
| R6 | Single-admin bottleneck / missed day | M | M | Multiple admins; < 10-min flow; backfill with historical date; missing-day handling in the intelligence engine |
| R7 | Report format changes | M | M | Versioned extraction templates; staging catches breakage day one; processor-retrain runbook |
| R8 | n8n workflow sprawl / duplication | M | M | Shared sub-workflows, one responsibility each; naming + versioning discipline ([Workflow.md](Workflow.md)) |
| R9 | Scope creep to "everything platform" before Module 1 is solid | H | M | Hard phase gates ([Roadmap.md](Roadmap.md)); core-vs-module boundary enforced |
| R10 | Cost creep on OpenAI/Document AI | L | M | Usage logging, batching, rules-first matching, model-tier policy, budget alerts |

---

## 8. Future Modules

The core (auth, organizations, storage, notifications, AI assistant, intelligence engine, audit) is shared; each future module plugs in as new tables + new n8n workflows + new AI tools + new Bubble pages, **without redesigning the platform** (NFR-7, [Architecture.md](Architecture.md) §10).

| Module | What it adds | Reuses from core |
|--------|-------------|------------------|
| **Company Documents / Knowledge** | Document upload, **RAG** search (the *only* place RAG is used), employee knowledge base | Storage, AI assistant (new `search_documents` tool), auth |
| **Contracts** | Contract repository, key-date extraction, renewal alerts | Document ingestion, notifications, intelligence engine (date logic) |
| **Sales Analytics** | Sales data ingestion, revenue/margin dashboards, AI queries | Intelligence engine pattern, dashboards, AI tools |
| **Procurement** | Supplier/PO data, spend analytics; ties to market prices | Market module data, intelligence engine |
| **Finance** | Financial statements, KPIs, executive reporting | Dashboards, intelligence engine |
| **Inventory** | Stock levels, turnover, reorder signals | Intelligence engine, notifications/alerts |
| **Executive Dashboards & Reports** | Cross-module rollups, scheduled report generation | All modules' precomputed data |

The **pluggability test** (enforced in [Roadmap.md](Roadmap.md) Phase 6): adding the second module must require *zero changes* to Module 1's tables, workflows, or AI tools.

---

## 9. Milestones

| Milestone | Definition of done | Target |
|-----------|-------------------|--------|
| **M0 — Foundation approved** | This doc set approved; accounts provisioned; **OCR spike passed on 5 real reports** | Week 2 |
| **M1 — Ingestion + staging live** | Real report → OCR → clean → validate → **review** → publish; upload history, OCR logs, idempotent retries | Week 6 |
| **M2 — Intelligence engine + dashboards** | Daily auto-dashboard, product/country explorers, trends on real accumulated data | Week 9 |
| **M3 — AI assistant live** | All FR-7.2 intents answered correctly & grounded; chat history persisted | Week 12 |
| **M4 — Hardening & launch** | Notifications, exports, admin tooling, runbooks, 2 weeks stable daily operation | Week 15 |
| **M5 — Intelligence & alerts** | Price alerts, daily digest, advanced analytics, auto-publish | Quarter 2 |
| **M6 — Documents module (RAG)** | Second module proves pluggability; unified search | Quarter 3 |
| **M7 — SaaS multi-tenancy** | Tenant onboarding, isolation audit, billing | Quarter 4 |

Full phase breakdown with acceptance criteria: [Roadmap.md](Roadmap.md).

---

## 10. Decisions & Open Questions

### Resolved (2026-07-06)
| # | Decision |
|---|----------|
| D1 | **Reports are scanned images.** OCR is the critical risk — the Phase 0 Document AI spike is mandatory and must include a fallback plan (manual-entry grid) for poor scans. |
| D2 | **Multi-tenant SaaS is aspirational, not Phase 1.** Single org now; keep `organization_id` for readiness; no tenant management/billing/isolation built (NFR-6). |
| D3 | **AI chat runs in Xano** (not n8n) in Phase 1; n8n reserved for automation. WF7 documented as a future option only. |
| D4 | **Publish = write facts → recompute**, two idempotent steps (not one atomic multi-table transaction). Derived tables are rebuildable from `daily_prices`. |
| D5 | **Availability is derived, not a report field**: `price=NA`→not available, numeric→available; `price_raw` preserves the original imported value exactly. `price` is nullable. |

### Still open (resolve before / during Phase 0)
1. Are real sample scanned reports in hand *now* for the spike? *(Blocks M0.)*
2. Scan language: English-only or Arabic/English mixed? *(Document AI processor choice.)*
3. Single prices or ranges (min–max)? *(Confirms `price_min/max` usage.)*
4. Expected user count at launch? *(Bubble/Xano plan sizing.)*
5. Who owns the Google Cloud & OpenAI billing accounts?
