# ADR-010: Document search is the primary product workflow

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-17 |
| **Deciders** | Product owner, architecture baseline |
| **Phase** | Document platform iteration |

## Context

Company Brain began with a chat-first foundation, but users primarily need to locate,
inspect, and download authorized records. Chat is valuable only when it resolves to
stored evidence and secure document actions.

## Decision

Dashboard, navigation, and APIs prioritize document search, survey-number lookup,
library, upload, viewing, and download. Chat remains a secondary entry point and must
resolve likely document identifiers before semantic retrieval. Exact authorized
identifier matches rank ahead of metadata, full-text, and vector matches.

## Consequences

- Metadata is searchable immediately, independent of extraction success.
- The application shell and right rail adapt to document context.
- Chat cannot invent a document result when authorized evidence is absent.
- Search quality can improve without changing identifier correctness.

## References

- `ARCHITECTURE.md`
- `docs/architecture/DOCUMENT_SEARCH_ARCHITECTURE.md`
- `ADR-011-typed-document-identifiers.md`
