# Contributing to Company Brain

This is a **no-code-first** project. The "code" is mostly configuration, documentation, and exported definitions. The discipline below keeps the GitHub repo an honest mirror of the Bubble/Xano/n8n runtime.

## The one rule
> **A runtime change and its repo export land in the same PR.** Change a Xano table → commit the updated `/backend/schema/*.json` in the same PR. Change an n8n workflow → commit the updated `/automation/workflows/*.json`. Change a prompt → commit it under `/ai/prompts`. If the runtime changes and the repo doesn't, the repo is now lying — and the repo is our memory.

## Branches
- `main` — always matches production runtime + approved docs. Protected.
- `feat/<phase>-<topic>` — new work, e.g. `feat/p1-ingestion-pipeline`
- `fix/<topic>` · `docs/<topic>` · `chore/<topic>`

## Commits
- Imperative, scoped: `docs(ocr): add spike scorecard`, `schema(daily_prices): make price nullable`.
- Reference the phase where relevant.

## Pull requests
- Describe **what changed in the runtime** and link the exported files.
- These paths require review (they are the platform's contracts):
  - `docs/API.md`, `docs/Database.md`, `backend/schema/**`
  - `ai/prompts/**`, `ai/tools/**`
  - `automation/workflows/**`
- Any AI prompt/model change must include an eval run result (`ai/evals/results`) once evals exist (Phase 3+).
- Any extraction change must keep the golden fixtures passing (`testing/fixtures`).

## Decisions
Non-trivial or irreversible choices get an ADR in `/docs/decisions` (copy `ADR-000-template.md`). If implementation reveals a better approach, **write the trade-offs in an ADR before changing course** — do not silently reverse a prior decision.

## Secrets
Never commit real credentials. `.env.example` documents names only. Real values live in platform vaults (n8n Credentials, Xano env). Sample market reports and raw OCR output are commercially sensitive — commit only anonymized/cleared samples under `ocr/samples/`.

## Phase discipline
Do not implement future phases early. Complete and validate a phase (acceptance criteria in [Roadmap.md](docs/Roadmap.md)) before starting the next.
