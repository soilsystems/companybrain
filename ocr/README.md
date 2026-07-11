# OCR Spike — Methodology & Results

| | |
|---|---|
| **Purpose** | Validate that Google Document AI can extract the Dubai market report (scanned images) accurately enough to build on — **the primary objective of Phase 0.** |
| **Owner** | Human operator (runs Document AI); AI architect (defines method, analyzes results). |
| **Decision it feeds** | Go/No-Go for Phase 1 ([Roadmap.md](../docs/Roadmap.md)); processor choice ([ADR-007](../docs/decisions/ADR-007-scanned-image-ocr.md)). |

> **Why this exists:** the reports are scanned images, and scanned tabular OCR is the highest-risk assumption in the whole program. We measure it *before* building UI. No accuracy numbers are assumed or fabricated — they come from running real reports through the processor and scoring against a hand-verified truth.

---

## 1. What we are measuring

Three distinct accuracy dimensions — a report can pass one and fail another, so we score them separately:

| Dimension | Question | Why it matters |
|-----------|----------|----------------|
| **A. Table & row detection** | Did the OCR find the table and the right number of rows? Any rows merged, split, dropped, or duplicated? | If rows are lost/merged, no field accuracy can save it. |
| **B. Row alignment** | For a detected row, do the cells line up to the correct columns? | Scanned tables skew; a shifted column silently corrupts every field. |
| **C. Field mapping accuracy** | Per field (product, origin, shipment, weight, packing, price, date), is the extracted value correct? | This is the number that gates data trust. |

Plus operational signals: **per-field confidence** (does Document AI's confidence correlate with actual correctness? — needed to tune `OCR_CONFIDENCE_THRESHOLD`), latency, and cost per page.

---

## 2. Metric definitions (exact, so scores are reproducible)

Let a report have **N** true rows (from the hand-verified truth file) and **7** fields per row.

- **Row detection rate** = detected_rows_correctly_bounded / N. (A row split across two OCR rows, or two rows merged into one, counts as *not* correctly bounded.)
- **Row alignment rate** = rows_with_all_cells_in_correct_columns / detected_rows.
- **Field accuracy (per field f)** = correct_values_f / N. "Correct" = exact match after normalization (trim, case, unit spacing). For `price`: numerically equal; `NA`/blank correctly captured as `price_raw` counts as correct.
- **Overall field accuracy** = Σ correct fields / (N × 7). **This is the headline number** for the go/no-go.
- **Critical-field accuracy** = accuracy over {product, origin, price} only — the fields that must be right for the product to be useful. Reported separately because a wrong `packing` matters far less than a wrong `price`.
- **Confidence calibration**: of rows Document AI marked below `OCR_CONFIDENCE_THRESHOLD` (0.85), what fraction were actually wrong (precision of the flag) and what fraction of wrong rows were flagged (recall)? High recall means the staging gate will catch errors.

---

## 3. Procedure

1. **Assemble the sample set**: ≥ 5 real scanned reports, ideally spanning quality (a clean scan, a skewed/noisy one, a dense one, a recent-format one). Place under `ocr/samples/pdf/` (anonymized/cleared for repo storage, or kept out of git if sensitive — see `.gitignore`).
2. **Build the truth files**: for each report, a human types the correct rows into `ocr/spike/<report-id>.truth.csv` using the column set in §5. This is the ground truth — accuracy is measured against it. (Yes, this is manual; it is done once, for 5 reports, to calibrate everything downstream.)
3. **Train the Custom Extractor**: label a subset in the Document AI console (or start with the generic extractor for a baseline), defining the 7 fields. Pin the processor version.
4. **Run each report** through the processor (via the n8n test flow or the console). Save raw JSON to `ocr/spike/<report-id>.raw.json`.
5. **Post-process** the raw JSON into rows (the WF2 reassembly logic: strip headers/footers, merge cross-page rows, map cells → fields).
6. **Score**: compare post-processed rows to the truth file; fill `ocr/spike/<report-id>.scorecard.md` (copy the template).
7. **Aggregate** all reports into the summary table in §6 of this file.

---

## 4. Go / No-Go thresholds (decide before looking at results — no moving goalposts)

Based on **overall field accuracy** and **critical-field accuracy** (product/origin/price), *pre-normalization* (raw OCR, before the alias/normalization layer improves it):

| Band | Overall | Critical | Recommendation |
|------|---------|----------|----------------|
| 🟢 **GO** | ≥ 90% | ≥ 95% | Proceed to Phase 1 as planned. Staging gate handles the remainder. |
| 🟡 **CONDITIONAL GO** | 75–90% | 85–95% | Proceed, but budget heavier review time, invest more in Custom Extractor training, and lean on the manual-entry fallback for bad reports. Re-measure after more training data. |
| 🔴 **NO-GO (renegotiate)** | < 75% | < 85% | Do not start Phase 1 on scanned images. Push the source for Excel/digital PDF, or redesign ingestion around the manual-entry grid as the primary path. |

The **manual-entry fallback** (a grid where an admin types rows directly into staging) is built regardless — it is the safety net that makes even a 🟡 result viable and guarantees no business day is lost.

---

## 5. Truth file & extracted columns (must match)

`report_date, product_raw, origin_raw, shipment_raw, weight_raw, packing_raw, price_raw`
(`price_raw` preserves the exact cell, including `NA`. Availability is *derived* from it later — see [ADR-006](../docs/decisions/ADR-006-availability-derived.md); it is **not** a truth column.)

---

## 6. Results — Aggregate (fill after the run)

> _Status: ⬜ NOT YET RUN — awaiting provisioned Document AI processor + real sample reports._

| Report id | Quality | N rows | Row detect % | Row align % | Overall field % | Critical field % | Notes |
|-----------|---------|--------|--------------|-------------|-----------------|------------------|-------|
| _sample-01_ | | | | | | | |
| _sample-02_ | | | | | | | |
| _sample-03_ | | | | | | | |
| _sample-04_ | | | | | | | |
| _sample-05_ | | | | | | | |
| **Average** | | | | | | | |

**Per-field accuracy (average across reports):**

| product | origin | shipment | weight | packing | price | date |
|---------|--------|----------|--------|---------|-------|------|
| | | | | | | |

**Confidence calibration:** flag precision ___ · flag recall ___ · chosen threshold ___

**Latency / cost:** avg ___ s/page · avg $___ /page · est. $___ /report.

---

## 7. Findings & Recommendations (fill after the run)
- Issues encountered: _(e.g. column X frequently misaligned; Arabic rows dropped; NA misread as 0)_
- Processor choice confirmed/changed: _(Custom Extractor vs Form Parser + rules)_
- Extraction template adjustments: _(update `ocr/templates/dubai-fnv-v1.json`)_
- Architecture changes required (if any): _(record as an ADR)_
- **Go/No-Go recommendation:** _( 🟢 / 🟡 / 🔴 + one-paragraph justification )_

Individual per-report scorecards: `ocr/spike/*.scorecard.md` (template: [`ocr/spike/scorecard-template.md`](spike/scorecard-template.md)).
