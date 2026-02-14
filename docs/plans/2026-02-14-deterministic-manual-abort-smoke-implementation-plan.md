# Deterministic Manual Abort Smoke Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make manual abort smoke checks deterministic by introducing a staged stub runtime mode used by local dev runs.

**Architecture:** Extract the stub runtime into a mode-aware factory. Keep the default mode fast for automated checks, and run a staged `manual-abort` mode only in dev. Validate with targeted runtime/orchestrator tests and update manual smoke docs.

**Tech Stack:** TypeScript, Electron main process, Vitest, Bun scripts/docs.

---

### Task 1: Add failing tests for mode-aware stub runtime

**Files:**
- Create: `tests/main/stub-runtime-adapter.test.ts`
- Test: `tests/main/stub-runtime-adapter.test.ts`

**Step 1: Write the failing tests**

Add tests that expect:
- `default` mode emits `onStart`, `onChunk`, `onEnd` exactly once and no error.
- `manual-abort` mode stays active across timer ticks and resolves cleanly after `abort()` with `onError` and no `onEnd`.

**Step 2: Run test to verify it fails before implementation exists**

Run: `vitest run tests/main/stub-runtime-adapter.test.ts`

Expected: FAIL due missing `src/main/runtime/stubRuntimeAdapter` module (or missing exports).

**Step 3: Commit task**

```bash
git add tests/main/stub-runtime-adapter.test.ts
git commit -m "test: add stub runtime mode behavior tests"
```

### Task 2: Implement mode-aware stub runtime adapter and wire main process

**Files:**
- Create: `src/main/runtime/stubRuntimeAdapter.ts`
- Modify: `src/main/main.ts`
- Test: `tests/main/stub-runtime-adapter.test.ts`

**Step 1: Implement minimal runtime factory**

Implement:
- `StubRuntimeMode = "default" | "manual-abort"`
- `resolveStubRuntimeMode(env)` using `PITA_STUB_RUNTIME_MODE`
- `createStubRuntimeAdapter(mode?)`
- staged manual-abort implementation with fixed interval chunks and abort cleanup.

**Step 2: Wire the factory in main startup**

Replace inline stub adapter in `src/main/main.ts` with import from `src/main/runtime/stubRuntimeAdapter.ts`.

**Step 3: Run focused tests**

Run: `vitest run tests/main/stub-runtime-adapter.test.ts tests/main/orchestrator-service.test.ts`

Expected: PASS.

**Step 4: Commit task**

```bash
git add src/main/main.ts src/main/runtime/stubRuntimeAdapter.ts tests/main/stub-runtime-adapter.test.ts
git commit -m "feat: add mode-aware stub runtime adapter"
```

### Task 3: Enable deterministic manual-abort mode in dev workflow

**Files:**
- Modify: `package.json`

**Step 1: Set dev runtime mode**

Update `scripts.dev` to set `PITA_STUB_RUNTIME_MODE=manual-abort` when launching Electron.

**Step 2: Verify node-side typecheck**

Run: `tsc --noEmit -p tsconfig.node.json`

Expected: PASS with no output.

**Step 3: Commit task**

```bash
git add package.json
git commit -m "chore: enable manual-abort stub mode in dev"
```

### Task 4: Update manual smoke documentation

**Files:**
- Modify: `docs/testing.md`
- Modify: `docs/workflow.md`

**Step 1: Update smoke notes**

Document that `bun run dev` now sets `PITA_STUB_RUNTIME_MODE=manual-abort`, making abort callability checks deterministic.

**Step 2: Verify docs for clarity**

Run: `rg -n "manual-abort|PITA_STUB_RUNTIME_MODE|Abort" docs/testing.md docs/workflow.md`

Expected: matches in both files with consistent wording.

### Task 5: Run targeted verification pass

**Files:**
- Test only

**Step 1: Run focused tests**

Run: `vitest run tests/main/stub-runtime-adapter.test.ts tests/main/orchestrator-service.test.ts`

Expected: PASS.

**Step 2: Run typechecks**

Run:
- `tsc --noEmit -p tsconfig.node.json`
- `tsc --noEmit -p tsconfig.json`

Expected: PASS with no errors.

### Task 6: Optional phase-end smoke confirmation (manual)

**Files:**
- No code changes required

**Step 1: Launch dev app**

Run: `bun run dev`

Expected manual observation:
- send prompt starts running state,
- abort button is enabled during staged response,
- clicking abort returns UI to idle.
