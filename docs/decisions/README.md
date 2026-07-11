# Architecture Decision Records (ADRs)

One-page records of non-trivial, hard-to-reverse decisions. Copy [ADR-000-template.md](ADR-000-template.md) for new ones. If implementation reveals a better approach, **write a new ADR with the trade-offs before changing course** — never silently reverse a prior decision (per [CONTRIBUTING.md](../../CONTRIBUTING.md)).

| ADR | Decision | Status |
|-----|----------|--------|
| [001](ADR-001-nocode-stack.md) | No-code-first stack (Bubble/Xano/n8n/Document AI/OpenAI/Drive) | Accepted |
| [002](ADR-002-tools-over-rag-for-prices.md) | Function/tool calling, not RAG, for price answers | Accepted |
| [003](ADR-003-staging-before-publish.md) | Staging gate — OCR/AI output reviewed before publish | Accepted |
| [004](ADR-004-chat-orchestration-in-xano.md) | AI chat orchestration in Xano (Phase 1), not n8n | Accepted |
| [005](ADR-005-write-facts-then-recompute.md) | Publish = write facts → recompute (not atomic multi-table) | Accepted |
| [006](ADR-006-availability-derived.md) | Availability derived from price, not a stored field | Accepted |
| [007](ADR-007-scanned-image-ocr.md) | Scanned-image OCR is the primary risk; Phase 0 spike + fallback | Accepted |
| [008](ADR-008-single-tenant-first.md) | Build single-tenant, architect for multi-tenant | Accepted |
| [009](ADR-009-cli-usage-policy.md) | Official CLIs for provisioning/ops only, never business logic | Accepted |

ADRs 004–008 correspond to decisions D3, D4, D5, D1, D2 confirmed by the product owner on 2026-07-06 (see [PRD.md](../PRD.md) §10).
