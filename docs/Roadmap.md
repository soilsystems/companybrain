# Company Brain — Development Roadmap

| | |
|---|---|
| **Document** | Roadmap.md |
| **Version** | 1.0 |
| **Status** | Draft — pending approval |
| **Related** | [PRD.md](PRD.md) · [Architecture.md](Architecture.md) · [Workflow.md](Workflow.md) · [Database.md](Database.md) · [AI.md](AI.md) · [Bubble.md](Bubble.md) |

Complexity: **S** (days) · **M** (~1 wk) · **L** (1–2 wk) · **XL** (2–4 wk), assuming one no-code builder + part-time product owner. Phases are **strictly gated** — a phase starts only when its dependencies' acceptance criteria pass.

```
P0 Foundation ─► P1 Ingestion+Staging ─► P2 Intelligence+Dashboards ─► P3 AI Assistant ─► P4 Hardening/Launch
                                                                                              │
                                        P5 Intelligence & Alerts ◄────────────────────────────┘
                                        P6 Documents Module (RAG, pluggability proof)
                                        P7 SaaS Multi-tenancy
```

---

## Phase 0 — Foundation & De-risking (Weeks 1–2)

**Objective:** Approve the architecture, provision the no-code stack, and **prove the riskiest assumption — Document AI accuracy on the real report — before building UI.**

**Deliverables**
1. This doc set approved; ADRs recorded (`/docs/decisions`).
2. Accounts/environments: Xano (dev+prod), Bubble (dev+live), n8n, Google Cloud (Document AI), Drive folder tree, OpenAI (budget alert), GitHub repo.
3. Security baseline: Xano service token, webhook HMAC secret, n8n credential vault, `.env.example`.
4. **OCR spike (critical path — reports are scanned images, highest risk):** 5+ real scanned reports through a Document AI custom extractor; measured field accuracy committed to `/ocr/README.md`; go/no-go on processor type; **mandatory fallback plan** (manual-entry grid) documented for poor scans.
5. Seed reference data (countries, shipment/packing types, categories) + starter product/variant/alias catalog mined from samples.
6. Golden fixtures: 2 sample reports with hand-verified expected rows (`/testing/fixtures`).

**Dependencies:** real sample reports from the business (*blocking*, PRD Open Q1).
**Complexity:** M.
**Acceptance criteria**
- [ ] Docs approved & merged.
- [ ] OCR spike ≥ 90% raw field accuracy pre-normalization, or a documented fallback (Excel-first / manual grid).
- [ ] End-to-end hello-world: n8n → Document AI → Xano round trip works with real credentials.
- [ ] Seeds load into Xano dev cleanly.

---

## Phase 1 — Ingestion Pipeline + Staging (Weeks 3–6)

**Objective:** A real daily report goes upload → OCR → clean → validate → **review** → publish, into append-only history. The data asset starts compounding now.

**Deliverables**
1. Xano: full schema ([Database.md](Database.md)) incl. reserved tables; auth + roles.
2. Xano APIs: `/auth`, `/uploads`, `/ingest`, `/catalog` ([API.md](API.md)).
3. n8n **WF1–WF5** + shared sub-workflows ([Workflow.md](Workflow.md)): upload→OCR→cleaning→validation→publish, idempotent, with OCR logs and error handling.
4. Publish transaction in Xano (staging → `daily_prices` + latest cache + history aggregate; duplicate-day guard; replace flow).
5. Bubble: Login, Upload, Upload Detail (stepper + OCR log), Review & Publish grid, Upload History ([Bubble.md](Bubble.md) §§4.1, 4.3).
6. Minimal notifications (WF9 in-app): review-pending, published, failed.
7. Runbooks: daily-upload SOP, failed-ingestion triage.

**Dependencies:** Phase 0 (OCR go decision, seeds).
**Complexity:** XL (hardest phase — OCR post-processing + review UX).
**Acceptance criteria**
- [ ] Golden fixtures pass: both reports produce expected staged rows (automated compare).
- [ ] Real report → review-ready in < 5 min (NFR-2).
- [ ] Duplicate-day blocked; replace archives old rows + audited.
- [ ] Kill n8n mid-run → retry → **no duplicate rows** (idempotency).
- [ ] Unknown product → flagged → confirmed in review → alias created → **auto-resolves next upload**.
- [ ] Viewer JWT on upload endpoints → 403 (server-side enforcement).
- [ ] **Exit gate: 5 consecutive real reports published by the actual admin with no developer help.**

---

## Phase 2 — Market Intelligence Engine + Dashboards (Weeks 7–9)

**Objective:** Accumulated data becomes the auto-generated daily dashboard and explorers — all reads from precomputed intelligence.

**Deliverables**
1. **Market Intelligence Engine** Xano functions (averages, most/least expensive, gainers/losers, **missing products**, country/shipment/availability distributions, trends, outliers) → `market_summaries` + aggregates.
2. n8n **WF6** (recompute on publish + nightly self-healing rebuild).
3. Xano APIs: `/prices`, `/analytics` (read precomputed tables only).
4. Bubble: Dashboard (auto daily), Product Explorer, Country Explorer, Reports (Trends/Compare/Market Structure), Product Detail, Settings (Users, Catalog/reference, merge), Export.

**Dependencies:** Phase 1 (needs real published history; ideally 3–4 weeks accumulated).
**Complexity:** L.
**Acceptance criteria**
- [ ] Dashboard load < 3 s on real data; re-verified with 100K synthetic fact rows (NFR-1 evidence).
- [ ] Every dashboard card maps to a `market_summaries` field (no fact-table scan) — verified in network tab.
- [ ] Trend chart matches hand-checked values for 3 products × 30 days.
- [ ] Missing-products list correct vs a seeded absence.
- [ ] Product merge repoints history + reflects immediately in charts.
- [ ] Every number traceable to fact → upload → Drive file via UI clicks; Viewer sees no admin affordances.

---

## Phase 3 — AI Assistant (Weeks 10–12)

**Objective:** Natural-language access, grounded, from the database only.

**Deliverables**
1. Chat orchestrator **in Xano** (not n8n — WF7 is future-only): tool registry (6 launch tools), function-calling loop, grounded composer, clarify/refuse, per-turn usage logging ([AI.md](AI.md)).
2. Tool schemas + prompts versioned (`/ai/tools`, `/ai/prompts`).
3. Eval suite ≥ 60 Q/expected pairs across all FR-7.2 intents + ambiguity + out-of-scope (`/ai/evals`).
4. Xano `/chat` API; chat history persistence.
5. Bubble Chat screen (sessions, bubbles, inline charts, suggestions, feedback, deep-links to Reports).
6. Rate limiting + timeout handling.

**Dependencies:** Phase 2 (tools read the same precomputed tables).
**Complexity:** L.
**Acceptance criteria**
- [ ] Eval ≥ 90% on tool selection + factual correctness; **100% on "never invent a number"** (spot-audited).
- [ ] All PRD example questions answered correctly on live data.
- [ ] Ambiguity → clarify; out-of-scope → refuse (0 hallucinated answers in 20 adversarial probes).
- [ ] Median answer ≤ 8 s; p95 ≤ 15 s.
- [ ] History persists; feedback recorded; per-conversation token cost visible in `ai_usage_log`.

---

## Phase 4 — Hardening & Launch (Weeks 13–15)

**Objective:** Runs as a daily business tool without developer supervision.

**Deliverables**
1. Full notifications (anomaly-on-publish, review nudges); **WF8 daily insight** narrative + digest + missing-report detection.
2. Admin Panel (usage, audit, OCR logs, pipeline health).
3. Ops: backup/restore drill (Xano snapshot + Drive + GitHub = full recovery), incident runbook, monthly cost report.
4. Retention/housekeeping jobs (WF9): chat purge, notification purge, archive retries.
5. Load & failure drills: 100K-row test on prod plan; Document AI outage simulation → clean failure + retry.
6. Security pass: endpoint role-matrix audit; webhook signature test; secret rotation drill.
7. Persona onboarding/training; runbooks finalized.

**Dependencies:** Phases 1–3.
**Complexity:** M.
**Acceptance criteria**
- [ ] **2 consecutive weeks of daily operation, zero developer interventions.**
- [ ] Restore drill rebuilds dev from backups in < 4 h, data intact.
- [ ] Security checklist signed off (all NFR-5).
- [ ] All four launch personas active (login analytics prove it).
- [ ] Monthly run cost known and within budget.

🏁 **PRD Milestone M4 — Production launch of Module 1.**

---

## Phase 5 — Intelligence & Alerts (Quarter 2)

**Objective:** From "look up" to "be told."

**Deliverables**
1. User price-alert rules (`alert_rules` activates; CRUD UI; WF evaluates on publish, debounced per date).
2. Email channel (WF9): critical notifications + password flows via transactional provider.
3. Daily digest email/WhatsApp (top movers, anomalies, missing, watchlist).
4. Advanced analytics: volatility bands, month-over-month seasonality heatmap, multi-product compare.
5. Auto-publish mode (FR-2.8) after ≥ 4 weeks of ≥ 99% clean extraction, with a documented rollback switch.

**Dependencies:** Phase 4 launched; ≥ 2 months history for seasonality.
**Complexity:** L.
**Acceptance criteria**
- [ ] Alert fires within 5 min of publish when matched; never twice per report date.
- [ ] Digest delivered ≥ 95% of days over a 3-week trial.
- [ ] Auto-publish reverts to staging automatically on any anomaly.

---

## Phase 6 — Documents Module (RAG) — pluggability proof (Quarter 3)

**Objective:** A second knowledge domain plugs into the same core with **zero regression** to Module 1.

**Deliverables**
1. Module blueprint ([Architecture.md](Architecture.md) §10): `documents`/`document_chunks` tables, `/api/documents`, n8n doc-ingestion WF (Drive watch → extract → chunk → embed), vector store (ADR: pgvector vs external).
2. New chat tool `search_documents` in the existing registry; answers cite document + section.
3. Unified top-bar search (products + documents).
4. Bubble Documents page mounted into the shell's module slot.

**Dependencies:** Phase 4; vector-storage ADR.
**Complexity:** XL.
**Acceptance criteria**
- [ ] Policy PDF uploaded → asked in chat → correct cited answer.
- [ ] **Zero changes to market-module tables/workflows/tools (the pluggability test, NFR-7).**
- [ ] Market chat eval still ≥ 90% (no regression from registry growth).
- [ ] Documents respect role visibility.

---

## Phase 7 — SaaS Multi-tenancy (Quarter 4) — *aspirational*

**Objective:** Open the platform to external tenant companies. **This phase is aspirational and deliberately deferred** — Phases 1–4 serve a single organization. Nothing here is built earlier; the only Phase 1 obligation is to *not preclude* it (keep `organization_id`, avoid hardcoded org logic).

**Deliverables**
1. Tenant onboarding: org creation, per-org markets/extraction templates, org-scoped seeds, tenant-admin role.
2. Isolation audit suite: proves no endpoint leaks cross-org data (the NFR-6 payoff), run in CI on every schema/API change.
3. Billing: plans, usage metering (uploads, chat, AI cost per org from `ai_usage_log`), payment, plan-limit middleware in Xano.
4. Platform-owner console: tenant list, health, cross-org ingestion monitoring.
5. Scale prep: warehouse-sync escape hatch if facts > 5M rows ([Architecture.md](Architecture.md) §10.3); Bubble white-label vs custom-frontend ADR.

**Dependencies:** Phase 6 (two-module product is sellable); commercial/legal readiness.
**Complexity:** XL.
**Acceptance criteria**
- [ ] Pilot external tenant onboarded end-to-end (own template + catalog) in < 1 day.
- [ ] Cross-tenant isolation suite 100% pass in CI.
- [ ] Billing accuracy verified vs metered usage for one full cycle.
- [ ] Support runbook + SLA published.

---

## Continuous Tracks (all phases)

| Track | Cadence | Practice |
|-------|---------|----------|
| Repo discipline | every change | Runtime change + export (Xano schema / n8n JSON / AI config) in the same PR (NFR-8) |
| AI evals | every prompt/model change | Full eval run; results committed to `/ai/evals/results` |
| Golden fixtures | every extraction change | Fixture suite must pass before deploy |
| Cost review | monthly | `ai_usage_log` rollup vs budget; model-tier tuning |
| Data-quality audit | weekly (P1–P4) then monthly | Sample 20 published rows vs source file |
| Workflow hygiene | phase boundaries | No duplicated logic; shared sub-workflows only ([Workflow.md](Workflow.md) §0) |
