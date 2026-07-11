#!/usr/bin/env bash
# export-xano-schema.sh — Back up the Xano DB schema to backend/schema/ for version control.
# Xano has NO official CLI, so we use the official Xano METADATA API over curl (ADR-009).
# NO business logic here — this only exports definitions so the repo mirrors the live DB.
#
# Required env: XANO_INSTANCE_BASE_URL  (e.g. https://x8xx-xxxx.xano.io)
#               XANO_METADATA_TOKEN     (Metadata API access token)
# Optional env: XANO_WORKSPACE_ID       (if your instance hosts multiple workspaces)
#
# NOTE: Xano's Metadata API paths differ by instance/version. Confirm the exact
#       endpoints in your instance's Metadata API docs and adjust META_PATH below.
#       This script intentionally treats the path as configurable rather than hardcoding
#       an endpoint we can't verify for your instance.
set -euo pipefail

: "${XANO_INSTANCE_BASE_URL:?set XANO_INSTANCE_BASE_URL}"
: "${XANO_METADATA_TOKEN:?set XANO_METADATA_TOKEN}"
OUT_DIR="backend/schema"
STAMP="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
META_PATH="${XANO_META_PATH:-/api:meta/workspace}"   # override via XANO_META_PATH if needed

mkdir -p "${OUT_DIR}"
echo "==> Exporting Xano schema from ${XANO_INSTANCE_BASE_URL}${META_PATH}"

curl -sf \
  -H "Authorization: Bearer ${XANO_METADATA_TOKEN}" \
  -H "Accept: application/json" \
  "${XANO_INSTANCE_BASE_URL}${META_PATH}" \
  -o "${OUT_DIR}/schema.json"

echo "==> Wrote ${OUT_DIR}/schema.json (commit id ${STAMP})"
echo "    Review the diff and commit in the SAME PR as the Xano change (CONTRIBUTING.md)."
