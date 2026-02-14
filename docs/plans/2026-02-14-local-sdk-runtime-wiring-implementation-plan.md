# Local SDK Runtime Wiring Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace default stub runtime startup with real local SDK session wiring while preserving explicit stub mode for deterministic smoke and fallback safety.

**Architecture:** Add a `LocalSdkRuntimeAdapter` plus a runtime factory that chooses SDK-first and falls back to stub when forced or when SDK initialization fails. Keep orchestrator/IPC contracts unchanged.

**Tech Stack:** TypeScript, Electron main process, Vitest

---

### Task 1: Add failing tests for local SDK runtime adapter behavior

**Files:**
- Create: `tests/main/local-sdk-runtime-adapter.test.ts`

**Step 1: Write failing tests**

Add tests for:
- `run()` forwarding SDK stream lifecycle to runtime callbacks (`start`, `chunk`, `end`).
- `abort()` forwarding abort to active SDK run/session.

**Step 2: Run tests to verify failure**

Run:
```bash
bun run test -- tests/main/local-sdk-runtime-adapter.test.ts
```

Expected: FAIL because `src/main/runtime/localSdkRuntimeAdapter.ts` does not exist yet.

---

### Task 2: Implement local SDK runtime adapter

**Files:**
- Create: `src/main/runtime/localSdkRuntimeAdapter.ts`
- Modify: `tests/main/local-sdk-runtime-adapter.test.ts` (if fixtures need refinement)

**Step 1: Implement minimal adapter**

Implement:
- adapter class implementing `RuntimeAdapter`
- injectable SDK binding (`createSession`, `sendPrompt`, `abort`, `subscribe`)
- event translation from SDK stream events into orchestrator callbacks

**Step 2: Run focused tests**

Run:
```bash
bun run test -- tests/main/local-sdk-runtime-adapter.test.ts
```

Expected: PASS.

---

### Task 3: Add runtime factory and wire main startup to SDK-first path

**Files:**
- Create: `src/main/runtime/runtimeAdapterFactory.ts`
- Modify: `src/main/main.ts`
- Create: `tests/main/runtime-adapter-factory.test.ts`

**Step 1: Write failing runtime factory tests**

Cover:
- SDK runtime chosen by default.
- Stub runtime chosen when explicitly requested.
- SDK init failure falls back to stub runtime.

**Step 2: Implement runtime factory + startup wiring**

- Add factory that resolves runtime mode.
- Default to SDK path.
- On SDK bootstrap failure, log and return stub adapter.
- Update `main.ts` to consume factory output.

**Step 3: Run focused tests**

Run:
```bash
bun run test -- tests/main/runtime-adapter-factory.test.ts tests/main/orchestrator-service.test.ts tests/main/session-ipc.test.ts
```

Expected: PASS.

---

### Task 4: Add startup visibility for runtime selection and fallback reason

**Files:**
- Modify: `src/main/runtime/runtimeAdapterFactory.ts`
- Test: `tests/main/runtime-adapter-factory.test.ts`

Add structured startup metadata/logging so operators can confirm whether SDK or stub is active and why.

---

### Task 5: Update documentation for SDK-first runtime behavior

**Files:**
- Modify: `docs/overview.md`
- Modify: `docs/architecture.md`
- Modify: `docs/testing.md`

Document default SDK path, explicit stub override, and fallback behavior.

---

### Task 6: Verification pass for this phase slice

**Commands:**
```bash
bun run typecheck
bun run test -- tests/main/local-sdk-runtime-adapter.test.ts tests/main/runtime-adapter-factory.test.ts tests/main/orchestrator-service.test.ts tests/main/session-ipc.test.ts
```

Report exact output and remaining gaps for next batch.
