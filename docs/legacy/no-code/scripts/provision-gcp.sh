#!/usr/bin/env bash
# provision-gcp.sh — Reproducible Google Cloud provisioning for Company Brain.
# Wraps the official `gcloud` CLI ONLY. Contains NO product/business logic (ADR-009).
# Idempotent: safe to re-run; creates resources only if absent.
#
# Prereqs: gcloud installed & authenticated (`gcloud auth login`).
# Required env: GCP_PROJECT_ID
# Optional env: BILLING_ACCOUNT_ID (to create a budget alert), MONTHLY_BUDGET_USD (default 100)
set -euo pipefail

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"
MONTHLY_BUDGET_USD="${MONTHLY_BUDGET_USD:-100}"
SA_NAME="companybrain-n8n"
SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
KEY_OUT="./companybrain-n8n-key.json"   # gitignored; move to the n8n vault after creation

echo "==> Using project: ${GCP_PROJECT_ID}"
gcloud config set project "${GCP_PROJECT_ID}" 1>/dev/null

echo "==> Enabling APIs (documentai, drive, iam, billing)"
gcloud services enable \
  documentai.googleapis.com \
  drive.googleapis.com \
  iam.googleapis.com \
  cloudbilling.googleapis.com

echo "==> Ensuring service account ${SA_EMAIL}"
if ! gcloud iam service-accounts describe "${SA_EMAIL}" 1>/dev/null 2>&1; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Company Brain n8n automation"
else
  echo "    (already exists)"
fi

echo "==> Granting roles/documentai.apiUser"
gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/documentai.apiUser" \
  --condition=None 1>/dev/null

if [[ ! -f "${KEY_OUT}" ]]; then
  echo "==> Creating service account key -> ${KEY_OUT} (store in n8n vault; DO NOT commit)"
  gcloud iam service-accounts keys create "${KEY_OUT}" --iam-account="${SA_EMAIL}"
else
  echo "==> Key ${KEY_OUT} already present; skipping (rotate manually if needed)"
fi

if [[ -n "${BILLING_ACCOUNT_ID:-}" ]]; then
  echo "==> Creating budget alert (${MONTHLY_BUDGET_USD} USD @ 50%/90%)"
  gcloud billing budgets create \
    --billing-account="${BILLING_ACCOUNT_ID}" \
    --display-name="CompanyBrain monthly" \
    --budget-amount="${MONTHLY_BUDGET_USD}USD" \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.9 || echo "    (budget may already exist)"
else
  echo "==> BILLING_ACCOUNT_ID not set; skipping budget (create manually or re-run with it)"
fi

cat <<EOF

Done. Manual follow-ups (no CLI for these):
  1. Create the Document AI CUSTOM EXTRACTOR processor and TRAIN it in the console
     (labeling UI is console-only) -> record DOCAI_PROCESSOR_ID / DOCAI_PROCESSOR_VERSION.
  2. Move ${KEY_OUT} into the n8n credentials vault, then delete the local copy.
  3. Share the Drive /CompanyBrain folder with ${SA_EMAIL} (edit access).
EOF
