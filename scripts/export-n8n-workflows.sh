#!/usr/bin/env bash
# export-n8n-workflows.sh — Export n8n workflows to automation/workflows/ for version control.
# Wraps the official n8n CLI (SELF-HOSTED instances only). On n8n Cloud there is no CLI —
# export via the UI or the n8n REST API instead. NO business logic here (ADR-009).
#
# Prereq (self-hosted): n8n installed and pointed at the same DB as the instance.
set -euo pipefail

OUT_DIR="automation/workflows"
mkdir -p "${OUT_DIR}"

if ! command -v n8n >/dev/null 2>&1; then
  cat <<'EOF'
n8n CLI not found.
  - Self-hosted: install n8n (npm i -g n8n) on the instance host and re-run.
  - n8n Cloud:   no CLI available — export workflows from the UI (Download) or via
                 the n8n REST API, then place the JSON files in automation/workflows/.
EOF
  exit 1
fi

echo "==> Exporting all workflows -> ${OUT_DIR} (one file each)"
n8n export:workflow --all --separate --output="${OUT_DIR}/"
echo "==> Done. Commit the JSON in the SAME PR as the workflow change (CONTRIBUTING.md)."
echo "    Restore with:  n8n import:workflow --separate --input=${OUT_DIR}/"
