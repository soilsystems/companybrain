# ADR-001: No-code-first stack (Bubble · Xano · n8n · Document AI · OpenAI · Drive)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-06 |
| **Deciders** | Product owner, Architect |
| **Phase** | 0 |

## Context
Company Brain must ship a working, production-grade Market Intelligence product quickly, be maintainable by a small non-traditional-engineering team, and grow into a multi-module SaaS. A hand-coded stack (custom frontend + backend + infra) would maximize control but demand ongoing engineering capacity we do not want to commit, and slow the first release.

## Options considered
1. **Full-code** (e.g. Next.js + Node/FastAPI + Postgres + cloud infra). Max flexibility; high build/maintenance cost; wrong fit for the team.
2. **No-code-first** (Bubble UI, Xano backend/DB/API, n8n automation, Google Document AI OCR, OpenAI, Google Drive storage). Fast, maintainable, API-first; platform-dependent.
3. **Hybrid** (no-code UI + custom backend). Splits the stack without removing code-maintenance burden.

## Decision
**No-code-first (Option 2).** Every capability is delivered on the approved managed platforms. No custom backend/frontend code is introduced without an explicit, ADR-recorded approval.

## Consequences
- Positive: fast delivery; low maintenance; visual/debuggable workflows; small team can own it; API-first design keeps components swappable.
- Negative / trade-offs: platform limits (Xano query ceilings, Bubble performance) and vendor lock-in. Mitigated by the **only-Xano-touches-the-DB** rule, exported schema/workflows in GitHub, and documented scale-out escape hatches ([Architecture.md](../Architecture.md) §10.3).
- Revisit if: a hard platform ceiling is hit (then use an escape hatch, not a rewrite).

## References
[PRD.md](../PRD.md) build constraint · [Architecture.md](../Architecture.md) §§1–2
