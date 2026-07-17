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

1. Sign in and select an authorized organization, sub-organization, and domain.
2. Open `/app/documents/upload`.
3. Choose a safe supported file. The filename pre-fills the editable document name.
4. Submit. Confirm that the document name appears before extraction finishes.
5. Search all or part of the document name and verify it appears first.
6. Open the detail route and request a preview. Confirm the URL expires and contains no
   service-role key or raw storage path in application data.
7. Request download and verify an `audit.document_access_events` row.
8. Ask a question from the document page and verify every citation points to that
   document.
9. Repeat the detail/search calls with a user from another business; expect 404 or no
   results.

Organization-wide search uses
`GET /api/v1/documents/search?q=<name>&organization_id=<id>`. Omit `business_id` to
search every authorized sub-organization or include it to narrow the results. Each
result reports its `organization_name` and `business_name`.

To remove a mistaken upload, choose Delete and confirm **Move to trash**. This calls
`DELETE /api/v1/documents/{document_id}`. The document immediately disappears from
normal search and library views, while its private original remains available for
administrative recovery. A 403 means the caller is neither an owner/admin nor the
document uploader.

## Common states

`uploaded` and `queued` indicate safe metadata is available. `extracting`, `chunking`,
and `embedding` are active worker stages. `ready` is fully searchable. `failed` must
retain a safe user message and internal retry history; it must never be changed to
ready without extracted output.

For file detection and provider failures, see `FILE_UPLOAD_TROUBLESHOOTING.md`.
