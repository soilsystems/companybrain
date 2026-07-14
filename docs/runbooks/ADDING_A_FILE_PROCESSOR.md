# Adding a File Processor

1. Add one canonical definition to `mime_registry.py`, including extensions, category,
   size limit, processor, conversion, OCR, and direct-vision flags.
2. Extend content detection in `file_inspector.py` using signatures or a structured
   container check. Do not use extension-only detection.
3. Add a processor adapter with an explicit MIME capability set and safe error mapping.
4. Add routing and bounded fallback rules in `processor_router.py`.
5. Preserve the original; store conversions as linked derivative files.
6. Add synthetic unit fixtures, mismatch tests, corrupt/unsafe tests, integration tests,
   and one end-to-end upload/status/retry test.
7. Update the architecture matrix and troubleshooting runbook.

Never execute macros, formulas, embedded programs, or document instructions.
