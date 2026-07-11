# Runbook — Phase 0 Account & Credential Provisioning

| | |
|---|---|
| **Purpose** | Stand up every platform + credential Company Brain needs, wired together and tested. |
| **Owner** | A person with console/billing access (this cannot be done by the AI assistant). |
| **Prereq** | Billing method for Google Cloud & OpenAI; an org email for account signups. |
| **Outcome** | A green "hello-world" round trip: n8n → Document AI → Xano, and Bubble → Xano login. |

> Record real secret **values** only in each platform's vault. In this repo, record only *names/locations* (see [`.env.example`](../../.env.example)). Never commit secrets.

Work top to bottom — later steps depend on earlier credentials. Check each box in your copy.

---

## 0. CLI-first provisioning (why + prerequisites)

Per [ADR-009](../decisions/ADR-009-cli-usage-policy.md), we provision with **official CLIs** wherever one exists — it makes setup reproducible, reviewable, and re-runnable by another developer, unlike click-ops. CLIs are used **only** for provisioning/ops here; no product logic. Every command below is also bundled into an idempotent script in [`/scripts`](../../scripts) so the whole environment can be recreated.

**CLI availability (honest — see [ADR-009](../decisions/ADR-009-cli-usage-policy.md) for the full matrix):**

| Platform | CLI | This runbook uses |
|----------|-----|-------------------|
| Google Cloud / Document AI | ✅ `gcloud` | §3 — APIs, service account, IAM, budget, processor create |
| GitHub | ✅ `git` / `gh` | §1 — repo, branch protection |
| n8n | ✅ `n8n` (self-hosted only) | §6 / export scripts |
| Xano | ❌ (use **Metadata API**) | §2 / §9 — schema export & backup via REST |
| Bubble | ❌ (manual export) | §7 — UI only, documented |
| OpenAI | dashboard | §5 — keys/budget in dashboard |

**Operator prerequisites (install once):**
```bash
gcloud --version      # Google Cloud SDK
gh --version          # GitHub CLI
git --version
# n8n CLI only if self-hosting n8n:  npm i -g n8n   (skip on n8n Cloud)
```
> **Why CLI:** a documented command is reproducible and diffable; a console screenshot is not. Anyone can re-run `/scripts/provision-gcp.sh` to rebuild the Google Cloud setup identically.

---

## 1. GitHub (done)
- [x] Repo `companybrain` exists with the scaffolded structure.
- [ ] Add collaborators; protect `main` (require PR review on `docs/API.md`, `backend/schema/**`, `ai/**`).

**CLI (why: branch protection set by hand drifts and isn't auditable):**
```bash
# Require 1 approving review before merging to main
gh api -X PUT repos/:owner/companybrain/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f 'required_pull_request_reviews[required_approving_review_count]=1' \
  -F 'enforce_admins=true' \
  -F 'required_status_checks=null' \
  -F 'restrictions=null'
```

## 2. Xano (backend, DB, API, auth)
- [ ] Create a Xano workspace `company-brain`.
- [ ] Create two environments/branches: **dev** and **prod**.
- [ ] Note the instance base URL(s) → `XANO_INSTANCE_BASE_URL`.
- [ ] Enable the auth/JWT extension (email+password).
- [ ] Create a **service account** user (role `service`) for n8n; issue a machine token → `XANO_SERVICE_TOKEN`.
- [ ] Generate a webhook signing secret → `XANO_WEBHOOK_HMAC_SECRET`.
- [ ] Confirm plan supports expected row counts + API rate (revisit after the 100K-row load test in Phase 2).
- [ ] Generate a **Metadata API** access token (Xano has no official CLI) → `XANO_METADATA_TOKEN`.

**No CLI — use the Metadata API for reproducible schema backup/export (why: keeps `backend/schema/**` an honest mirror of the live DB, reviewable in PRs). Wrapper: [`scripts/export-xano-schema.sh`](../../scripts/export-xano-schema.sh).**

## 3. Google Cloud + Document AI (OCR) — critical for the spike
- [ ] Create a GCP project → `GCP_PROJECT_ID`; enable billing.
- [ ] Enable the **Document AI API**.
- [ ] Choose processor region (`eu` or `us`) → `GCP_LOCATION` (mind data-residency).
- [ ] Create a **Custom Extractor** processor (for the market table). Note id/version → `DOCAI_PROCESSOR_ID`, `DOCAI_PROCESSOR_VERSION`.
  - Custom Extractor is chosen over the generic Form Parser because the report is a consistent domain table with named fields (product, origin, shipment, weight, packing, price). Confirm/revise in the spike.
- [ ] Create a **service account** with `Document AI API User` (+ Drive access if the same SA archives files); download its JSON key → store in n8n vault, reference as `GCP_SERVICE_ACCOUNT_JSON`.
- [ ] Set a billing budget alert.

**CLI (why: this is the most repeated, most error-prone setup — script it once, reproduce anywhere). Full idempotent version: [`scripts/provision-gcp.sh`](../../scripts/provision-gcp.sh).**
```bash
gcloud auth login
gcloud config set project "$GCP_PROJECT_ID"

# Enable required APIs
gcloud services enable documentai.googleapis.com drive.googleapis.com \
  iam.googleapis.com cloudbilling.googleapis.com

# Service account for n8n automation (Document AI + Drive)
gcloud iam service-accounts create companybrain-n8n \
  --display-name="Company Brain n8n automation"
SA="companybrain-n8n@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

# Grant Document AI usage
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${SA}" --role="roles/documentai.apiUser"

# Key → store in the n8n vault (NEVER commit; path is gitignored)
gcloud iam service-accounts keys create ./companybrain-n8n-key.json \
  --iam-account="$SA"

# Budget alert (needs the billing account id)
gcloud billing budgets create \
  --billing-account="$BILLING_ACCOUNT_ID" \
  --display-name="CompanyBrain monthly" \
  --budget-amount=100USD \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9
```
> **Custom Extractor caveat:** the *processor* can be created via the Document AI REST API, but **training a Custom Extractor requires the console labeling UI** — there is no CLI for labeling. Create/pin the processor, then train in the console (see [ocr/README.md](../../ocr/README.md) §3). Record `DOCAI_PROCESSOR_ID` / `DOCAI_PROCESSOR_VERSION`.

## 4. Google Drive (archive)
- [ ] Create the root folder `CompanyBrain` → `DRIVE_ROOT_FOLDER_ID`.
- [ ] Pre-create the market path convention `/CompanyBrain/dubai_fnv/{yyyy}/{mm}/` (WF1 will create subfolders, but confirm permissions).
- [ ] Share the folder with the Drive service account (edit access) → `DRIVE_SERVICE_ACCOUNT_JSON`.

## 5. OpenAI
- [ ] Create/az org account; generate an API key → `OPENAI_API_KEY` (n8n vault + Xano env).
- [ ] Set a **monthly usage budget + alert** → `OPENAI_MONTHLY_BUDGET_ALERT_USD`.
- [ ] Record chosen models (config, swappable): `OPENAI_MODEL_CHAT`, `OPENAI_MODEL_NORMALIZATION`, `OPENAI_MODEL_INSIGHT`.

## 6. n8n (automation)
- [ ] Provision the n8n instance (cloud or self-hosted) → `N8N_BASE_URL`.
- [ ] Add credentials in the n8n vault: Xano service token, GCP service account (Document AI + Drive), OpenAI key. **These live only here + Xano env.**
- [ ] Set the webhook secret to match Xano → `N8N_WEBHOOK_HMAC_SECRET` == `XANO_WEBHOOK_HMAC_SECRET`.
- [ ] Note the ingestion webhook URL → `N8N_INGESTION_WEBHOOK_URL` (Xano will call this to start WF1).

**CLI (self-hosted n8n only; why: version-control workflows as JSON in `/automation/workflows`). On n8n Cloud, export via UI or REST instead. Wrapper: [`scripts/export-n8n-workflows.sh`](../../scripts/export-n8n-workflows.sh).**
```bash
# Self-hosted only:
n8n export:workflow --all --separate --output=automation/workflows/
n8n import:workflow --separate --input=automation/workflows/   # restore
```

## 7. Bubble (frontend)
- [ ] Create the Bubble app `company-brain`; set dev/live.
- [ ] Install a charting plugin and the API Connector.
- [ ] Configure the API Connector against Xano dev (login + a read endpoint) to validate auth flow.
- [ ] Confirm **no** third-party secrets are stored in Bubble (only the Xano JWT flow).

> **No CLI:** Bubble has no official CLI. Version control the app via Bubble's built-in versioning + periodic manual app export (`.bubble` file) stored out-of-git if large. Document page/component specs in [Bubble.md](../Bubble.md) instead of exporting UI as code.

## 8. Wire-up smoke tests (must pass to close Phase 0 provisioning)
- [ ] **Auth:** Bubble login form → Xano `/auth/login` → JWT returned; a protected read works; a viewer token is refused on an admin route (403).
- [ ] **Webhook signing:** Xano fires a signed test webhook → n8n `SUB-verify-signature` accepts valid, rejects tampered.
- [ ] **OCR round trip:** n8n sends a sample scanned page to Document AI → gets structured output → writes a test `ocr_logs` row to Xano via the service token.
- [ ] **Drive archive:** n8n uploads a test file to the `CompanyBrain` folder and records the Drive id in Xano.
- [ ] **OpenAI reachability:** n8n makes a minimal OpenAI call and logs an `ai_usage_log` row.

## 9. Seed data
- [ ] Load [`backend/seeds`](../../backend/seeds) reference CSVs into Xano dev (countries, shipment/packing types, categories, starter products/aliases). See [backend/seeds/README.md](../../backend/seeds/README.md).

---

## Definition of done (provisioning)
All boxes above checked, all §8 smoke tests green, secrets recorded in vaults (names mirrored in `.env.example`), seeds loaded. Then proceed to the **OCR spike** ([ocr/README.md](../../ocr/README.md)) — the real Phase 0 objective.
