# ADR-005: Publish = write facts → recompute derived (not one atomic transaction)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-06 |
| **Deciders** | Architect, Product owner |
| **Phase** | 0 (implemented Phase 1) |

## Context
Publishing an approved report must move staging rows into the append-only fact table **and** update three derived tables (`product_latest_price`, `price_history_daily`, `market_summaries`). Xano's guarantees across many writes are weaker than a hand-written DB transaction, so treating the whole multi-table fan-out as "atomic" is a false promise — a mid-publish failure could leave aggregates half-updated.

## Options considered
1. **One big atomic multi-table transaction** — clean in theory; not reliably achievable in Xano; a partial failure corrupts derived state.
2. **Write facts, then recompute** — Step A writes only `daily_prices` (the sole source of truth); Step B (WF6) recomputes the derived tables, which are 100% rebuildable from facts. Both steps idempotent.

## Decision
**Write facts → recompute (Option 2).** Only the fact write must succeed for data to be safe. Derived tables are disposable and rebuildable; an interruption between A and B is corrected by rerunning B.

## Consequences
- Positive: robust and simple; no reliance on transactional guarantees the platform can't give; derived tables can be rebuilt/self-healed nightly; dashboard keeps serving last-good summaries during a recompute.
- Negative / trade-offs: a brief window where facts are published but derived tables lag by seconds. Accepted — dashboard/AI read derived tables and simply refresh a moment later; correctness is never compromised.
- Revisit: if a future platform offers true multi-table transactions and it simplifies things.

## References
Supersedes the earlier "atomic publish transaction" wording. [Workflow.md](../Workflow.md) WF5 · [Architecture.md](../Architecture.md) §§4–5
