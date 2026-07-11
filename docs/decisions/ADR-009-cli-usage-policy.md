# ADR-009: Official CLIs allowed for provisioning & ops — never for business logic

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-06 |
| **Deciders** | Product owner, Architect |
| **Phase** | 0 |

## Context
No-code-first ([ADR-001](ADR-001-nocode-stack.md)) governs where **business logic, UI, workflows, DB design, and integrations** live — those must stay in Bubble/Xano/n8n. But *provisioning and operations* (creating projects, service accounts, IAM, enabling APIs, exporting/importing definitions, backups, branch protection) are click-ops in the web consoles: slow, unauditable, and not reproducible by another developer.

## Options considered
1. **Web UI only** — simplest mental model; but manual, error-prone, undocumented, hard to reproduce or review.
2. **Official CLIs for setup/ops, no-code for the product** — reproducible, documentable, reviewable provisioning; product logic untouched.
3. **Custom scripts/IaC (Terraform, etc.)** — powerful but reintroduces code/infra to maintain; contradicts the no-code intent for a small team.

## Decision
**Option 2.** Official platform CLIs **may** be used **only** for: account provisioning, environment setup, authentication, deployment, export/import, backup/restore, configuration management, project scaffolding, and CI/CD. They must **never** implement or replace application business logic, UI, workflows, DB design, or integrations — those remain 100% no-code.

Rules when a CLI is used:
- Prefer the **official** CLI for that platform.
- **Document every command** in the relevant runbook, with a one-line *why CLI instead of the web UI*.
- Ensure every action is **reproducible** by another developer (idempotent commands, env-var driven, committed to `/scripts` where scripted).
- CLI helper scripts in `/scripts` are thin wrappers over official CLIs (provisioning/export/backup) — **not** a place for app logic.

## CLI availability (honest matrix — verify at use time)
| Platform | Official CLI? | Used for | If no CLI |
|----------|---------------|----------|-----------|
| Google Cloud / Document AI | ✅ `gcloud` | enable APIs, service accounts, IAM, budgets, config | processor *training* is console-only (labeling UI) |
| GitHub | ✅ `git` / `gh` | repo, branch protection, CI | — |
| n8n | ✅ `n8n` (**self-hosted only**) | `export:workflow` / `import:workflow`, backup | n8n Cloud → REST API or UI export |
| Xano | ❌ no official CLI | — | use the **Xano Metadata API** (REST) for schema export/backup |
| Bubble | ❌ no official CLI | — | manual app export (`.bubble`) / built-in version control |
| OpenAI | ⚠️ SDK/CLI exists | not needed for provisioning | dashboard for keys/budgets |
| Google Drive | ⚠️ via Drive REST API | folder scaffolding (optional) | UI create + share to service account |

## Consequences
- Positive: provisioning is scripted, versioned, reviewable, and reproducible; onboarding a new developer is running documented commands, not following screenshots.
- Negative / trade-offs: two platforms (Xano, Bubble) lack CLIs, so their setup stays partly manual — documented as such, no pretending. `gcloud`/`gh` become a local prerequisite for the operator.
- Guardrail: any `/scripts` file that starts encoding *product* logic is a violation of this ADR and [ADR-001](ADR-001-nocode-stack.md).

## References
[ADR-001](ADR-001-nocode-stack.md) · [runbooks/phase0-provisioning.md](../runbooks/phase0-provisioning.md) · [scripts/README.md](../../scripts/README.md)
