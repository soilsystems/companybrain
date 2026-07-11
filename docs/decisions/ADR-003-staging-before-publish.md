# ADR-003: Staging gate — OCR/AI output is never published without review

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-06 |
| **Deciders** | Product owner, Architect |
| **Phase** | 0 (implemented Phase 1) |

## Context
Reports are **scanned images** run through OCR + AI normalization — both imperfect. Published data must be ≥ 98% accurate and is the basis for buying decisions and every AI answer. Bad data entering history silently would be corrosive and hard to unwind (history is append-only).

## Options considered
1. **Auto-publish OCR output** — fastest; unacceptable accuracy/trust risk on scanned inputs.
2. **Staging + human review gate** — extracted rows land in `upload_rows` with per-row validation status; an admin reviews/edits/approves; only approved rows publish to `daily_prices`.
3. **Auto-publish with post-hoc correction** — publishes errors, fixes later; pollutes history and downstream aggregates.

## Decision
**Staging + human review gate (Option 2).** OCR/AI results never enter production directly. Validation pre-triages rows (ok/warning/error) so review is fast. An optional auto-publish mode is deferred to Phase 5 and only unlocks after sustained ≥ 99% clean extraction, with automatic fallback to staging on any anomaly.

## Consequences
- Positive: guarantees the accuracy NFR; creates the alias learning loop (confirming a new product teaches the system); keeps history clean and append-only.
- Negative / trade-offs: a daily human step (~10 min). Accepted — it is the trust backbone; minimized by good review UX and pre-triage.
- Revisit: auto-publish (Phase 5) once extraction quality is proven.

## References
[PRD.md](../PRD.md) FR-2.2 · [Workflow.md](../Workflow.md) WF4 · [Bubble.md](../Bubble.md) §4.3c · relates to [[ADR-007-scanned-image-ocr]]
