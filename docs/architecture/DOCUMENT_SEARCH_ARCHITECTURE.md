# Document Search Architecture

## Data model

Migration `20260717_0003` adds searchable document metadata,
`knowledge.document_identifiers`, `knowledge.document_chunks`, and
`audit.document_access_events`. A survey number is always text. The original value is
preserved in `identifier_value`; `normalized_value` is an independently indexed,
versioned search representation.

Identifiers are typed so deed, case, plot, and external reference numbers can be
added without document-column conditionals. Scope columns are repeated on identifier,
chunk, and audit rows for explicit tenant filtering.

## Normalization version 1

Normalization applies Unicode NFKC, converts Unicode slash variants to `/`, trims
outer whitespace, removes spaces immediately around `/`, collapses repeated spaces,
and applies case folding. It does not cast to a number, rewrite hyphens as slashes,
remove letters, or discard the original. Therefore `289/2` and `289/20` remain
distinct, while `289 / 2` and `289／2` find `289/2`.

## Ranking

The SQL query is membership-scoped before results are ranked:

| Match | Base score |
| --- | ---: |
| exact original identifier | 1000 |
| exact normalized survey identifier | 900 |
| exact alternate identifier | 800 |
| identifier prefix | 700 |
| exact metadata | 600 |
| partial metadata | 500 |
| PostgreSQL full text | 400 |
| pgvector semantic similarity | 200 + similarity |

`updated_at` is only a tie-breaker. Semantic lookup is optional: missing credentials
or an embedding outage does not affect exact, normalized, metadata, or full-text
search. Results are paginated and capped at 100.

## Upload and indexing

The upload-intent transaction creates the document metadata, original file record,
version, job, and primary survey identifier before the file is processed. The browser
uploads directly to a signed private-storage URL and confirms completion. FastAPI then
queues an idempotent Dramatiq actor. The worker downloads the original, uses the
ingestion router, stores validated derivatives separately, extracts text, creates
chunks, optionally embeds them, and records a terminal ready or failed state.

## View, download, and chat

Detail, view URL, download URL, and chat queries all join an active membership on both
organization and business. Signed URLs are short lived; download and view events are
audited. Chat parses a possible survey number, resolves authorized exact/normalized
documents first, retrieves chunks only from the chosen document, and returns citations
plus application action paths. It returns not-found or clarification-required instead
of using model memory.
