# Extension Prompt Overlay Backend Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a confirm-only, backend-first prompt overlay flow across runtime adapter, orchestrator, IPC, and preload.

**Architecture:** Extend shared IPC contracts and preload API with prompt overlay request/resolve primitives. Add single-active overlay lifecycle handling to the orchestrator and connect it to local SDK adapter hooks. Keep renderer UX minimal in this slice and verify behavior with focused unit tests.

**Tech Stack:** TypeScript, Electron IPC, Vitest

---

### Task 1: Add shared overlay IPC contract types

**Files:**
- Modify: `src/shared/ipc.ts`
- Test: `tests/main/preload-api.test.ts` (compile-time usage)

**Step 1: Add failing type expectation in test**

Extend `tests/main/preload-api.test.ts` to reference new overlay API method names in `PitaSessionApi`.

**Step 2: Run targeted test to confirm failure**

Run:
```bash
bun run test -- tests/main/preload-api.test.ts
```
Expected: FAIL because overlay types/methods do not exist yet.

**Step 3: Add IPC channels and payload types**

In `src/shared/ipc.ts`, add:
- `sessionPromptOverlaySubmit`
- `sessionPromptOverlayCancel`
- `sessionPromptOverlayEvent`

Add overlay payload types:
- `PromptOverlayRequestEvent` (`kind: "confirm"`)
- `PromptOverlayResolvedEvent`
- `PromptOverlaySubmitRequest`
- `PromptOverlayCancelRequest`

Add a union for overlay events forwarded to renderer.

**Step 4: Re-run targeted test**

Run:
```bash
bun run test -- tests/main/preload-api.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/shared/ipc.ts tests/main/preload-api.test.ts
git commit -m "feat: add shared prompt overlay IPC contracts"
```

---

### Task 2: Extend preload API types and no-op stub

**Files:**
- Modify: `src/shared/preload-api.ts`
- Test: `tests/main/preload-api.test.ts`

**Step 1: Add failing API shape assertions**

In `tests/main/preload-api.test.ts`, assert `pita.session` includes:
- `onPromptOverlayEvent`
- `submitPromptOverlay`
- `cancelPromptOverlay`

**Step 2: Run targeted test to confirm failure**

Run:
```bash
bun run test -- tests/main/preload-api.test.ts
```
Expected: FAIL.

**Step 3: Update typed API and stub methods**

Add overlay listener and invoke methods to `PitaSessionApi` in `src/shared/preload-api.ts`. Implement no-op stubs in `preloadApi`.

**Step 4: Re-run targeted test**

Run:
```bash
bun run test -- tests/main/preload-api.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/shared/preload-api.ts tests/main/preload-api.test.ts
git commit -m "feat: extend preload API types for prompt overlays"
```

---

### Task 3: Add orchestrator overlay lifecycle tests

**Files:**
- Modify: `tests/main/orchestrator-service.test.ts`

**Step 1: Write failing tests first**

Add tests that cover:
- request registration emits prompt overlay request event,
- submit resolves active request and emits resolved event,
- cancel resolves active request with cancelled status,
- stale `requestId` submit/cancel is rejected.

Use a fake runtime callback hook to capture resolver calls.

**Step 2: Run targeted tests to confirm failure**

Run:
```bash
bun run test -- tests/main/orchestrator-service.test.ts
```
Expected: FAIL because overlay orchestrator methods do not exist.

**Step 3: Commit failing tests**

```bash
git add tests/main/orchestrator-service.test.ts
git commit -m "test: add orchestrator prompt overlay lifecycle tests"
```

---

### Task 4: Implement orchestrator single-active overlay lifecycle

**Files:**
- Modify: `src/main/orchestrator/OrchestratorService.ts`
- Test: `tests/main/orchestrator-service.test.ts`

**Step 1: Add minimal overlay state and methods**

Implement:
- `requestPromptOverlay(request)`
- `submitPromptOverlay(requestId, decision)`
- `cancelPromptOverlay(requestId)`

Track one active overlay at a time. Reject second active request.

**Step 2: Emit overlay events to listeners**

Emit shared overlay events on request and resolution.

**Step 3: Re-run targeted tests**

Run:
```bash
bun run test -- tests/main/orchestrator-service.test.ts
```
Expected: PASS.

**Step 4: Commit implementation**

```bash
git add src/main/orchestrator/OrchestratorService.ts tests/main/orchestrator-service.test.ts
git commit -m "feat: add single-active prompt overlay lifecycle to orchestrator"
```

---

### Task 5: Add local SDK runtime adapter overlay bridge hook

**Files:**
- Modify: `src/main/runtime/localSdkRuntimeAdapter.ts`
- Modify: `tests/main/local-sdk-runtime-adapter.test.ts`

**Step 1: Add failing runtime adapter tests**

Add tests for:
- adapter forwards confirm request events to orchestrator-facing callback,
- adapter resolves submit/cancel back to session bridge.

**Step 2: Run targeted tests to confirm failure**

Run:
```bash
bun run test -- tests/main/local-sdk-runtime-adapter.test.ts
```
Expected: FAIL.

**Step 3: Implement minimal adapter bridge**

Add optional hook methods to `LocalSdkSession` and adapter for:
- receiving confirm request events,
- resolving active confirm requests.

Keep backward compatibility when SDK does not expose these hooks.

**Step 4: Re-run targeted tests**

Run:
```bash
bun run test -- tests/main/local-sdk-runtime-adapter.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/runtime/localSdkRuntimeAdapter.ts tests/main/local-sdk-runtime-adapter.test.ts
git commit -m "feat: add prompt overlay bridge hook to local sdk runtime adapter"
```

---

### Task 6: Add IPC handlers and event forwarding for overlays

**Files:**
- Modify: `src/main/ipc/sessionIpc.ts`
- Modify: `tests/main/session-ipc.test.ts`

**Step 1: Write failing IPC tests**

Add tests to verify:
- submit/cancel IPC handlers call orchestrator methods with payload,
- orchestrator overlay events are forwarded on `session.promptOverlayEvent` channel.

**Step 2: Run targeted tests to confirm failure**

Run:
```bash
bun run test -- tests/main/session-ipc.test.ts
```
Expected: FAIL.

**Step 3: Implement IPC handlers and forwarding**

Add invoke handlers for submit/cancel and forward overlay events to target window.

**Step 4: Re-run targeted tests**

Run:
```bash
bun run test -- tests/main/session-ipc.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/ipc/sessionIpc.ts tests/main/session-ipc.test.ts
git commit -m "feat: wire prompt overlay IPC handlers and forwarding"
```

---

### Task 7: Expose overlay methods in preload bridge

**Files:**
- Modify: `src/preload/preload.ts`
- Modify: `tests/main/preload-bridge.test.ts`

**Step 1: Add failing preload bridge tests**

Add tests to verify:
- `submitPromptOverlay` and `cancelPromptOverlay` invoke correct channels,
- `onPromptOverlayEvent` subscribes and returns working unsubscribe.

**Step 2: Run targeted tests to confirm failure**

Run:
```bash
bun run test -- tests/main/preload-bridge.test.ts
```
Expected: FAIL.

**Step 3: Implement preload bridge methods**

Add overlay invoke and listener methods wired to new IPC channels.

**Step 4: Re-run targeted tests**

Run:
```bash
bun run test -- tests/main/preload-bridge.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/preload/preload.ts tests/main/preload-bridge.test.ts
git commit -m "feat: expose prompt overlay bridge in preload"
```

---

### Task 8: Update docs and run final verification

**Files:**
- Modify: `docs/overview.md`
- Modify: `docs/architecture.md`
- Modify: `docs/testing.md`

**Step 1: Update docs for confirm-only backend slice**

Document:
- prompt overlay backend contract exists,
- current scope is confirm-only,
- richer overlay UX still pending.

**Step 2: Run verification gates**

Run:
```bash
bun run typecheck
bun run test -- tests/main/preload-api.test.ts tests/main/preload-bridge.test.ts tests/main/orchestrator-service.test.ts tests/main/local-sdk-runtime-adapter.test.ts tests/main/session-ipc.test.ts
bun run test
```
Expected: PASS.

**Step 3: Commit docs and verification-ready state**

```bash
git add docs/overview.md docs/architecture.md docs/testing.md
git commit -m "docs: describe confirm-only prompt overlay backend support"
```

---

## Completion checklist

- Shared overlay IPC types added.
- Preload API and bridge expose overlay methods.
- Orchestrator enforces single-active overlay lifecycle.
- Local SDK adapter bridges confirm requests and resolutions.
- IPC submit/cancel handlers and overlay event forwarding wired.
- Focused and full tests pass.
- Docs reflect implemented scope and remaining gaps.
