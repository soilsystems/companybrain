# Document Upload And Search

## Local services

1. Copy `.env.example` to `.env` and configure Supabase database, Auth, and private
   storage values.
2. Start PostgreSQL and Redis: `docker compose up postgres redis`.
3. Apply schema: `make migrate`.
4. Start FastAPI: `make api`.
5. Start the actor: `make worker`.
6. Start Next.js: `make web`.

Provider keys are optional for metadata and exact search. `OPENAI_API_KEY` enables
embeddings. `GEMINI_API_KEY` enables the current vision/OCR fallback. Google Document
AI configuration is reserved by the ingestion architecture but its production adapter
still requires deployment wiring.

## Manual verification

1. Sign in and select an authorized organization, business, and domain.
2. Open `/app/documents/upload`.
3. Choose a safe supported file and enter survey number `289/2` plus a title.
4. Submit. Confirm that metadata appears before extraction finishes.
5. Search `289 / 2`; verify the original `289/2` displays first.
6. Open the detail route and request a preview. Confirm the URL expires and contains no
   service-role key or raw storage path in application data.
7. Request download and verify an `audit.document_access_events` row.
8. Ask a question from the document page and verify every citation points to that
   document.
9. Repeat the detail/search calls with a user from another business; expect 404 or no
   results.

## Common states

`uploaded` and `queued` indicate safe metadata is available. `extracting`, `chunking`,
and `embedding` are active worker stages. `ready` is fully searchable. `failed` must
retain a safe user message and internal retry history; it must never be changed to
ready without extracted output.

For file detection and provider failures, see `FILE_UPLOAD_TROUBLESHOOTING.md`.
