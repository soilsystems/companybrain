# Document Search Test Matrix

| Area | Scenario | Automated coverage | Result |
| --- | --- | --- | --- |
| normalization | spaces, slash variants, letters, hyphens | API unit tests | Pass |
| distinction | `289/2` versus `289/20` | API unit tests | Pass |
| parser | survey phrase resolution | API unit tests | Pass |
| ranking | identifier above metadata/FTS/vector | API unit tests | Pass |
| upload | original survey formatting preserved | API route test | Pass |
| security | unauthenticated search/detail/actions/chat | API route tests | Pass |
| signed actions | separate view and download calls | API route tests | Pass |
| schema | identifier/chunk/audit migration declarations | migration tests | Pass |
| performance | exact lookup among 10,000 synthetic rows | deterministic benchmark | Pass |
| frontend | dashboard/search/library/upload/chat render | Vitest | Pass |
| hierarchy | SoilSystems sub-organization names remain stable | Pytest | Pass |
| universal search | organization scope and optional business filter | API and live verification | Pass |
| result location | organization and sub-organization shown | TypeScript and live verification | Pass |
| deletion | authentication and confirmation flow | Pytest and Vitest | Pass |
| deletion safety | soft-delete exclusion and worker cancellation recheck | API and live verification | Pass |
| responsive UI | desktop/tablet/mobile visual capture | browser comparison | Pass |
| live database | migration and cross-tenant SQL execution | requires PostgreSQL | Not run locally |
| live storage | private upload and signed URL expiry | requires Supabase | Not run locally |
| live providers | OCR and embeddings | requires provider credentials | Not run locally |
| full E2E | auth through cross-business rejection | deployment test | TODO |

The synthetic performance test proves the expected indexed exact-lookup behavior in a
10,000-record model, not production PostgreSQL latency. Production sign-off requires
`EXPLAIN (ANALYZE, BUFFERS)` against migrated PostgreSQL and a seeded multi-tenant E2E
environment.
