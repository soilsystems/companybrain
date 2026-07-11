# Legacy File Inventory

Inventory created before repository cleanup on 2026-07-11. `ARCHITECTURE.md`
version 2.0 is the active full-code baseline and takes precedence over legacy
no-code documents.

| Path | Purpose | Classification | Action | Reason |
| ---- | ------- | -------------- | ------ | ------ |
| `.env.example` | Legacy no-code environment variable names | obsolete no-code config | adapt | Replace with full-code-safe variable names only. |
| `.gitignore` | Secret/build ignore rules | reusable repository hygiene | adapt | Keep and expand for full-code monorepo outputs and sensitive OCR files. |
| `AGENTS.md` | Codex working instructions | reusable architecture guardrails | adapt | Already names full-code architecture but still references files not present. |
| `ARCHITECTURE.md` | Approved full-code architecture | reusable architecture concepts | keep | Current source of truth. |
| `CONTRIBUTING.md` | Legacy no-code contribution policy | obsolete no-code restriction | move to legacy | Preserves historical process but must not govern full-code development. |
| `PROJECT_HANDOFF.md` | Legacy no-code handoff | obsolete no-code restriction | move to legacy | Contradicts approved full-code architecture. |
| `README.md` | Legacy no-code repo entry point | obsolete no-code restriction | adapt | Replace with full-code foundation README. |
| `ai/evals/results/.gitkeep` | Placeholder directory | duplicate scaffolding | delete | New structure uses `ai/evals/` without generated-results placeholder. |
| `ai/prompts/chat/.gitkeep` | Placeholder directory | duplicate scaffolding | delete | Replaced by current prompts directory structure. |
| `ai/prompts/normalization/.gitkeep` | Placeholder directory | duplicate scaffolding | delete | Normalization prompts are not implemented in Phase 1 foundation. |
| `ai/tools/.gitkeep` | Placeholder directory | duplicate scaffolding | delete | Directory kept by real files as needed later. |
| `automation/workflows/.gitkeep` | n8n workflow export placeholder | obsolete n8n core-runtime material | delete | n8n is no longer the trusted runtime. |
| `backend/api/.gitkeep` | Xano API export placeholder | obsolete Xano material | delete | Backend now lives in `apps/api`. |
| `backend/functions/.gitkeep` | Xano functions export placeholder | obsolete Xano material | delete | Replaced by FastAPI/application services. |
| `backend/schema/.gitkeep` | Xano schema export placeholder | obsolete Xano material | delete | Replaced by Alembic migrations. |
| `backend/seeds/*.csv` | Market reference and catalog seed data | reusable seed data | adapt | Migrated to `database/seeds/market/`. |
| `backend/seeds/README.md` | Legacy Xano seed loading notes | reusable seed context with obsolete details | adapt | Replaced with `database/seeds/README.md`. |
| `docs/AI.md` | Legacy AI/tool-calling design | reusable business requirements with no-code implementation | move to legacy | Preserve historical detail; active AI docs will be rebuilt later. |
| `docs/API.md` | Legacy Xano API contracts | reusable product/API concepts with obsolete implementation | move to legacy | Preserve endpoint intent but remove from active guidance. |
| `docs/Architecture.md` | Legacy no-code architecture | obsolete Bubble/Xano/n8n architecture | move to legacy | Superseded by root `ARCHITECTURE.md`. |
| `docs/Bubble.md` | Bubble UI implementation spec | obsolete Bubble material | move to legacy | Frontend is now Next.js. |
| `docs/Database.md` | Legacy Xano database design | reusable market data concepts with obsolete implementation | move to legacy | Preserve market concepts; active schema uses Alembic. |
| `docs/FolderStructure.md` | Legacy no-code repo layout | obsolete no-code restriction | move to legacy | Replaced by `docs/architecture/REPOSITORY_STRUCTURE.md`. |
| `docs/PRD.md` | Product requirements with no-code constraint | reusable business requirements | move to legacy | Business goals are preserved in roadmap and architecture docs. |
| `docs/Phase0-Report.md` | Legacy no-code phase report | reusable OCR risk context | move to legacy | OCR risk remains useful; no-code phase gates are superseded. |
| `docs/Roadmap.md` | Legacy no-code roadmap | reusable business sequencing with obsolete stack | move to legacy | Replaced by `docs/ROADMAP_FULL_CODE.md`. |
| `docs/Workflow.md` | n8n workflow implementation | obsolete n8n core-runtime material | move to legacy | n8n no longer trusted core runtime. |
| `docs/decisions/ADR-000-template.md` | ADR template | reusable documentation | keep | Still useful. |
| `docs/decisions/ADR-001-nocode-stack.md` | No-code stack decision | obsolete Bubble/Xano/n8n decision | move to legacy | Superseded by full-code architecture. |
| `docs/decisions/ADR-002-tools-over-rag-for-prices.md` | Tool-calling for structured price facts | reusable architecture concept | keep | Still valid when generalized from Xano to FastAPI. |
| `docs/decisions/ADR-003-staging-before-publish.md` | OCR staging gate | reusable business/data quality concept | keep | Still valid for future market ingestion. |
| `docs/decisions/ADR-004-chat-orchestration-in-xano.md` | Xano chat orchestration | obsolete Xano material | move to legacy | Superseded by FastAPI orchestration boundary. |
| `docs/decisions/ADR-005-write-facts-then-recompute.md` | Append facts then recompute | reusable market data concept | keep | Still useful for append-only market history. |
| `docs/decisions/ADR-006-availability-derived.md` | Availability derived from price | reusable domain concept | keep | Still valid. |
| `docs/decisions/ADR-007-scanned-image-ocr.md` | OCR spike risk decision | reusable OCR material | keep | Still valid. |
| `docs/decisions/ADR-008-single-tenant-first.md` | Single-tenant-first posture | obsolete with new multi-tenant objective | move to legacy | New foundation is multi-tenant from start. |
| `docs/decisions/ADR-009-cli-usage-policy.md` | CLI-only ops in no-code stack | obsolete no-code scripts policy | move to legacy | Superseded by full-code tooling. |
| `docs/decisions/README.md` | ADR index | duplicate/obsolete index | adapt | Update to active/superseded ADR status. |
| `docs/runbooks/phase0-provisioning.md` | Legacy platform provisioning | obsolete no-code scripts/runbook | move to legacy | Replaced by local full-code setup runbook. |
| `frontend/assets/.gitkeep` | Bubble assets placeholder | obsolete Bubble material | delete | Replaced by `apps/web`. |
| `ocr/README.md` | OCR spike methodology | reusable OCR material | keep | Useful for future Document AI evaluation. |
| `ocr/samples/pdf/.gitkeep` | Empty sensitive sample placeholder | generated/empty placeholder | delete | New ignore rules protect local samples. |
| `ocr/samples/xlsx/.gitkeep` | Empty sample placeholder | generated/empty placeholder | delete | New ignore rules protect local samples. |
| `ocr/spike/results/.gitkeep` | Empty OCR results placeholder | generated/empty placeholder | delete | OCR raw/results should remain local unless anonymized. |
| `ocr/spike/scorecard-template.md` | OCR scorecard template | reusable OCR material | keep | Useful for future Document AI evaluation. |
| `ocr/templates/dubai-fnv-v1.json` | Document AI extraction template | reusable OCR material | keep | Useful for future market ingestion. |
| `scripts/README.md` | Legacy no-code script policy | obsolete no-code scripts | move to legacy | Replaced by full-code scripts. |
| `scripts/export-n8n-workflows.sh` | n8n export helper | obsolete no-code scripts | delete | n8n is no longer a core runtime. |
| `scripts/export-xano-schema.sh` | Xano schema export helper | obsolete no-code scripts | delete | Alembic replaces Xano schema exports. |
| `scripts/provision-gcp.sh` | GCP provisioning helper | reusable provisioning context | move to legacy | Document AI setup details preserved for later. |
| `testing/fixtures/README.md` | Fixture methodology | reusable tests or fixtures | keep | Useful for later OCR regression tests. |
| `testing/fixtures/report-sample.expected.template.json` | OCR expected-output template | reusable tests or fixtures | keep | Useful fixture template for later ingestion. |
| `testing/postman/.gitkeep` | Postman placeholder | duplicate scaffolding | delete | Backend tests now use pytest/httpx. |

