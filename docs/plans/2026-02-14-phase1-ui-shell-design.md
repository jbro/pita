# Phase 1 UI Shell Design (Static Scaffold)

**Date:** 2026-02-14  
**Status:** Approved for implementation planning

## Goal

Create a runnable Electron + React app shell for Pita that renders the v1 layout (timeline top, composer bottom, command palette placeholder) with no Pi runtime wiring yet.

## Scope

### In Scope

- Runnable Electron desktop app bootstrap.
- React renderer with dark-mode static shell.
- Structured renderer components:
  - Timeline panel
  - Prompt composer panel
  - Command palette placeholder
- Placeholder-only controls and data (no functional commands).
- Initial automated tests:
  - Fast DOM tests (Vitest + React Testing Library)
  - One Electron smoke test (Playwright)
- Manual smoke test checklist for phase completion.

### Out of Scope

- Pi SDK/session integration.
- IPC command/event contracts beyond preload stub.
- Streaming behavior and orchestration.
- Real command palette logic and keyboard shortcuts.
- Extension prompt overlays.

## Architecture

Pita uses a minimal three-layer bootstrap:

1. Electron main process for app and window lifecycle.
2. Preload layer for a secure, no-op bridge stub (`window.pita`).
3. React renderer for static shell composition and styles.

This preserves the compatibility direction in `docs/architecture.md` while keeping this phase intentionally small.

## Component Design

Planned file layout:

- `src/main/main.ts` — Electron startup and `BrowserWindow`.
- `src/preload/preload.ts` — stub API exposure.
- `src/renderer/main.tsx` — React entrypoint.
- `src/renderer/App.tsx` — shell layout composition.
- `src/renderer/components/TimelinePanel.tsx`
- `src/renderer/components/PromptComposerPanel.tsx`
- `src/renderer/components/CommandPalettePlaceholder.tsx`
- `src/renderer/styles.css` — dark minimal baseline.

Renderer behavior for this phase:

- Timeline shows hardcoded placeholder rows for user, assistant, and tool blocks.
- Composer shows placeholder input/actions (`send`, `steer`, `queue`, `abort`) as non-functional controls.
- Command palette placeholder is visible and static.

## Data Flow

- `App.tsx` owns static placeholder data.
- Props flow downward to child components.
- No global store, no session state, no runtime events.
- No real command dispatch.
- Preload bridge exists only as a stable shape for later IPC work.

## Error Handling

- Main process logs startup and load errors.
- Renderer uses a minimal error boundary to avoid blank-window failures.
- No retry UX in this phase.

## Testing Strategy

### Development Loop (Frequent)

Use Vitest + React Testing Library for fast feedback:

- Shell root renders.
- Timeline panel renders.
- Composer panel renders.
- Command palette placeholder renders.
- Basic placeholder labels and actions are present.

### Phase-End Validation (Less Frequent)

Use Playwright Electron smoke testing:

- Launch app.
- Confirm main window opens.
- Confirm core shell regions render via stable test IDs.

### Manual Smoke (Phase End)

- Launch app locally.
- Verify dark theme and two-region layout.
- Verify timeline placeholders are visible.
- Verify composer placeholders are visible.
- Verify palette placeholder is visible.

## Risks and Mitigations

- **Risk:** Overbuilding the static phase.  
  **Mitigation:** Keep all behavior placeholder-only.
- **Risk:** Test overhead too early.  
  **Mitigation:** Start with a minimal RTL suite and one Playwright smoke test.
- **Risk:** Future wiring churn.  
  **Mitigation:** Preserve component boundaries and preload API shape now.

## Acceptance Criteria

- App launches as an Electron window.
- Static v1 shell layout renders correctly.
- Components are separated by feature.
- No runtime or session behavior is implemented.
- Vitest/RTL tests pass.
- Initial Playwright Electron smoke test passes.
- Manual smoke checklist completed at phase end.
