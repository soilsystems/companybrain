# File Upload Troubleshooting

1. Find logs using request ID, document ID, ingestion job ID, organization ID, and
   business ID. Do not search logs for document contents.
2. Check the stored browser, detected, and normalized MIME values. A mismatch is an
   observation, not automatically a failure.
3. Check the latest ingestion attempt and safe error code.
4. Retry only errors marked retryable. Never loop deterministic corrupt, encrypted,
   unsafe, or unsupported failures.
5. Confirm the private original exists before investigating conversion or extraction.
6. For `provider_unsupported_mime`, verify the router selected a compatible adapter and
   that no octet-stream or MIME alias crossed the provider boundary.
7. For an image/table, verify normalization completed and Document AI was selected.

User-facing errors must come from `services/files/errors.py`; provider payloads and
stack traces are internal only.
