# Deleted Files

Every file listed here was recorded in `docs/legacy/LEGACY_FILE_INVENTORY.md`
before deletion.

| Original path | Reason for deletion | Useful information migrated? | Replacement file |
| ------------- | ------------------- | ---------------------------- | ---------------- |
| `ai/evals/results/.gitkeep` | Empty generated-results placeholder. | No. | `ai/evals/` |
| `ai/prompts/chat/.gitkeep` | Empty placeholder from legacy scaffold. | No. | `ai/prompts/` |
| `ai/prompts/normalization/.gitkeep` | Normalization prompt placeholder for legacy market workflow. | No. | `ai/prompts/` |
| `ai/tools/.gitkeep` | Empty placeholder. | No. | `ai/tools/` |
| `automation/workflows/.gitkeep` | n8n workflow placeholder from abandoned runtime. | No. | `apps/worker/` |
| `backend/api/.gitkeep` | Xano API export placeholder. | No. | `apps/api/` |
| `backend/functions/.gitkeep` | Xano functions export placeholder. | No. | `apps/api/app/services/` |
| `backend/schema/.gitkeep` | Xano schema export placeholder. | No. | `apps/api/alembic/versions/` |
| `frontend/assets/.gitkeep` | Bubble assets placeholder. | No. | `apps/web/` |
| `ocr/samples/pdf/.gitkeep` | Empty sample placeholder; raw samples are sensitive and ignored unless anonymized. | No. | `.gitignore` OCR rules |
| `ocr/samples/xlsx/.gitkeep` | Empty sample placeholder; raw samples are sensitive and ignored unless anonymized. | No. | `.gitignore` OCR rules |
| `ocr/spike/results/.gitkeep` | Empty OCR results placeholder; raw results may contain business data. | No. | `.gitignore` OCR rules |
| `scripts/export-n8n-workflows.sh` | n8n export helper tied to abandoned runtime. | No. | `apps/worker/` and GitHub Actions |
| `scripts/export-xano-schema.sh` | Xano schema export helper tied to abandoned backend. | No. | Alembic migrations under `apps/api/alembic/versions/` |
| `testing/postman/.gitkeep` | Empty Postman placeholder. | No. | `apps/api/tests/` |
