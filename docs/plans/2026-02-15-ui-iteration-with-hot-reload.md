# UI Iteration with Hot-Reload

**Date:** 2026-02-15  
**Status:** Draft  
**Session Mode:** Interactive iteration with tight feedback loop

## Goal

Enable rapid UI iteration without restarting Electron:
1. Verify Vite HMR works in the renderer during dev mode.
2. Establish tight iteration loop: request change → implement → observe → feedback.
3. Clean up/create UI tests after iteration completes.
4. Refine docs to capture UI changes.

## Approach

### Phase 1: Hot-Reload Verification

1. Start dev environment (`bun run dev`).
2. Make a small, visible renderer change (e.g., button color, text).
3. Confirm change appears without Electron restart.
4. Document hot-reload constraints (renderer-only vs main process changes).

### Phase 2: Iteration Loop

User-driven iteration cycle:
- User requests a UI change.
- Agent implements change.
- User observes and provides feedback.
- Repeat until user says "done."

Notes:
- Keep commits small and incremental (or batch at end, user's choice).
- Focus on renderer changes to maintain hot-reload benefit.
- If main-process changes are needed, call that out and decide together.

### Phase 3: Test Cleanup and Creation

After iteration completes:
1. Review existing UI tests (Playwright E2E, component tests).
2. Remove tests invalidated by UI changes.
3. Create new tests to cover updated UI behavior.
4. Run full test suite to verify.

### Phase 4: Documentation Refinement

Run `/refine-docs` (project-docs skill) to:
- Update `docs/ux.md` if interaction model changed.
- Update `docs/architecture.md` if component structure changed.
- Update `docs/testing.md` if test approach changed.
- Commit doc updates.

## Success Criteria

- Hot-reload workflow is verified and documented.
- All requested UI changes are implemented.
- Tests reflect new UI state.
- Documentation is up to date.

## Notes

- Main process changes (IPC, orchestrator) require Electron restart.
- Renderer changes (React components, styles) hot-reload via Vite HMR.
- If iteration scope grows beyond renderer, discuss break/restart strategy.
