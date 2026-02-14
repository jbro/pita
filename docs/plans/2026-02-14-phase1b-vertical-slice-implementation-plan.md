# Phase 1B Vertical Slice (Send + Stream + Abort) Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the static Phase 1 shell to a real single-session runtime path that supports send prompt, streamed timeline updates, and abort.

**Architecture:** Add a thin main-process orchestrator service, typed IPC contracts, and a preload bridge API. Replace renderer placeholder timeline data with event-driven state via a hook. Keep single-session scope and avoid steer/follow-up behavior in this phase.

**Tech Stack:** TypeScript, Electron, React, Vitest, React Testing Library, Playwright (Electron)

## Next Session Pickup (Side Quest)

After this plan is complete, the next session should pick up this side quest first:
- migrate the project from **npm** to **bun**.

Do not treat this note as an implementation plan. The migration must be planned in a dedicated planning session before code changes.

---

## Ground Rules

- Work only inside the assigned worktree.
- Follow TDD for behavior changes: failing test first, then minimal implementation.
- Keep this phase single-session only.
- Do not add steer/follow-up logic.

---

### Task 1: Define shared IPC contracts for session control and timeline events

**Files:**
- Create: `src/shared/ipc.ts`
- Modify: `src/shared/preload-api.ts`
- Test: `tests/main/preload-api.test.ts`

**Step 1: Write failing test for preload API shape**

Extend `tests/main/preload-api.test.ts` to assert preload API now includes:
- `session.sendPrompt`
- `session.abort`
- `session.onTimelineEvent`

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/preload-api.test.ts`
Expected: FAIL due to missing session API members.

**Step 3: Implement shared IPC and preload types**

- Add channel constants and payload types in `src/shared/ipc.ts`.
- Update `src/shared/preload-api.ts` to define a typed session API shape.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/main/preload-api.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/shared/ipc.ts src/shared/preload-api.ts tests/main/preload-api.test.ts
git commit -m "feat: add shared ipc contracts for session control and timeline events"
```

---

### Task 2: Add orchestrator service with normalized event output

**Files:**
- Create: `src/main/orchestrator/OrchestratorService.ts`
- Create: `tests/main/orchestrator-service.test.ts`

**Step 1: Write failing orchestrator tests**

Create tests for:
- `sendPrompt` transitions to running and emits normalized start/chunk/end events from a fake runtime source.
- `abort` during running transitions state and emits abort/idle state updates.
- `abort` while idle is safe no-op.

**Step 2: Run tests to verify failure**

Run: `npm run test -- tests/main/orchestrator-service.test.ts`
Expected: FAIL because orchestrator file does not exist.

**Step 3: Implement minimal orchestrator**

Implement a small class that:
- owns one active runtime adapter instance,
- exposes `sendPrompt(text)` and `abort()`,
- emits normalized timeline events through callback subscription.

Use minimal internal state: `idle | running | aborting | error`.

**Step 4: Run tests to verify pass**

Run: `npm run test -- tests/main/orchestrator-service.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/orchestrator/OrchestratorService.ts tests/main/orchestrator-service.test.ts
git commit -m "feat: add orchestrator service for send stream abort flow"
```

---

### Task 3: Wire main-process IPC handlers and event forwarding

**Files:**
- Create: `src/main/ipc/sessionIpc.ts`
- Modify: `src/main/main.ts`
- Test: `tests/main/session-ipc.test.ts`

**Step 1: Write failing IPC tests**

Add tests to verify:
- `session.sendPrompt` handler calls orchestrator with prompt text.
- `session.abort` handler calls orchestrator abort.
- timeline events are forwarded to renderer on correct channel.

Use mocks/stubs for `ipcMain`, `BrowserWindow.webContents.send`, and orchestrator.

**Step 2: Run tests to verify failure**

Run: `npm run test -- tests/main/session-ipc.test.ts`
Expected: FAIL due to missing IPC wiring module.

**Step 3: Implement minimal IPC module + startup wiring**

- Register invoke handlers in `sessionIpc.ts`.
- Forward orchestrator timeline events to focused/main window.
- Update `main.ts` initialization to create orchestrator and call IPC registration.

**Step 4: Run tests to verify pass**

Run: `npm run test -- tests/main/session-ipc.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/ipc/sessionIpc.ts src/main/main.ts tests/main/session-ipc.test.ts
git commit -m "feat: wire session ipc handlers and timeline event forwarding"
```

---

### Task 4: Expose typed session bridge in preload

**Files:**
- Modify: `src/preload/preload.ts`
- Test: `tests/main/preload-bridge.test.ts`

**Step 1: Write failing preload bridge test**

Test that preload bridge exposes session methods and `onTimelineEvent` unsubscribe behavior.

**Step 2: Run test to verify failure**

Run: `npm run test -- tests/main/preload-bridge.test.ts`
Expected: FAIL due to missing bridge behavior.

**Step 3: Implement minimal preload bridge**

- Wire `ipcRenderer.invoke` for send/abort.
- Wire `ipcRenderer.on` for timeline events.
- Return unsubscribe function from `onTimelineEvent`.

**Step 4: Run test to verify pass**

Run: `npm run test -- tests/main/preload-bridge.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/preload/preload.ts tests/main/preload-bridge.test.ts
git commit -m "feat: expose typed preload session bridge"
```

---

### Task 5: Add renderer timeline hook and event-driven state

**Files:**
- Create: `src/renderer/hooks/useSessionTimeline.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/TimelinePanel.tsx`
- Test: `src/renderer/__tests__/app-streaming.test.tsx`

**Step 1: Write failing renderer integration test**

Test that:
- app subscribes to timeline events,
- emitted events append/update timeline rows,
- error events render visibly.

Mock `window.pita.session.onTimelineEvent` in test setup.

**Step 2: Run test to verify failure**

Run: `npm run test -- src/renderer/__tests__/app-streaming.test.tsx`
Expected: FAIL due to missing hook and event wiring.

**Step 3: Implement minimal hook and app wiring**

- Build `useSessionTimeline` with subscribe/unsubscribe.
- Replace static timeline array in `App.tsx`.
- Update `TimelinePanel` shape if needed for streamed entries.

**Step 4: Run test to verify pass**

Run: `npm run test -- src/renderer/__tests__/app-streaming.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/hooks/useSessionTimeline.ts src/renderer/App.tsx src/renderer/components/TimelinePanel.tsx src/renderer/__tests__/app-streaming.test.tsx
git commit -m "feat: render timeline from streamed session events"
```

---

### Task 6: Wire prompt composer send/abort behavior to runtime state

**Files:**
- Modify: `src/renderer/components/PromptComposerPanel.tsx`
- Modify: `src/renderer/App.tsx`
- Test: `src/renderer/__tests__/prompt-composer-runtime.test.tsx`

**Step 1: Write failing composer runtime test**

Test that:
- send button calls preload `sendPrompt` with input text,
- send is disabled while running,
- abort is enabled only while running,
- abort triggers preload `abort`.

**Step 2: Run test to verify failure**

Run: `npm run test -- src/renderer/__tests__/prompt-composer-runtime.test.tsx`
Expected: FAIL due to placeholder-only component behavior.

**Step 3: Implement minimal composer runtime wiring**

- Add controlled input state.
- Wire send and abort callbacks.
- Drive button enabled/disabled from run state.

**Step 4: Run test to verify pass**

Run: `npm run test -- src/renderer/__tests__/prompt-composer-runtime.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/components/PromptComposerPanel.tsx src/renderer/App.tsx src/renderer/__tests__/prompt-composer-runtime.test.tsx
git commit -m "feat: connect prompt composer send and abort to session api"
```

---

### Task 7: Update and stabilize e2e smoke test for the vertical slice

**Files:**
- Modify: `tests/e2e/ui-shell.smoke.spec.ts`
- Modify: `playwright.config.ts` (only if timeout/retries needed)
- Modify: `scripts/run-electron-e2e.mjs` (only if launch helper needed)

**Step 1: Write failing e2e assertion update**

Extend smoke test to verify:
- prompt input exists,
- send action is callable,
- timeline shows at least one runtime-driven update.

(Use deterministic test mode/runtime stub if needed.)

**Step 2: Run e2e to verify failure**

Run: `npm run test:e2e`
Expected: FAIL until runtime-driven assertion is implemented.

**Step 3: Implement minimal e2e support**

Add the minimal deterministic behavior needed for reliable smoke assertion.

**Step 4: Run e2e to verify pass**

Run: `npm run test:e2e`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/e2e/ui-shell.smoke.spec.ts playwright.config.ts scripts/run-electron-e2e.mjs
git commit -m "test: extend electron smoke test for send stream abort slice"
```

---

### Task 8: Refine docs for the completed slice

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/testing.md`
- Modify: `docs/workflow.md` (if handoff or gate wording needs adjustment)

**Step 1: Write doc updates**

Document:
- Phase 1B scope implemented,
- new session IPC/runtime behavior,
- updated verification expectations.

**Step 2: Run doc sanity checks (manual)**

Confirm no contradictions between README, architecture, and testing flow.

**Step 3: Commit docs**

```bash
git add README.md docs/architecture.md docs/testing.md docs/workflow.md
git commit -m "docs: describe phase1b vertical slice runtime wiring"
```

---

### Task 9: Final verification and handoff checkpoint

**Files:**
- Modify: `docs/plans/2026-02-14-phase1b-vertical-slice-design.md` (optional acceptance note)

**Step 1: Run full verification**

Run:
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`

Expected: PASS.

**Step 2: Manual smoke with human partner**

Run `npm run dev` and confirm:
- app window opens,
- prompt send action works,
- timeline updates stream,
- abort is visible and callable during run.

**Step 3: If all pass, stop for review**

Report exact output and summarize:
- implemented behavior,
- verification evidence,
- known limitations.

**Step 4: Commit acceptance note (optional)**

```bash
git add docs/plans/2026-02-14-phase1b-vertical-slice-design.md
git commit -m "docs: record phase1b verification outcomes"
```
