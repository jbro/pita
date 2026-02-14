# Roadmap

## Phase 0 — Foundation

- Initialize repository and branch conventions.
- Define architecture and workflow docs.
- Lock core invariants (worktree ownership, session ownership).

## Phase 1 — V1 (Local Operator MVP)

- Electron shell + React renderer.
- Timeline + prompt composer UI.
- Dark mode and keyboard-first interactions.
- Command palette (app commands only).
- Local SDK embedding for primary agent.
- Streaming controls: prompt, steer, queue follow-up, abort.
- Orchestrator with foreground slot and background event queue.
- Multi-session support in architecture layer.

## Phase 2 — Session and Workspace Expansion

- Mission-control session overview UI.
- Session selection and lifecycle management in UI.
- Worktree/branch visibility in app.
- Initial side-panel framework.
- Interactive agent prompt overlay (extension-driven):
  - Multiple-choice options shown as clickable buttons.
  - Keyboard navigation with arrow keys and Enter.
  - Numeric quick-select shortcuts (for example `1`, `2`, `3`).
  - Freeform text response fallback.
  - Accept/reject confirmation prompts that replace the prompt area.

## Phase 3 — Remote and Worker Expansion

- RPC worker adapter production-ready.
- Remote worker host support.
- Lightweight remote steering workflows.
- Improved worker health and telemetry views.

## Phase 4 — Advanced Orchestration

- Self-steering experiments.
- Optional background orchestrator agent session.
- Inter-agent coordination policies and safety controls.
- Extension-driven workflows (questionnaires, remote steering tools).

## Risks and Mitigations

### Risk: Concurrent runtime collisions in one worktree
Mitigation: strict worktree lock policy and stale-lock handling.

### Risk: UI complexity grows faster than core reliability
Mitigation: keep v1 surface area small; prioritize orchestration contracts.

### Risk: Remote orchestration increases operational complexity
Mitigation: add RPC in phases behind adapter boundary; keep local SDK path stable.
