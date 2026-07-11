# ADR-006: Availability is derived from price, not stored as a report field

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-06 |
| **Deciders** | Product owner, Architect |
| **Phase** | 0 (implemented Phase 1) |

## Context
Early drafts modeled `availability` as an explicit enum field extracted from the report. On inspection, the real reports do **not** carry an explicit availability column — availability is implied by the price cell: a numeric price means available; `NA`/blank means not available.

## Options considered
1. **Store availability as an extracted enum** (`available`/`limited`/`out_of_stock`/`unknown`) — invents structure the source doesn't provide; risks misrepresenting the report.
2. **Derive availability from price** — preserve the original imported value exactly (`price_raw`), make numeric `price` nullable (null when `NA`), and compute `is_available = price is not null`.

## Decision
**Derive availability from price (Option 2).** Keep `price_raw` (exact original, incl. `NA`), nullable `price`, and a derived `is_available` boolean. The UI shows "Not available" for NA; filters and the availability distribution derive from `is_available`.

## Consequences
- Positive: schema faithfully mirrors the source; no fabricated field; original value always preserved for audit; simpler enum-free model.
- Negative / trade-offs: availability granularity is binary (available / not). Accepted — it matches what the report actually expresses. If a future report adds richer availability, revisit with a new ADR.
- Affected: `daily_prices`, `upload_rows`, `product_latest_price`, `market_summaries.availability_distribution`, WF3 cleaning, Bubble grids.

## References
[Database.md](../Database.md) §§5.2, 6.1 · [Workflow.md](../Workflow.md) WF3 · [PRD.md](../PRD.md) FR-2.5
