# Confirm Overlay Composer Replacement Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a confirm-only renderer overlay UX that replaces the prompt composer area while a confirm request is active.

**Architecture:** Keep the existing backend overlay contract unchanged. Add renderer state for one active confirm overlay request and a confirm-mode branch in `PromptComposerPanel`. Restore normal prompt mode on overlay resolution.

**Tech Stack:** TypeScript, React, Electron preload bridge, Vitest, React Testing Library

---

### Task 1: Add failing renderer test for overlay request -> composer replacement

**Files:**
- Modify: `src/renderer/__tests__/app-streaming.test.tsx`

**Step 1: Write failing test first**

Add a test that:
- emits `prompt_overlay_request` through mocked `onPromptOverlayEvent`,
- asserts composer switches to confirm mode (title/message/buttons visible),
- asserts normal prompt controls are not primary focus in that mode.

**Step 2: Run targeted test to confirm failure**

Run:
```bash
bun run test -- src/renderer/__tests__/app-streaming.test.tsx
```
Expected: FAIL because overlay UI is not rendered yet.

**Step 3: Commit failing test**

```bash
git add src/renderer/__tests__/app-streaming.test.tsx
git commit -m "test: require confirm overlay to replace composer UI"
```

---

### Task 2: Wire overlay event state in App

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/pita.d.ts` (if typings need extension)
- Modify: `src/renderer/__tests__/app-streaming.test.tsx`

**Step 1: Implement minimal overlay state handling**

In `App.tsx`:
- subscribe to `window.pita.session.onPromptOverlayEvent`,
- store active confirm request in component state,
- clear state on matching `prompt_overlay_resolved`.

Keep non-confirm kinds as no-op in this slice.

**Step 2: Re-run targeted test**

Run:
```bash
bun run test -- src/renderer/__tests__/app-streaming.test.tsx
```
Expected: PASS for overlay state transitions.

**Step 3: Commit implementation**

```bash
git add src/renderer/App.tsx src/renderer/pita.d.ts src/renderer/__tests__/app-streaming.test.tsx
git commit -m "feat: track confirm overlay state in app renderer"
```

---

### Task 3: Add failing prompt composer tests for confirm actions

**Files:**
- Modify: `src/renderer/__tests__/prompt-composer-runtime.test.tsx`

**Step 1: Write failing tests first**

Add tests that when confirm overlay mode is active:
- confirm button calls `submitPromptOverlay({ requestId, decision: "confirm" })`,
- cancel button calls `cancelPromptOverlay({ requestId })`,
- normal send/steer interactions are not used for overlay actions.

**Step 2: Run targeted test to confirm failure**

Run:
```bash
bun run test -- src/renderer/__tests__/prompt-composer-runtime.test.tsx
```
Expected: FAIL until composer confirm mode is implemented.

**Step 3: Commit failing tests**

```bash
git add src/renderer/__tests__/prompt-composer-runtime.test.tsx
git commit -m "test: require confirm overlay submit and cancel actions"
```

---

### Task 4: Implement confirm-mode UI in PromptComposerPanel

**Files:**
- Modify: `src/renderer/components/PromptComposerPanel.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/__tests__/prompt-composer-panel.test.tsx`
- Modify: `src/renderer/__tests__/prompt-composer-runtime.test.tsx`

**Step 1: Add confirm render branch**

In `PromptComposerPanel`:
- add optional `activeConfirmOverlay` prop,
- render confirm card (title/message/confirm/cancel buttons) when active,
- call handlers `onConfirmOverlaySubmit` / `onConfirmOverlayCancel`.

In `App.tsx`:
- pass active overlay + bound handlers that call preload session methods.

**Step 2: Re-run focused renderer tests**

Run:
```bash
bun run test -- src/renderer/__tests__/prompt-composer-panel.test.tsx src/renderer/__tests__/prompt-composer-runtime.test.tsx src/renderer/__tests__/app-streaming.test.tsx
```
Expected: PASS.

**Step 3: Commit implementation**

```bash
git add src/renderer/components/PromptComposerPanel.tsx src/renderer/App.tsx src/renderer/__tests__/prompt-composer-panel.test.tsx src/renderer/__tests__/prompt-composer-runtime.test.tsx src/renderer/__tests__/app-streaming.test.tsx
git commit -m "feat: replace composer UI with confirm overlay while active"
```

---

### Task 5: Add inline error handling for overlay action failures

**Files:**
- Modify: `src/renderer/components/PromptComposerPanel.tsx`
- Modify: `src/renderer/__tests__/prompt-composer-runtime.test.tsx`

**Step 1: Add failing test first**

Add a test where `submitPromptOverlay` rejects and confirm mode shows a concise inline error while staying active.

**Step 2: Run targeted test to confirm failure**

Run:
```bash
bun run test -- src/renderer/__tests__/prompt-composer-runtime.test.tsx
```
Expected: FAIL.

**Step 3: Implement minimal error state**

In confirm mode:
- catch submit/cancel promise errors,
- show inline error text,
- keep overlay visible.

**Step 4: Re-run targeted test**

Run:
```bash
bun run test -- src/renderer/__tests__/prompt-composer-runtime.test.tsx
```
Expected: PASS.

**Step 5: Commit changes**

```bash
git add src/renderer/components/PromptComposerPanel.tsx src/renderer/__tests__/prompt-composer-runtime.test.tsx
git commit -m "feat: keep confirm overlay active and show inline errors on action failure"
```

---

### Task 6: Docs and verification

**Files:**
- Modify: `docs/overview.md`
- Modify: `docs/architecture.md`
- Modify: `docs/ux.md`
- Modify: `docs/testing.md`

**Step 1: Update docs for implemented scope**

Document:
- confirm overlay now rendered in composer area,
- current limits (confirm-only; no choice/freeform UI yet),
- manual check steps for overlay request/resolve path.

**Step 2: Run verification**

Run:
```bash
bun run typecheck
bun run test -- src/renderer/__tests__/app-streaming.test.tsx src/renderer/__tests__/prompt-composer-panel.test.tsx src/renderer/__tests__/prompt-composer-runtime.test.tsx
bun run test
```
Expected: PASS.

**Step 3: Commit docs and verification-ready state**

```bash
git add docs/overview.md docs/architecture.md docs/ux.md docs/testing.md
git commit -m "docs: describe confirm overlay composer replacement behavior"
```

---

## Completion criteria

- Confirm overlay request replaces composer UI with confirm card.
- Confirm/cancel actions call preload overlay methods with correct request ID.
- Resolved events restore normal composer mode.
- Overlay action failures display inline error without dropping overlay state.
- Existing prompt send/steer/follow-up/abort behavior remains stable.
- Renderer-focused and full test suites pass.
