# File Ingestion Test Matrix

Synthetic fixtures are generated in memory. Private business reports stay outside Git.

| Case | Expected result | Automated |
|---|---|---|
| `.jpg`, `.jpeg`, uppercase JPEG | detect `image/jpeg` | yes |
| JPEG as octet-stream or `.bin` | detect from bytes | yes |
| PNG renamed `.jpg` | detect PNG, record mismatch | yes |
| PNG, WebP, TIFF | accepted and routed | yes |
| PDF | native parser with OCR fallback | yes |
| DOCX, XLSX, PPTX containers | identify from ZIP members | yes |
| CSV, TXT, JSON | deterministic route | yes |
| Unicode/mobile filename | safe display name | yes |
| empty/corrupt/executable | safe rejection | yes |
| password-protected PDF | unlocked-copy message | yes |
| TIFF conversion | linked checksums and valid PNG | yes |
| Gemini JPEG | canonical image part | yes |
| scanned vs text PDF | extraction-dependent OCR fallback | TODO(integration) |
| XLS parser | preserve sheet/row context | TODO(integration) |
| retry/fallback/final ready | durable attempts | TODO(integration) |
| business isolation | FastAPI authorization | TODO(integration) |
| UI upload through completion | browser E2E | TODO(e2e) |

Run:

```bash
cd apps/api && uv run pytest tests/test_file_ingestion.py
pnpm --filter @companybrain/web test -- gemini.test.ts
```
