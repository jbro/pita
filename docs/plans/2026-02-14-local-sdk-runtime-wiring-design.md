# Local SDK Runtime Wiring Design

**Date:** 2026-02-14  
**Status:** Proposed

## Context

Pita still boots the main-process orchestrator with `createStubRuntimeAdapter()`.
That path unblocks vertical-slice testing, but it does not use real Pi session state.
The next major step is to route prompt and abort through a local SDK-backed session.

## Goal

Replace the default stub runtime path with local SDK session wiring while preserving deterministic stub mode for smoke tests and fallback safety.

## Constraints

- Work only inside the assigned worktree.
- Keep TUI compatibility as the behavioral baseline.
- Keep Pi session files as runtime source of truth.
- Keep existing deterministic stub path available for controlled test/dev workflows.

## Approaches considered

### Approach A — Hard swap to SDK only (no fallback)

**Summary:** Replace the stub runtime with SDK runtime in `main.ts` and remove stub selection logic.

**Pros**
- Smallest runtime surface.
- Forces immediate SDK parity work.

**Cons**
- Breaks local workflows when SDK init fails.
- Makes e2e/manual smoke brittle in CI/dev environments without full SDK prerequisites.
- Increases rollback risk for this phase.

### Approach B — Runtime factory with SDK-first + explicit stub fallback (**recommended**)

**Summary:** Introduce a runtime factory that attempts SDK adapter creation first, then falls back to stub runtime only when explicitly configured or when SDK initialization fails.

**Pros**
- Moves production path to SDK now.
- Preserves deterministic stub modes for smoke and debugging.
- Enables incremental rollout and narrow test seams.

**Cons**
- Slightly more startup complexity.
- Requires clear logging/telemetry to avoid silent fallback confusion.

### Approach C — Keep stub in app, run SDK through sidecar process

**Summary:** Keep current runtime contract, spawn an SDK helper process, and bridge events over IPC.

**Pros**
- Isolates SDK dependency and crash domain.
- Flexible for future remote/worker models.

**Cons**
- Adds process and protocol complexity too early.
- Duplicates upcoming RPC-worker direction.
- Delays direct local SDK integration.

## Recommendation

Choose **Approach B**.

It changes the default runtime path to SDK without sacrificing deterministic smoke behavior or local recovery paths. It also keeps edits small and reviewable: runtime adapter, runtime factory, and startup wiring.

## Proposed design

## 1) Add `LocalSdkRuntimeAdapter`

Create `src/main/runtime/localSdkRuntimeAdapter.ts` that implements the existing `RuntimeAdapter` contract:
- `run(text, callbacks)`
- `abort()`

The adapter owns one active SDK session and one active run at a time. It translates SDK stream events into:
- `onStart(messageId)`
- `onChunk(messageId, chunk)`
- `onEnd(messageId)`
- `onError(error)`

## 2) Add `RuntimeAdapterFactory`

Create `src/main/runtime/runtimeAdapterFactory.ts` with SDK-first selection:
- If runtime mode is explicitly stub, return `createStubRuntimeAdapter(...)`.
- Otherwise try creating `LocalSdkRuntimeAdapter`.
- If SDK init fails, log a warning and fall back to stub (`default` mode unless explicitly configured).

This keeps startup resilient while making SDK the default path.

## 3) Update main startup wiring

In `src/main/main.ts`:
- Replace direct `createStubRuntimeAdapter()` call.
- Resolve runtime via factory before constructing `OrchestratorService`.
- Keep existing IPC/orchestrator behavior unchanged.

## 4) Keep deterministic smoke behavior

Retain `PITA_STUB_RUNTIME_MODE` support. For local smoke commands, we can still force `manual-abort` via env.

## Testing strategy

- Unit test `LocalSdkRuntimeAdapter` with a fake SDK binding:
  - emits start/chunk/end on run
  - abort forwards to SDK session abort path
- Unit test runtime factory:
  - SDK selected by default
  - stub selected when forced
  - fallback to stub on SDK initialization failure
- Re-run existing orchestrator and IPC tests to ensure no contract regressions.

## Risks and mitigations

- **Risk:** SDK export shape differs from assumptions.  
  **Mitigation:** isolate SDK loading behind one adapter module and keep type guards + clear errors.

- **Risk:** Silent fallback hides broken SDK path.  
  **Mitigation:** emit explicit startup warnings when fallback occurs.

- **Risk:** Event translation misses edge cases.  
  **Mitigation:** lock adapter behavior with focused tests and add follow-up integration tests in later batches.
