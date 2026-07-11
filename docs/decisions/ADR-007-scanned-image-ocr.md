# ADR-007: Treat scanned-image OCR as the primary project risk (Phase 0 spike)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-06 |
| **Deciders** | Product owner, Architect |
| **Phase** | 0 |

## Context
The daily reports arrive as **scanned images** (not digital PDFs with selectable text). Scanned tabular OCR is materially harder: skew, noise, multi-column layouts, merged/split cells, and possible Arabic/English mixing. Everything downstream (data, dashboards, AI) depends on extraction being usable. This is the single highest risk in the whole program.

## Options considered
1. **Assume OCR works, build straight into Phase 1** — high risk of building on sand.
2. **Phase 0 spike first** — measure real accuracy (table detection, row alignment, field mapping) on ≥ 5 real scanned reports before committing Phase 1 scope/timeline, with a defined go/no-go and a fallback.
3. **Require source to provide Excel** — ideal but not in our control; keep as a parallel ask.

## Decision
**Run the OCR spike first (Option 2)**, using a Google Document AI **custom extractor** trained on the real layout. Define accuracy metrics and a go/no-go threshold up front. **Mandatory fallback:** a manual-entry grid path for reports/rows OCR can't handle, so the product is viable even if OCR is imperfect. Continue to request Excel source where possible (Option 3 in parallel).

## Consequences
- Positive: de-risks the program before large build investment; produces a real accuracy baseline and a documented fallback; informs processor choice.
- Negative / trade-offs: 1–2 weeks before UI work. Accepted — cheap insurance against a far costlier failure.
- Go/No-Go: green ≥ 90% raw field accuracy; amber 75–90% (proceed with heavier review + fallback); red < 75% (renegotiate source format before Phase 1).

## References
[ocr/README.md](../../ocr/README.md) (spike methodology + scorecard) · [Roadmap.md](../Roadmap.md) Phase 0 · relates to [[ADR-003-staging-before-publish]]
