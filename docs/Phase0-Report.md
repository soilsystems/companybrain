# Phase 0 — Foundation & De-risking — Report

| | |
|---|---|
| **Status** | 🟡 In progress — preparation complete; awaiting provisioning + OCR spike run |
| **Date opened** | 2026-07-06 |
| **Objective** | Provision the no-code stack and **validate OCR accuracy on real scanned reports before building Phase 1.** |
| **Related** | [Roadmap.md](Roadmap.md) Phase 0 · [ocr/README.md](../ocr/README.md) · [runbooks/phase0-provisioning.md](runbooks/phase0-provisioning.md) |

This is the living Phase 0 deliverable. The AI architect has completed everything that does not require external console/billing access; the remaining items require a human operator and the real sample reports. **No OCR numbers are filled until the spike actually runs** — they will not be fabricated.

---

## 1. Completed (AI architect)

| Deliverable | Where | Status |
|-------------|-------|--------|
| Documentation set approved & realigned to decisions D1–D5 | `docs/` | ✅ |
| GitHub repo scaffolded (full folder tree per FolderStructure) | repo root | ✅ |
| Core repo files (README, .gitignore, .env.example, CONTRIBUTING) | repo root | ✅ |
| ADRs for all key decisions (001–009) | [docs/decisions](decisions) | ✅ |
| CLI usage policy + reproducible provisioning/export scripts | [ADR-009](decisions/ADR-009-cli-usage-policy.md), [scripts/](../scripts) | ✅ |
| Provisioning runbook (turnkey account/credential checklist) | [runbooks/phase0-provisioning.md](runbooks/phase0-provisioning.md) | ✅ |
| **OCR spike framework** (metrics, procedure, go/no-go, scorecard) | [ocr/README.md](../ocr/README.md), [ocr/spike/scorecard-template.md](../ocr/spike/scorecard-template.md) | ✅ |
| Document AI extraction template (draft config) | [ocr/templates/dubai-fnv-v1.json](../ocr/templates/dubai-fnv-v1.json) | ✅ |
| Seed data (countries, shipments, packing, categories, starter catalog) | [backend/seeds](../backend/seeds) | ✅ |
| Golden-fixture template | [testing/fixtures](../testing/fixtures) | ✅ |

## 2. Pending (human operator — requires console/billing access)

| Deliverable | Runbook | Blocker |
|-------------|---------|---------|
| Provision Xano, Bubble, n8n, GCP/Document AI, Drive, OpenAI | [phase0-provisioning.md](runbooks/phase0-provisioning.md) | Billing + signups |
| Train the Document AI Custom Extractor | [ocr/README.md](../ocr/README.md) §3 | GCP + sample reports |
| Wire-up smoke tests (auth, webhook signing, OCR round trip, Drive, OpenAI) | [phase0-provisioning.md](runbooks/phase0-provisioning.md) §8 | Provisioning done |
| Load seeds into Xano dev | [backend/seeds/README.md](../backend/seeds/README.md) | Xano ready |
| **Run the OCR spike on ≥ 5 real reports → fill scorecards** | [ocr/README.md](../ocr/README.md) | **Real scanned reports in hand** |

**Primary blocker:** availability of real scanned sample reports. Until they exist, the spike — the whole point of Phase 0 — cannot run.

---

## 3. OCR accuracy results
> ⬜ **NOT YET RUN.** To be populated from [ocr/README.md](../ocr/README.md) §6 after the spike. Headline metrics: overall field accuracy, critical-field (product/origin/price) accuracy, row detection/alignment, confidence calibration, cost/latency.

## 4. Issues encountered
> _(Filled during provisioning + spike. Preliminary architectural risks already logged in [PRD.md](PRD.md) §7.)_

## 5. Recommended improvements
> _(Filled from spike findings — e.g. template tweaks, more training data, source-format renegotiation.)_

## 6. Updated architecture (if required)
> No changes required from preparation. Any spike-driven change will be recorded as a new ADR before implementation (per [CONTRIBUTING.md](../CONTRIBUTING.md)). Current design already assumes imperfect OCR (staging gate + manual-entry fallback), so a 🟡 result needs process tuning, not redesign.

## 7. Go / No-Go recommendation
> ⬜ **Pending spike.** Decision rule fixed in advance ([ocr/README.md](../ocr/README.md) §4): 🟢 GO ≥ 90% overall / ≥ 95% critical · 🟡 Conditional 75–90% · 🔴 No-Go < 75% (renegotiate source format). The manual-entry fallback makes a 🟡 result viable.

---

## 8. Exit criteria (from Roadmap Phase 0)
- [ ] Docs approved & merged ✅ (approved)
- [ ] OCR spike ≥ 90% raw field accuracy, or documented fallback
- [ ] End-to-end hello-world (n8n → Document AI → Xano) works with real credentials
- [ ] Seeds load into Xano dev cleanly

When these pass, Phase 0 closes and Phase 1 (Ingestion + Staging) is authorized.
