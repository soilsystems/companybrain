# ADR-004: AI chat orchestration runs in Xano (Phase 1), not n8n

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-06 |
| **Deciders** | Product owner, Architect |
| **Phase** | 0 (implemented Phase 3) |

## Context
The chat request is synchronous and latency-sensitive (target median < 8 s): Bubble sends a question, the backend runs a tool-selection LLM call → DB query → answer-composition LLM call, and returns. It could be orchestrated in Xano directly or delegated to an n8n workflow (WF7).

## Options considered
1. **Orchestrate in n8n (WF7)** — visual, good for complex branching; but adds a network hop + failure point on a synchronous path, and mixes user-facing request latency into the automation layer.
2. **Orchestrate in Xano** — the endpoint runs the tool loop and OpenAI calls itself; n8n stays focused on asynchronous automation (OCR, schedules, notifications).

## Decision
**Orchestrate chat in Xano (Option 2) for Phase 1.** n8n is reserved for automation. The `POST /chat/messages` contract is defined independently of where orchestration runs, so lifting it into n8n (WF7) later is transparent to Bubble.

## Consequences
- Positive: lower latency, fewer moving parts, simpler failure handling on the synchronous path.
- Negative / trade-offs: complex multi-step tool loops are less visual in Xano than in n8n. Accepted for the Phase 1 tool set (6 tools, mostly single-step). WF7 remains fully documented as the future migration target.
- Revisit: if the tool loop grows into multi-step planning/branching, migrate to WF7 ([Workflow.md](../Workflow.md) WF7).

## References
Supersedes the earlier "Xano-or-n8n hybrid" hedge. [Architecture.md](../Architecture.md) §7.2 · [AI.md](../AI.md) §1 · [Workflow.md](../Workflow.md) WF7
