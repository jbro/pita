# Extension Prompt Overlay Backend Design

**Date:** 2026-02-14  
**Status:** Proposed

## Goal

Add backend-first support for extension-driven prompt overlays, starting with a confirm-only vertical slice.

## Why this slice

Pita already supports prompt, steer, follow-up, and abort. It does not yet support extension questions that require structured user input. A confirm-only slice creates a real, testable contract across runtime, orchestrator, IPC, and preload without overbuilding UI behavior.

## Scope

### In scope

- Confirm-only prompt overlay event contract.
- Single active overlay request per session.
- Orchestrator lifecycle for request, submit, cancel, and resolved events.
- IPC wiring for overlay request/resolve flow.
- Preload bridge methods for overlay subscription and response.
- Unit tests for orchestrator and IPC behavior.

### Out of scope

- Choice and freeform prompt overlays.
- Full renderer overlay UX.
- Multi-request queueing semantics.
- Persistence of unresolved overlay requests.

## Approaches considered

### Approach A: Confirm-only vertical contract first (**recommended**)

Add one prompt kind (`confirm`) and wire it end to end.

- **Pros:** smallest useful slice, low risk, quick verification.
- **Cons:** additional work needed for `choice` and `freeform`.

### Approach B: Full contract upfront, partial execution

Define all overlay types now but implement only confirm behavior.

- **Pros:** fewer future type edits.
- **Cons:** higher design risk and more speculative API surface.

### Approach C: Adapter-internal prototype

Keep overlay behavior mostly internal first.

- **Pros:** fast local experimentation.
- **Cons:** weak shared contracts, likely rework.

## Recommendation

Use **Approach A**. It gives us a production-grade integration seam with minimal complexity and clear tests.

## Proposed architecture

Add a prompt overlay bridge through existing layers:

1. **Runtime adapter -> Orchestrator** emits normalized confirm request events.
2. **Orchestrator -> Renderer** forwards `prompt_overlay_request` through IPC.
3. **Renderer -> Orchestrator** submits confirm or cancel decisions with `requestId`.
4. **Orchestrator -> Runtime adapter** resolves active overlay requests.
5. **Orchestrator -> Renderer** emits `prompt_overlay_resolved` and clears active state.

## Component changes

- `src/shared/ipc.ts`
  - Add overlay channels and payload types.
- `src/shared/preload-api.ts`
  - Add overlay API methods for subscribe/submit/cancel.
- `src/preload/preload.ts`
  - Expose overlay methods over `ipcRenderer`.
- `src/main/orchestrator/OrchestratorService.ts`
  - Track one active overlay and enforce lifecycle rules.
- `src/main/ipc/sessionIpc.ts`
  - Register overlay handlers and forward overlay events.
- `src/main/runtime/localSdkRuntimeAdapter.ts`
  - Add confirm-request bridge hook and resolver path.

## Data flow

1. Runtime surfaces a confirm request.
2. Orchestrator validates no active request, stores request state, and emits request event.
3. Renderer receives request and presents UI (minimal UI can come later).
4. Renderer submits confirm/cancel for `requestId`.
5. Orchestrator validates `requestId`, resolves request in runtime, emits resolved event.
6. Orchestrator clears active request.

## Error handling

- Unknown `requestId` on submit/cancel: reject request and emit error event.
- Submit/cancel with no active overlay: no-op response with warning metadata.
- Second overlay request while one is active: reject second request and emit error event.
- Optional timeout path: mark as `expired` and emit resolved event.

## Testing strategy

- Orchestrator unit tests:
  - request -> submit -> resolved.
  - request -> cancel -> resolved.
  - stale request rejection.
  - single-active-request guard.
- IPC unit tests:
  - submit/cancel invoke orchestrator correctly.
  - request/resolved events forward to renderer channels.
- Preload bridge tests:
  - method shape and unsubscribe behavior.

## Risks and mitigations

- **Risk:** SDK event shape drift.  
  **Mitigation:** isolate SDK mapping in runtime adapter and normalize once.
- **Risk:** hidden unresolved overlay state.  
  **Mitigation:** enforce single-active invariant and explicit resolved events.
- **Risk:** renderer/backend contract drift.  
  **Mitigation:** shared IPC type authority and focused contract tests.

## Next step

Create a detailed implementation plan for this confirm-only backend slice, then execute in small TDD tasks with verification after each batch.
