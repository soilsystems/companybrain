# ADR-008: Build single-tenant, architect for multi-tenant (SaaS aspirational)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-06 |
| **Deciders** | Product owner, Architect |
| **Phase** | 0 |

## Context
Multi-tenant SaaS is a long-term aspiration, not a Phase 1 requirement. Building tenant management, billing, plans, and isolation now would add significant complexity for a single internal customer. But retrofitting tenancy later is expensive if the data model isn't ready.

## Options considered
1. **Full multi-tenancy now** — premature complexity; slows the actual Phase 1 goal.
2. **Single-tenant, no tenancy affordances** — simplest now; costly migration later.
3. **Single-tenant runtime, multi-tenant-ready data model** — one seeded org; `organization_id` on every table; no org-specific logic hardcoded; but no tenant-management features built.

## Decision
**Option 3 — "build for one customer today, architect for many tomorrow."** Keep `organization_id` everywhere and avoid hardcoded org logic (markets/mappings/thresholds are config). Do **not** build tenant onboarding, billing, plans, or isolation audits in Phase 1.

## Consequences
- Positive: minimal current complexity; enabling multi-tenancy later is largely configuration, not migration; no wasted SaaS plumbing before there's a second customer.
- Negative / trade-offs: a small ongoing discipline cost (carry + filter `organization_id` for a single org). Accepted as cheap insurance.
- Deferred to Phase 7: onboarding, per-org markets/templates, billing/metering, plan limits, cross-tenant isolation suite, white-label.

## References
[PRD.md](../PRD.md) NFR-6 · [Architecture.md](../Architecture.md) §10.2 · [Roadmap.md](../Roadmap.md) Phase 7
