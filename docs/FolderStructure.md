# Company Brain — Repository & Workspace Structure

| | |
|---|---|
| **Document** | FolderStructure.md |
| **Version** | 1.0 |
| **Date** | 2026-07-06 |
| **Status** | Draft — pending approval |
| **Related docs** | [Architecture.md](Architecture.md) · [Workflow.md](Workflow.md) · [Bubble.md](Bubble.md) · [AI.md](AI.md) · [Roadmap.md](Roadmap.md) |

---

## 1. What lives where (low-code reality)

Bubble, Xano, and n8n hold the *running* system in their own clouds. The GitHub repository is therefore not the deployment artifact — it is the **system of record for everything those platforms cannot version well**: documentation, prompts, workflow exports, schema definitions, API contracts, test fixtures, and runbooks. The rule (NFR-8):

> **If it defines behavior and can be exported as text, it is committed to this repo. The platforms are the runtime; the repo is the memory.**

| Asset | Runtime home | Repo home | Sync discipline |
|---|---|---|---|
| Documentation | — | `/docs` | Source of truth here |
| DB schema | Xano | `/backend/schema` | Export on every schema change (PR) |
| API contracts | Xano | `/docs/API.md` + `/backend/api` | Contract changes land here **before** implementation |
| Xano functions logic | Xano | `/backend/functions` (pseudocode specs) | Updated with each function change |
| n8n workflows | n8n | `/automation/workflows` (JSON exports) | Export on every workflow change (PR) |
| AI prompts | n8n / Xano | `/ai/prompts` | **Authored here first**, then pasted/synced to runtime |
| Bubble app | Bubble | `/frontend` (specs, style guide, page inventory) | Bubble has native version control; repo keeps design specs |
| Credentials/keys | Platform vaults | **never in repo** | `.env.example` documents names only |

---

## 2. Repository tree

```
companybrain/
│
├── README.md                        # Project overview, quick links, onboarding path
├── CHANGELOG.md                     # Human-written, per-release notable changes
├── CONTRIBUTING.md                  # Branch/PR/commit conventions, review rules
├── .gitignore
├── .env.example                     # Names of every secret/config var, no values
│
├── docs/                            # ★ Single source of truth for design
│   ├── PRD.md
│   ├── Architecture.md
│   ├── Database.md
│   ├── Workflow.md                  # n8n workflow design (WF1–WF9 + shared subs)
│   ├── Bubble.md                    # Frontend pages, reusable components, responsive
│   ├── AI.md                        # AI architecture (intents, tools, anti-hallucination)
│   ├── Roadmap.md
│   ├── API.md
│   ├── FolderStructure.md
│   ├── decisions/                   # Architecture Decision Records
│   │   ├── ADR-000-template.md
│   │   ├── ADR-001-tech-stack.md
│   │   ├── ADR-002-function-calling-over-rag.md
│   │   └── ADR-003-staging-before-publish.md
│   └── runbooks/                    # Operational how-tos (Risk R10)
│       ├── daily-upload.md          # Admin SOP for the daily report
│       ├── failed-ingestion.md      # Triage & retry procedure
│       ├── ocr-template-change.md   # What to do when the report layout changes
│       ├── product-merge.md         # Deduplicating catalog entries
│       └── incident-response.md     # Who does what when the system is down
│
├── backend/                         # Xano system of record
│   ├── README.md                    # Xano workspace map: API groups, addons, env vars
│   ├── schema/                      # One file per table, mirrors Database.md
│   │   ├── organizations.json
│   │   ├── users.json
│   │   ├── products.json
│   │   ├── product_variants.json
│   │   ├── product_aliases.json
│   │   ├── countries.json
│   │   ├── shipment_types.json
│   │   ├── packing_types.json
│   │   ├── product_categories.json
│   │   ├── uploads.json
│   │   ├── upload_rows.json
│   │   ├── ocr_logs.json
│   │   ├── extraction_templates.json
│   │   ├── daily_prices.json
│   │   ├── price_history_daily.json
│   │   ├── product_latest_price.json
│   │   ├── market_summaries.json
│   │   ├── chat_sessions.json
│   │   ├── chat_messages.json
│   │   ├── notifications.json
│   │   ├── alert_rules.json
│   │   ├── ai_usage_log.json
│   │   └── audit_logs.json
│   ├── api/                         # Per-group endpoint inventories (mirror of API.md tables)
│   │   ├── auth.md
│   │   ├── uploads.md
│   │   ├── ingest.md
│   │   ├── catalog.md
│   │   ├── prices.md
│   │   ├── analytics.md
│   │   ├── chat.md
│   │   ├── notifications.md
│   │   └── admin.md
│   ├── functions/                   # Business-logic specs for complex Xano functions
│   │   ├── publish-and-recompute.md # Write facts (daily_prices) → recompute derived (idempotent)
│   │   ├── aggregate-upsert.md      # price_history_daily / latest cache maintenance
│   │   ├── anomaly-detection.md     # Flagging rules & thresholds
│   │   └── chat-orchestrator.md     # Tool registry, loop, grounding contract
│   └── seeds/                       # Reference data loaded at setup
│       ├── countries.csv
│       ├── shipment_types.csv
│       ├── packing_types.csv
│       ├── product_categories.csv
│       └── products_initial.csv     # Starter catalog + aliases from sample reports
│
├── automation/                      # n8n system of record
│   ├── README.md                    # Instance URL, credential names, import/export SOP
│   └── workflows/                   # JSON exports, committed on every change
│       ├── wf-1-ingestion-pipeline.json
│       ├── wf-2-aggregate-rebuild.json
│       ├── wf-3-alert-evaluation.json
│       └── wf-4-daily-digest.json           # Phase 5
│
├── ai/                              # ★ Prompts are code (NFR-8)
│   ├── README.md                    # Prompt versioning & release procedure
│   ├── prompts/
│   │   ├── normalization/
│   │   │   ├── v1-product-matching.md       # System+user template, model, params
│   │   │   └── CHANGELOG.md
│   │   └── chat/
│   │       ├── v1-tool-selection.md
│   │       ├── v1-answer-composer.md
│   │       ├── v1-refusal-policy.md
│   │       └── CHANGELOG.md
│   ├── tools/                       # Chat tool registry definitions (JSON schemas)
│   │   ├── get_current_price.json
│   │   ├── get_extreme_price.json
│   │   ├── compare_prices.json
│   │   ├── get_price_history.json
│   │   ├── list_products.json
│   │   └── get_market_summary.json
│   └── evals/                       # Regression suite for AI quality
│       ├── chat-eval-set.jsonl      # question → expected tool + expected answer facts
│       ├── normalization-eval-set.jsonl
│       └── results/                 # Dated eval run outputs
│
├── frontend/                        # Bubble system of record
│   ├── README.md                    # App URL, plugin list, Bubble version-control conventions
│   ├── pages.md                     # Page inventory ↔ Bubble.md cross-reference
│   ├── style-guide.md               # Colors, type scale, spacing, component states
│   ├── api-connector.md             # Bubble API Connector setup per endpoint
│   └── assets/                      # Logos, icons, product placeholder images
│
├── ocr/                             # Google Document AI system of record
│   ├── README.md                    # Processor ids, GCP project, training SOP
│   ├── templates/                   # Extraction template configs (mirror of extraction_templates)
│   │   └── dubai-fnv-v1.json
│   └── samples/                     # Anonymized sample reports for training/testing
│       ├── pdf/
│       └── xlsx/
│
├── testing/
│   ├── test-plan.md                 # Phase acceptance test matrix
│   ├── fixtures/                    # Golden files: sample report → expected extracted rows
│   │   ├── report-2026-07-06.pdf
│   │   └── report-2026-07-06.expected.json
│   └── postman/                     # API contract test collection
│       └── companybrain.postman_collection.json
│
└── scripts/                         # Small utilities (Node/Python) — the only "code" pre-SaaS
    ├── validate-schema-sync.md      # Checklist/script: Xano schema vs /backend/schema
    ├── seed-import.md               # Loading /backend/seeds into Xano
    └── eval-runner.md               # Running /ai/evals against staging
```

---

## 3. Rationale for key choices

- **`/docs/decisions` (ADRs)** — low-code projects lose "why" fastest. Every irreversible choice (stack, function-calling-over-RAG, staging gate) gets a one-page dated record so future contributors don't relitigate or accidentally reverse them.
- **`/ai` as a top-level citizen** — prompts, tool schemas, and eval sets determine product quality as much as code does. They get versioning, changelogs, and a regression suite exactly like code. New AI modules (documents, forecasting) add a subfolder under `prompts/` and `tools/` — nothing else moves (NFR-10).
- **`/backend/schema` mirrors [Database.md](Database.md)** — Database.md explains design intent; schema JSONs record exact current state. Drift between Xano and the repo is checked at each release (`scripts/validate-schema-sync`).
- **`/testing/fixtures` golden files** — the ingestion pipeline is the riskiest component (Risk R1). A frozen set of "this input file must produce these rows" pairs turns every extraction change into a verifiable regression test.
- **`/ocr/samples` anonymization note** — real market reports are commercially sensitive; committed samples must be cleared for repo storage or synthetically rebuilt.
- **Module growth pattern** — a future module (e.g. Documents) adds: `docs/modules/documents.md`, `backend/schema/document_*.json`, `automation/workflows/wf-5-doc-ingestion.json`, `ai/prompts/documents/`, `ai/tools/search_documents.json`, `frontend/pages.md` entries. No existing folder changes shape — the structure scales by addition, not modification.

---

## 4. Branch & PR conventions (summary; full rules in CONTRIBUTING.md)

- `main` is always releasable documentation + exports matching production runtime.
- Branches: `feat/<phase>-<topic>`, `fix/<topic>`, `docs/<topic>`.
- Any change to `/docs/API.md`, `/backend/schema`, or `/ai/prompts` requires PR review — these are the platform's contracts.
- Runtime changes (Xano/n8n/Bubble) and their repo exports land in the **same PR** so the repo never lies about production.
