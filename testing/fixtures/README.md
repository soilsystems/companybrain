# Golden Fixtures

A golden fixture is a **frozen (source report → expected extracted rows) pair**. It turns the riskiest component — extraction ([ADR-007](../../docs/decisions/ADR-007-scanned-image-ocr.md)) — into an automated regression test: any change to the OCR template, cleaning rules, or normalization must still reproduce the expected rows, or the change is rejected.

## Structure
Per fixture, two files sharing a base name:
- `report-<id>.pdf` — the source scanned report (anonymized/cleared for repo storage, or referenced out-of-git if sensitive; see `.gitignore`).
- `report-<id>.expected.json` — the hand-verified expected output (see template below).

## When they're built
The first fixtures are created **during / right after the Phase 0 OCR spike**, reusing the hand-verified truth files (`ocr/spike/*.truth.csv`) as the basis for `expected.json`. Target: ≥ 2 fixtures spanning quality (one clean, one hard).

## How they're used
- Phase 1 acceptance: both fixtures must produce the expected **staged** rows (automated compare) before ingestion is considered done.
- Continuous track: every extraction/normalization change re-runs the fixture suite before deploy ([Roadmap.md](../../docs/Roadmap.md) Continuous Tracks).

## expected.json template
See [`report-sample.expected.template.json`](report-sample.expected.template.json). It captures, per row, the values *after cleaning/normalization* (canonical product/variant/country resolved, price parsed, `price_raw` preserved, `is_available` derived) — i.e. what should land in `upload_rows` before human review.

## Status
⬜ No fixtures yet — awaiting the Phase 0 spike and its truth files.
