# Company Brain — AI Architecture

| | |
|---|---|
| **Document** | AI.md |
| **Version** | 1.0 |
| **Status** | Draft — pending approval |
| **Scope** | Design only — **no prompts** (prompts are authored & versioned in `/ai/prompts`). |
| **Related** | [Architecture.md](Architecture.md) · [Workflow.md](Workflow.md) · [Database.md](Database.md) · [API.md](API.md) |

> **The one rule that governs every AI decision here:** *AI proposes, the database disposes.* The LLM classifies, normalizes, selects queries, and phrases answers. It **never authors a fact or a number.** Every price a user sees comes from a Xano query result. **RAG is not used for price data** — prices are structured and exact, so we use **tool/function calling** against the database. RAG is reserved for the future Documents module only.

---

## 1. AI Subsystems Overview

| Subsystem | Where | Purpose | Fact authority |
|-----------|-------|---------|----------------|
| **Ingestion AI** (normalization) | n8n WF3 | Map messy OCR text → canonical products/variants/countries | Suggests only; humans confirm; **cannot create data** |
| **Chat AI** (query engine) | **Xano `/chat` (Phase 1)** | Answer NL questions from the database via tools | Selects queries; **numbers come from the DB** |
| **Insight AI** (narration) | n8n WF8 | Narrate the precomputed daily summary | Narrates precomputed numbers; **invents nothing** |
| **Document AI** (future RAG) | future module | Search company documents | Cites document passages; separate from prices |

The three current subsystems share only the OpenAI account and the anti-hallucination discipline (§8). Model tiers are a config policy (§9), not hardcoded.

---

## 2. Ingestion AI — Normalization (WF3)

**Goal:** resolve raw report strings to the canonical product system — cheaply and self-improvingly.

**Rules first, LLM last:**
```
raw row → RULE PASS (deterministic, free):
            exact + fuzzy match vs product_aliases; country/shipment/packing synonyms;
            weight/packing/price parsing (price_raw preserved; NA→price null; is_available derived)
        → resolved? yes → done (no LLM)
                     no  → LLM PASS (batched, one call per report for all leftovers):
                            map raw name → {product_id, variant_id} | NEW  + confidence
        → NEW or low confidence → flagged for human review (never auto-created)
```
- **Batched** (all unresolved rows in one call) → flat cost/latency per report.
- **Learning loop:** confirming a `NEW`/mapping in the review screen writes a `product_aliases` row, so the same raw string resolves by rules next time. The unresolved-row rate trends toward zero (a tracked success metric).
- **Cost control:** as aliases accumulate, the LLM pass shrinks to near-zero rows. Usage logged to `ai_usage_log`.
- **Never a fact author:** the LLM output lands in **staging** with a status; only human-approved rows publish.

---

## 3. Chat AI — Design

### 3.1 Intent Detection
The model performs intent detection *implicitly* via **tool selection** — it reads the user message (+ conversation context) and the tool registry, then chooses the tool(s) and arguments. We do **not** maintain a brittle separate classifier; the supported "intents" are exactly the registered tools:

| Intent | Tool | Example question |
|--------|------|------------------|
| Current price | `get_current_price(product, variant?, country?, shipment?)` | "What is today's tomato price?" |
| History / trend | `get_price_history(product, range, variant?, country?, granularity?)` | "Show onion prices for the last 30 days" |
| Compare | `compare_prices(product, dimension: country\|shipment, values[])` | "Compare Pakistan and India potatoes" |
| Extremes / ranking | `get_extreme_price(scope, direction, date?, category?)` | "Cheapest onion", "most expensive vegetables" |
| Movers | `get_market_summary(date?, section: gainers\|losers\|missing\|distribution)` | "Which products increased the most today?" |
| List / filter | `list_products(filters: country?, shipment?, availability?, category?, price_op?)` | "Show Air shipment products", "Show UAE products" |
| Aggregate | `get_price_history(..., aggregate: avg\|min\|max)` or `get_market_summary` | "Average onion price this month" |

The registry is a **config table** (name, JSON-schema args, backing Xano query). Adding a capability = adding a row, not editing the orchestrator (pluggability, NFR-7).

### 3.2 Database Query Strategy
- Every tool maps to a **parameterized, org-scoped Xano query** against **precomputed tables** — `product_latest_price` (current), `price_history_daily` (trends/aggregates), `market_summaries` (movers/distributions/missing). The fact table is touched only for single-row drill-downs.
- Arguments are validated against the tool's JSON schema before the query runs; unknown products are resolved through the same alias table used in ingestion.
- Queries are **read-only**, paginated/bounded, and never accept `organization_id` from the model — Xano injects it from the authenticated user.
- Result sets are compact (the numbers + labels the composer needs), keeping the second LLM call cheap and focused.

### 3.3 Response Formatting
Two-call pattern (Architecture §7.2): call #1 selects tools; call #2 **composes the answer from tool results only**. The composer must:
- State the figure(s) plainly and **cite the report date** ("Based on the report of 6 Jul 2026…").
- Prefer a short direct answer; add a one-line comparison/insight when the data supports it.
- Return a machine-readable **`chart_spec`** when the answer is a trend or comparison (Bubble renders it inline).
- Attach **`sources`** (`report_date`, `upload_id`) for click-through.
- Never include a number that is not present in the tool results (auditable property, §8).

### 3.4 Chart Generation Logic
The **orchestrator**, not the model's free text, decides charts, from the tool used:
| Tool result | Chart | Notes |
|-------------|-------|-------|
| `get_price_history` | line + min–max band | granularity from range (day/week/month) |
| `compare_prices` (country/shipment) | grouped bar | one bar per value |
| `get_market_summary` distributions | donut/bar | country/shipment/availability |
| single current price | none (or a KPI) | text is enough |
`chart_spec` is a small JSON the Bubble chart components consume; the same series can deep-link to the Reports page with filters applied. Charts are always paired with the underlying values (trust + accessibility).

---

## 4. Market Insight Generation (WF8)
The **Insight AI narrates, it does not compute.** WF8 reads the already-computed `market_summaries` row (produced by the Market Intelligence Engine) and asks the model to phrase a short morning narrative — headline change, top mover, notable outliers, missing products. Because the model receives only precomputed figures and must reference them, it cannot invent trends. If narration fails, the numeric digest still ships (narrative is enhancement, not dependency). This keeps the dashboard number and the AI's spoken number identical (single source — the engine).

---

## 5. Future — Document Search (RAG, separate module)
When the Documents module lands (Phase 6), and **only** there:
- Ingestion: n8n workflow watches Drive → extracts text → chunks → embeds → stores vectors (pgvector in Xano or an external vector store behind the API).
- A new tool **`search_documents(query, filters?)`** is registered in the *same* chat registry; it returns passages + citations.
- The chat orchestrator is unchanged — it simply gains one more tool. Price tools stay tool-calling (exact); document tool is RAG (fuzzy). The two never mix: a price question routes to price tools, a knowledge question to `search_documents`.
- This is the concrete proof of the pluggable-AI design (NFR-7).

---

## 6. Future — Multi-Agent Support
The current single-orchestrator + tools design is the foundation for later multi-agent work without redesign:
- **Router agent** classifies a request across modules (market vs documents vs sales) and dispatches to a specialist agent, each owning its tool subset.
- **Specialist agents** (Market Analyst, Document Researcher, Report Writer) share the same tool-registry mechanism and grounding contract.
- **Planner/executor** for multi-step tasks ("compare this month vs last, then draft a summary") — a planner sequences tool calls; the executor runs them; the composer writes the result.
- Guardrails are unchanged: every agent's facts still come from tools/queries; agents cannot author data. Multi-agent adds *coordination*, not *new fact authority*.

We deliberately do **not** build this in Phase 1 — one orchestrator with a clean tool registry is simpler and sufficient. The registry is the seam that makes agents additive later.

---

## 7. Conversation Context & Memory
- **Short-term:** the last N turns of the session are passed to call #1 so follow-ups resolve ("and in Pakistan?" → reuses the prior product). Stored in `chat_messages`.
- **No long-term price "memory":** the model never remembers prices between sessions — it re-queries every time, guaranteeing freshness and preventing stale/hallucinated recall.
- **Feedback loop:** 👍/👎 (`chat_messages.feedback`) + logged `tool_calls` feed the eval set (`/ai/evals`) and prompt iteration.

---

## 8. How Hallucination Is Prevented (the core guarantee)

Multiple independent barriers — defense in depth:

1. **No free-form facts reach the model.** The composer's input is *only* the JSON results of database queries. There is no document, no "context blob", no model-memory path for a price to come from.
2. **Tool calling, not generation, for numbers.** The model chooses *which query*; Xano produces the number. The model cannot fabricate a value it never generates.
3. **Schema-validated arguments.** Tool args are validated before querying; an ill-formed request fails closed (clarify), not into a guess.
4. **Empty-result honesty.** If a query returns nothing, the composer must say "no data for X" — it is instructed and structurally unable to fill the gap with a number.
5. **Clarify over guess.** Ambiguous product/date → the model returns a `clarify` action with options; no query runs on a guess.
6. **Refuse over improvise.** Out-of-scope intents (weather, opinions, future prediction pre-forecasting) → graceful `refused` listing real capabilities.
7. **Mandatory citation.** Every numeric answer carries `sources` (report date + upload) — spot-audited so "every number traces to a row" is *verifiable*, not just claimed (Success Metric).
8. **Ingestion gate.** On the ingestion side, LLM normalization output is quarantined in staging and human-approved before it can ever be queried — so the AI can't even poison the data it later reads.
9. **Grounded narration.** Insight AI (WF8) receives only precomputed summary figures and must reference them.
10. **Eval regression suite.** A standing question→expected-fact set (`/ai/evals`) runs on every prompt/model change; the "never invent a number" property is an explicit, gating test.

Net effect: the worst failure mode is *"I don't have that data"* or *"could you clarify?"* — never a confident wrong price.

---

## 9. Model & Cost Policy (config, not hardcoded)
- **Tiered by task:** cheap/fast model for tool selection and normalization; step up only if eval accuracy demands it. Model ids live in config (`ai_usage_log.model`, prompt front-matter), swappable without workflow edits.
- **Batching:** normalization batches all unresolved rows per report; chat uses compact result sets.
- **Rules-first:** the ingestion rule pass keeps most rows off the LLM entirely.
- **Observability:** every call logs model, prompt version, tokens, cost, latency (`ai_usage_log`) → the Admin cost dashboard; budget alerts on the OpenAI account.
- **Prompt governance:** prompts are versioned in `/ai/prompts` with changelogs; a prompt change is a reviewed PR and triggers an eval run (NFR-8).
