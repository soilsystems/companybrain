# ADR-011: Store survey numbers as typed document identifiers

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-17 |
| **Deciders** | Product owner, architecture baseline |
| **Phase** | Document platform iteration |

## Context

Survey numbers such as `289/2`, `104/A`, and `15-3` are legal/business identifiers,
not numbers. Formatting must be preserved while harmless input variations remain
searchable. Future records may also use deed, case, plot, or reference identifiers.

## Decision

Store identifiers in `knowledge.document_identifiers` with an explicit type, original
string value, separately normalized value, and normalization version. Normalization
trims outer whitespace, converts Unicode slash variants, removes spaces around `/`,
collapses repeated spaces, and case-folds. It does not cast numbers, merge separator
types, remove letters, or overwrite the original value.

Uniqueness is scoped to organization, business, document, identifier type, and exact
original value. Duplicate-looking identifiers may exist across documents and require
user clarification; they are never silently reassigned.

## Consequences

- Exact original and exact normalized indexes support fast authorized lookup.
- Similar-looking identifiers remain legally distinct.
- New identifier types do not require columns throughout the document schema.
- Chat and search share one versioned normalization service.

## References

- `ADR-010-document-search-first.md`
- `docs/architecture/DOCUMENT_SEARCH_ARCHITECTURE.md`
