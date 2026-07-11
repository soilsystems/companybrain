# Company Brain

**AI-powered Business Intelligence platform — no-code first.**
Module 1: Dubai Fruits & Vegetables Market Intelligence.

Company Brain turns the daily market report (a scanned PDF) into permanent, structured, queryable historical data — with an auto-generated daily dashboard and an AI assistant that answers **only** from the database. It is architected to expand into a multi-module, multi-tenant SaaS (Documents, Sales, Procurement, Inventory, Executive Dashboards).

---

## Stack (no-code first)

| Layer | Tool |
|-------|------|
| Frontend | **Bubble** (responsive web) |
| Backend, DB & business logic | **Xano** (managed PostgreSQL + REST API) |
| Automation / orchestration | **n8n** |
| OCR | **Google Document AI** |
| AI | **OpenAI API** |
| File storage | **Google Drive** |
| Version control / docs | **GitHub** (this repo) |

> **This repo is the system of record, not the runtime.** The apps live in the Bubble/Xano/n8n clouds; this repo holds documentation, schema exports, workflow exports, AI configs, seed data, runbooks, and the OCR spike results. Rule: *if it defines behavior and can be exported as text, it is committed here.*

---

## Documentation (`/docs`) — read in this order

1. [PRD.md](docs/PRD.md) — vision, requirements, success metrics, risks, milestones
2. [Architecture.md](docs/Architecture.md) — components, data flow, AI flow, Market Intelligence Engine, scalability
3. [Database.md](docs/Database.md) — every Xano table, relationships, indexes
4. [Workflow.md](docs/Workflow.md) — the 9 n8n workflows + shared sub-workflows
5. [Bubble.md](docs/Bubble.md) — pages, reusable components, navigation, responsive
6. [AI.md](docs/AI.md) — intents, tools, anti-hallucination design
7. [Roadmap.md](docs/Roadmap.md) — phased delivery plan (0–7)
8. [API.md](docs/API.md) — Xano API contracts
9. [FolderStructure.md](docs/FolderStructure.md) — this repo's layout

Architecture decisions: [`/docs/decisions`](docs/decisions) · Operational runbooks: [`/docs/runbooks`](docs/runbooks)

---

## Repository map

```
docs/         Source-of-truth design docs + ADRs + runbooks
backend/      Xano system of record: schema exports, API inventories, function specs, seeds
automation/   n8n workflow JSON exports
ai/           Prompts (versioned), chat tool schemas, eval sets
frontend/     Bubble specs, style guide, API-connector setup
ocr/          Google Document AI: processor config, samples, and the OCR SPIKE (Phase 0)
testing/      Test plan, golden fixtures, API test collection
scripts/      Small utilities (the only "code" pre-SaaS)
```

---

## Current status — **Phase 0: Foundation & De-risking**

Phase 0 objective: provision the stack and **validate OCR accuracy on real scanned reports before building anything.**

| Step | Owner | Status |
|------|-------|--------|
| Documentation approved | — | ✅ Done |
| Repo scaffolded | AI architect | ✅ Done |
| Account provisioning | **Human (console access)** | ⬜ See [runbooks/phase0-provisioning.md](docs/runbooks/phase0-provisioning.md) |
| Document AI processor trained | **Human** | ⬜ |
| **OCR spike on 5 real reports** | **Human runs → results captured** | ⬜ See [ocr/README.md](ocr/README.md) |
| Seed data loaded to Xano | Human | ⬜ ([backend/seeds](backend/seeds)) |
| Go/No-Go for Phase 1 | Joint | ⬜ |

**Blocking dependency:** real scanned sample reports must be available for the spike.

Do **not** begin Phase 1 until the Phase 0 acceptance criteria in [Roadmap.md](docs/Roadmap.md#phase-0--foundation--de-risking-weeks-12) pass.

---

## Getting started (Phase 0)

1. Read the docs above (start with PRD + Architecture).
2. Follow [runbooks/phase0-provisioning.md](docs/runbooks/phase0-provisioning.md) to create accounts and credentials.
3. Copy `.env.example` → record real secret **names/locations** in each platform's vault (never commit values).
4. Run the OCR spike per [ocr/README.md](ocr/README.md); fill the scorecard.
5. Report results → Go/No-Go.

## Conventions
See [CONTRIBUTING.md](CONTRIBUTING.md). Core rule: a runtime change (Xano/n8n/Bubble) and its repo export land in the **same PR**, so the repo never lies about production.
