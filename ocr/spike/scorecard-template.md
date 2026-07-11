# OCR Spike Scorecard — <report-id>

| | |
|---|---|
| Report id | |
| Report date | |
| Source quality | clean / skewed / noisy / dense / other |
| Processor id + version | |
| Truth file | `ocr/spike/<report-id>.truth.csv` |
| Raw output | `ocr/spike/<report-id>.raw.json` |
| Run date | |
| Operator | |

## A. Table & row detection
| Metric | Value |
|--------|-------|
| True rows (N) | |
| Rows detected | |
| Correctly bounded rows | |
| Merged rows | |
| Split rows | |
| Dropped rows | |
| Duplicated rows | |
| **Row detection rate** | ___ % |

## B. Row alignment
| Metric | Value |
|--------|-------|
| Detected rows scored | |
| Rows with all cells in correct columns | |
| **Row alignment rate** | ___ % |

## C. Field accuracy (correct / N)
| Field | Correct | N | Accuracy |
|-------|---------|---|----------|
| product | | | ___ % |
| origin | | | ___ % |
| shipment | | | ___ % |
| weight | | | ___ % |
| packing | | | ___ % |
| price (incl. NA) | | | ___ % |
| date | | | ___ % |
| **Overall (Σ/7N)** | | | **___ %** |
| **Critical (product/origin/price)** | | | **___ %** |

## Confidence calibration
| Metric | Value |
|--------|-------|
| Rows flagged < threshold (0.85) | |
| Of flagged, actually wrong (precision) | ___ % |
| Of wrong rows, flagged (recall) | ___ % |

## Operational
| Metric | Value |
|--------|-------|
| Pages | |
| Latency (s) | |
| Cost estimate ($) | |

## Error notes
- Systematic errors seen (which field/column, what pattern):
- One-off errors:
- Suggested template/processor fix:
