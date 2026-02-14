# Deterministic Manual Abort Smoke Design

Date: 2026-02-14

## Context

The manual smoke checklist currently asks the operator to confirm that `Abort` is visible and callable during an active run. The default stub runtime can complete too quickly, which makes this check flaky and hard to reproduce.

## Objective

Make manual abort smoke deterministic in local dev without degrading automated test speed.

## Approaches Considered

### 1) Slow the default stub runtime for all modes

- **Pros:** minimal wiring, no config toggles.
- **Cons:** slows all flows, including e2e and fast local checks; risks making existing tests less stable.

### 2) Add explicit stub runtime modes via environment variable (**recommended**)

- **Pros:** keeps default fast path for automated checks; enables deterministic long-running behavior for manual smoke; explicit and easy to document.
- **Cons:** introduces one small configuration branch in runtime setup.

### 3) Add a renderer-only test toggle/button to force long run

- **Pros:** discoverable in UI.
- **Cons:** adds product surface for a test concern; requires extra UI state and guardrails.

## Recommended Design

Use `PITA_STUB_RUNTIME_MODE` to select stub behavior:

- `default` (current behavior): immediate `start -> chunk -> end`.
- `manual-abort`: staged chunk stream (fixed interval, multiple chunks) so run stays active long enough for human abort.

The dev workflow (`bun run dev`) will set `PITA_STUB_RUNTIME_MODE=manual-abort`. Production/e2e defaults remain unchanged unless mode is explicitly set.

## Component Changes

1. **Main runtime adapter extraction**
   - Move stub runtime creation into `src/main/runtime/stubRuntimeAdapter.ts`.
   - Expose `createStubRuntimeAdapter(mode?)` and mode resolver.

2. **Main process wiring**
   - Update `src/main/main.ts` to consume the extracted adapter factory.

3. **Dev script mode selection**
   - Update `package.json` dev script to export `PITA_STUB_RUNTIME_MODE=manual-abort` when launching Electron.

4. **Docs alignment**
   - Update manual smoke guidance in `docs/testing.md` and `docs/workflow.md`.

## Data Flow

1. Operator runs `bun run dev`.
2. Electron main process starts with `PITA_STUB_RUNTIME_MODE=manual-abort`.
3. `sendPrompt` triggers staged runtime callbacks over several intervals.
4. UI enters `running` state and leaves `Abort` enabled long enough for manual action.
5. `abort()` stops interval, emits abort path events, and returns to idle.

## Error Handling

- Unknown/empty mode falls back to `default` for safety.
- `abort()` when no active staged run remains no-op.
- Active staged run clears timer on completion or abort.

## Testing Strategy

- Add focused unit tests for stub adapter modes:
  - default mode emits immediate `start/chunk/end`.
  - manual-abort mode stays active and resolves cleanly on abort.
- Re-run orchestrator tests that validate abort behavior.
- Re-run node typecheck to ensure main-process TS integrity.
