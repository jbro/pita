# Manual Audit Deficits Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the highest-priority deficits from the manual full-app audit: make SDK runtime startup work by default, make steer vs follow-up observable in UI, and tighten checklist/docs where expectations were ambiguous.

**Architecture:** Keep existing single-session orchestrator flow. Improve local SDK session method discovery and startup diagnostics in the runtime adapter path, then expose queue-type observability in the prompt composer using existing `queue.status` counts. Finally, update manual audit and testing docs so expected behavior is measurable.

**Tech Stack:** TypeScript, Electron main process, React, Vitest, Bun

---

### Task 1: Add failing tests for SDK session method discovery fallback

**Files:**
- Modify: `tests/main/local-sdk-runtime-adapter.test.ts`
- Test: `tests/main/local-sdk-runtime-adapter.test.ts`

**Step 1: Add failing tests first**

Add tests that assert `createLocalSdkSession()` can resolve a prompt method when the SDK session exposes one of these shapes:
- direct `prompt(text)`
- direct `sendPrompt(text)`
- nested surface such as `session.prompt(text)` or `session.sendPrompt(text)` (if present)

Also add a test that startup error text includes the method names that were attempted when discovery fails.

**Step 2: Run targeted tests to confirm failure**

Run:
```bash
bun run test -- tests/main/local-sdk-runtime-adapter.test.ts
```
Expected: FAIL until discovery logic and diagnostics are improved.

**Step 3: Commit failing tests**

```bash
git add tests/main/local-sdk-runtime-adapter.test.ts
git commit -m "test: add sdk prompt method discovery fallback coverage"
```

---

### Task 2: Implement SDK prompt method discovery improvements

**Files:**
- Modify: `src/main/runtime/localSdkRuntimeAdapter.ts`
- Modify: `tests/main/local-sdk-runtime-adapter.test.ts`

**Step 1: Implement minimal discovery expansion**

In `createLocalSdkSession()`:
- keep existing direct method checks,
- add nested object checks for known containers (`session`, `agentSession`, `manager`, or similar narrow list),
- centralize method resolution into a helper that returns both function and discovery metadata.

**Step 2: Improve startup failure diagnostics**

If prompt method is not found, throw an error that includes:
- attempted method names,
- whether direct and nested scans found candidates,
- top-level keys on the returned SDK session object.

This should directly improve triage for E1 failures.

**Step 3: Re-run targeted tests**

Run:
```bash
bun run test -- tests/main/local-sdk-runtime-adapter.test.ts tests/main/runtime-adapter-factory.test.ts
```
Expected: PASS.

**Step 4: Commit implementation**

```bash
git add src/main/runtime/localSdkRuntimeAdapter.ts tests/main/local-sdk-runtime-adapter.test.ts
git commit -m "feat: broaden local sdk prompt method discovery and diagnostics"
```

---

### Task 3: Add failing UI test for steer vs follow-up observability

**Files:**
- Modify: `src/renderer/__tests__/prompt-composer-runtime.test.tsx`
- Test: `src/renderer/__tests__/prompt-composer-runtime.test.tsx`

**Step 1: Add failing assertions first**

Add tests that require the queue status UI to show separate steer and follow-up counts (for example, `Steer: 1 · Follow-up: 2`) when both are present.

Keep existing total-badge behavior assertions only if still intentional.

**Step 2: Run targeted test to confirm failure**

Run:
```bash
bun run test -- src/renderer/__tests__/prompt-composer-runtime.test.tsx
```
Expected: FAIL until UI copy is updated.

**Step 3: Commit failing tests**

```bash
git add src/renderer/__tests__/prompt-composer-runtime.test.tsx
git commit -m "test: require distinct steer vs follow-up queue visibility"
```

---

### Task 4: Implement queue-type visibility in prompt composer

**Files:**
- Modify: `src/renderer/components/PromptComposerPanel.tsx`
- Modify: `src/renderer/App.tsx` (only if prop plumbing changes)
- Modify: `src/renderer/__tests__/prompt-composer-runtime.test.tsx`

**Step 1: Implement minimal UI change**

Update prompt composer queue status display to include separate counts:
- steer count,
- follow-up count,
- and optional total.

Keep behavior unchanged for send/steer/follow-up actions; this task is observability only.

**Step 2: Re-run targeted renderer tests**

Run:
```bash
bun run test -- src/renderer/__tests__/prompt-composer-runtime.test.tsx src/renderer/__tests__/prompt-composer-panel.test.tsx
```
Expected: PASS.

**Step 3: Commit implementation**

```bash
git add src/renderer/components/PromptComposerPanel.tsx src/renderer/App.tsx src/renderer/__tests__/prompt-composer-runtime.test.tsx
git commit -m "feat: show distinct steer and follow-up queue counts"
```

---

### Task 5: Clarify idle-abort and overlay-stability checks in manual audit docs

**Files:**
- Modify: `docs/checklists/manual-full-app-audit.md`
- Modify: `docs/testing.md`

**Step 1: Update checklist wording for F1 and G1**

Adjust F1 to explicitly state:
- idle `Abort` button disabled is expected,
- safety check should verify no crash and no invalid transitions.

Adjust G1 to include measurable signals:
- no console errors,
- no preload/IPC exceptions,
- no prompt lifecycle regressions.

**Step 2: Keep testing doc aligned**

Update `docs/testing.md` manual smoke notes with the same expectations so docs do not conflict.

**Step 3: Commit docs update**

```bash
git add docs/checklists/manual-full-app-audit.md docs/testing.md
git commit -m "docs: clarify idle abort and overlay stability verification criteria"
```

---

### Task 6: Verification pass for this deficit bundle

**Files:**
- No required file changes.

**Step 1: Run focused gates**

Run:
```bash
bun run test -- tests/main/local-sdk-runtime-adapter.test.ts tests/main/runtime-adapter-factory.test.ts src/renderer/__tests__/prompt-composer-runtime.test.tsx
bun run typecheck
```
Expected: PASS.

**Step 2: Run broad regression test pass**

Run:
```bash
bun run test
```
Expected: PASS.

**Step 3: Manual spot-check rerun for deficit items**

Run `bun run dev` and re-check these items from the manual audit:
- C2,
- C3,
- E1,
- F1,
- G1.

Record outcomes directly in:
- `docs/checklists/manual-full-app-audit.md`

---

## Completion criteria

- Default startup can use SDK path or emits materially improved actionable diagnostics for why it cannot.
- Steer and follow-up are visually distinguishable while queued.
- Manual audit criteria for idle abort and overlay stability are explicit and testable.
- Focused and full test suites pass.
