# scripts/

Thin, reproducible wrappers over **official platform CLIs** for provisioning, export, and backup — governed by [ADR-009](../docs/decisions/ADR-009-cli-usage-policy.md).

**Hard rule:** nothing here implements product business logic, UI, workflows, DB design, or integrations. Those live in Bubble/Xano/n8n. These scripts only *provision environments* and *export/back up definitions* so another developer can reproduce the setup. If a script starts encoding app logic, it violates ADR-009 and ADR-001 — stop and move it into the no-code layer.

| Script | Wraps | Purpose | Idempotent |
|--------|-------|---------|-----------|
| `provision-gcp.sh` | `gcloud` | Enable APIs, create the n8n service account + IAM, budget alert | Yes (safe to re-run) |
| `export-xano-schema.sh` | Xano **Metadata API** (`curl`) | Back up DB schema to `backend/schema/` (no Xano CLI exists) | Yes (overwrites export) |
| `export-n8n-workflows.sh` | `n8n` CLI (self-hosted) | Export workflows to `automation/workflows/` | Yes |

## Conventions
- All config comes from environment variables (names mirror [`.env.example`](../.env.example)); scripts fail fast if a required var is unset.
- Read-only/create-if-absent; never destructive without an explicit `--force` you add deliberately.
- Every command is also documented inline in [runbooks/phase0-provisioning.md](../docs/runbooks/phase0-provisioning.md) so the runbook and scripts stay in sync.
- Secret files these produce (e.g. GCP key JSON) are gitignored — store them in the n8n vault, never commit.

## Usage
```bash
export GCP_PROJECT_ID=... BILLING_ACCOUNT_ID=...
bash scripts/provision-gcp.sh          # provisions Google Cloud
export XANO_INSTANCE_BASE_URL=... XANO_METADATA_TOKEN=...
bash scripts/export-xano-schema.sh     # backs up schema after any DB change
```
