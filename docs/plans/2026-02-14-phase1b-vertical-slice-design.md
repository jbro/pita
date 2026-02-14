# Phase 1B Vertical Slice Design (Send + Stream + Abort)

**Date:** 2026-02-14  
**Status:** Approved for implementation planning

## Goal

Implement the first real runtime integration slice: send prompt, receive streamed timeline updates, and abort an active run.

## Scope

### In Scope

- Thin orchestrator in the Electron main process for one active foreground session.
- IPC handlers for prompt send and abort.
- Main-to-renderer timeline event stream.
- Renderer timeline state fed by runtime events instead of static placeholders.
- Prompt composer send + abort interactions with run-state-aware button behavior.
- Automated tests for renderer and orchestrator event/abort behavior.

### Out of Scope

- Multi-session UI and routing.
- Steer and queue follow-up semantics.
- Command palette behavior changes.
- Extension overlay prompt flows.
- Persistent app-owned session metadata.

## Architecture

This slice introduces a thin main-process orchestration layer without expanding beyond single-session behavior.

### Main Process

- Add `OrchestratorService` as runtime owner for the active local session.
- Register IPC handlers for:
  - `session.sendPrompt`
  - `session.abort`
- Subscribe to runtime events and publish normalized timeline events to renderer.

### Preload Bridge

Expose a typed, minimal API:

- `sendPrompt(text: string)`
- `abort()`
- `onTimelineEvent(callback)` with unsubscribe support

### Renderer

- Replace static timeline data with event-driven local state.
- Wire prompt composer actions to preload API.
- Reflect run state (`idle`, `running`, `aborting`, `error`) in control availability.

## Component and File Plan

### Main Process

- `src/main/orchestrator/OrchestratorService.ts` (new)
- `src/main/ipc/sessionIpc.ts` (new)
- `src/main/main.ts` (modify initialization)
- `src/shared/ipc.ts` (new channel and payload types)

### Preload

- `src/preload/preload.ts` (modify to expose session API)

### Renderer

- `src/renderer/hooks/useSessionTimeline.ts` (new)
- `src/renderer/App.tsx` (modify to use live state)
- `src/renderer/components/PromptComposerPanel.tsx` (modify send/abort wiring)
- `src/renderer/components/TimelinePanel.tsx` (modify incremental rendering)

## Data Flow

1. User submits prompt from composer.
2. Renderer invokes `window.pita.session.sendPrompt(text)`.
3. IPC handler calls orchestrator `sendPrompt`.
4. Orchestrator submits prompt to active runtime session.
5. Runtime emits stream events.
6. Orchestrator normalizes events and forwards `timeline.event` payloads.
7. Renderer hook ingests events and updates local timeline state incrementally.
8. User abort action invokes `window.pita.session.abort()`.
9. Orchestrator aborts active run and emits state/timeline updates.

## Error Handling

- Reject empty prompt input at IPC boundary.
- Catch runtime failures in orchestrator and emit safe `error` timeline events.
- Treat abort while idle as no-op.
- Ensure renderer unsubscribes event listeners on unmount.

## Testing Strategy

### Frequent Local Loop

Use Vitest + RTL to verify:

- send action dispatches through preload API.
- timeline updates from emitted stream events.
- abort control enables/disables by run state.
- error events render as timeline error rows.

### Main-Orchestrator Unit Tests

- event normalization correctness.
- abort flow state transitions.

### Phase-End Gate

Use Playwright Electron smoke test to verify:

- app launches,
- prompt submission path is callable,
- streamed timeline updates appear,
- abort control is visible and callable.

## Risks and Mitigations

- **Risk:** event payload drift between main and renderer.  
  **Mitigation:** shared IPC types in `src/shared/ipc.ts`.

- **Risk:** listener leaks in renderer and preload.  
  **Mitigation:** explicit unsubscribe contracts and hook cleanup.

- **Risk:** over-expanding scope into multi-session concerns.  
  **Mitigation:** enforce single-session orchestrator contract for Phase 1B.

## Acceptance Criteria

- Renderer can send a prompt via IPC.
- Timeline updates stream from runtime events.
- Abort action interrupts an active run and returns UI to idle state.
- Run state is visible in control enablement.
- Renderer and orchestrator tests pass.
- Phase-end Playwright smoke test passes.
