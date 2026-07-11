# ADR-002: Function/tool calling (not RAG) for price answers

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-06 |
| **Deciders** | Architect, Product owner |
| **Phase** | 0 (implemented Phase 3) |

## Context
The AI assistant must answer price questions with exact, current, trustworthy numbers ("today's tomato price", "average onion this month"). Price data is **structured and exact**, and the #1 product risk is a confidently wrong number.

## Options considered
1. **RAG over report text** — embed reports, retrieve chunks, let the LLM read and answer. Fuzzy; the model *sees* numbers and can misread/blend them; hard to guarantee freshness or exactness.
2. **Function/tool calling** — the LLM selects a query tool + arguments; Xano runs a parameterized query on precomputed tables; a second LLM call composes an answer from the results only.

## Decision
**Tool calling for all price/market data (Option 2). RAG is explicitly reserved for the future Documents module only** (unstructured knowledge), never for prices.

## Consequences
- Positive: the model never authors a number — it picks a query; every figure traces to a DB row (auditable). Freshness guaranteed (re-query each time). Clear clarify/refuse paths.
- Negative / trade-offs: each new question type needs a registered tool. Mitigated by a config-driven tool registry (adding a tool = a row, not orchestrator edits).
- Revisit: never for prices. RAG arrives as a *separate* tool (`search_documents`) in Phase 6.

## References
[AI.md](../AI.md) §§3, 8 · [Architecture.md](../Architecture.md) §7.2 · relates to [[ADR-003-staging-before-publish]]
