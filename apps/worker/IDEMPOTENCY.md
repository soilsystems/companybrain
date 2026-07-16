# Worker Idempotency Design

Background jobs must be retryable. Every future job that mutates state will accept
an idempotency key derived from the stable business event, not from the retry
attempt. Examples:

- document ingestion: `document_version_id`
- OCR extraction: `document_version_id:processor_version`
- embedding generation: `chunk_id:embedding_model`
- market OCR import: `upload_id:row_hash`

Workers will upsert job-attempt records and domain outputs inside transactions.
Retries may repeat reads or external calls, but database writes must converge to
the same final state.

The document ingestion actor is implemented with the trusted ingestion services under
`apps/api/app/jobs/document_ingestion.py` and executed by the dedicated worker image.
This keeps file inspection, provider routing, and persistence behavior identical in
the API and worker processes while preserving separate deployment boundaries.
