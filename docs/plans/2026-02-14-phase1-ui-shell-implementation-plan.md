# Phase 1 UI Shell Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a runnable Electron + React static UI shell for Pita with lightweight automated tests (Vitest/RTL) and a phase-gate Electron smoke test (Playwright).

**Architecture:** Create a minimal Electron main/preload pair and a React renderer that renders three static feature components (timeline, composer, command palette placeholder). Keep all behavior placeholder-only. Add fast DOM tests for frequent local runs and one Electron smoke test for phase-end validation.

**Tech Stack:** TypeScript, Electron, React, Vite, Vitest, React Testing Library, Playwright (Electron)

---

## Assumptions

- Package manager: `npm`.
- Node 20+ is available locally.
- This repository currently has no runtime code, so all app files are new.

---

### Task 1: Bootstrap project tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.npmrc` (optional; only if needed for local consistency)
- Modify: `.gitignore`

**Step 1: Initialize package metadata**

Create `package.json` with scripts for:
- `dev` (run Electron + Vite renderer)
- `build`
- `typecheck`
- `test`
- `test:watch`
- `test:e2e`

Include dependencies/devDependencies for Electron, React, Vite, TypeScript, Vitest, RTL, Playwright.

**Step 2: Add TypeScript and Vite configs**

Create TS configs for renderer and node/electron contexts. Create `vite.config.ts` for renderer build and `vitest.config.ts` for jsdom tests.

**Step 3: Add ignore entries**

Update `.gitignore` to include `node_modules`, `dist`, `out`, `playwright-report`, `.vite`, `.turbo` (if present later).

**Step 4: Install dependencies**

Run: `npm install`
Expected: install succeeds with no missing package errors.

**Step 5: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts .gitignore
git commit -m "chore: bootstrap electron react tooling"
```

---

### Task 2: Create Electron main process and preload stub

**Files:**
- Create: `src/main/main.ts`
- Create: `src/preload/preload.ts`
- Create: `src/shared/preload-api.ts`
- Test: `tests/main/preload-api.test.ts`

**Step 1: Write failing test for preload API shape**

Create `tests/main/preload-api.test.ts` asserting exported API shape from `src/shared/preload-api.ts` contains the expected stub namespace.

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/preload-api.test.ts`
Expected: FAIL because shared API file does not exist yet.

**Step 3: Implement minimal shared preload API and preload bridge**

- Add `src/shared/preload-api.ts` with a typed no-op object.
- Add `src/preload/preload.ts` exposing `window.pita` through `contextBridge`.
- Add `src/main/main.ts` with:
  - app ready lifecycle
  - BrowserWindow creation
  - secure webPreferences (contextIsolation true, preload set)
  - dev URL loading for renderer

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/main/preload-api.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/main.ts src/preload/preload.ts src/shared/preload-api.ts tests/main/preload-api.test.ts
git commit -m "feat: add electron main process and preload api stub"
```

---

### Task 3: Build static renderer shell with structured components

**Files:**
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/components/TimelinePanel.tsx`
- Create: `src/renderer/components/PromptComposerPanel.tsx`
- Create: `src/renderer/components/CommandPalettePlaceholder.tsx`
- Create: `src/renderer/components/ErrorBoundary.tsx`
- Create: `src/renderer/styles.css`
- Create: `index.html`
- Test: `src/renderer/__tests__/app-shell.test.tsx`

**Step 1: Write failing renderer shell test**

Create `app-shell.test.tsx` to assert presence of elements using `data-testid`:
- `timeline-panel`
- `prompt-composer-panel`
- `command-palette-placeholder`

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/__tests__/app-shell.test.tsx`
Expected: FAIL because renderer files/components do not exist.

**Step 3: Implement minimal renderer shell**

- Add static placeholder data in `App.tsx`.
- Compose three components.
- Add `ErrorBoundary` wrapping app.
- Add dark theme styles and top/bottom layout.
- Ensure all required test IDs exist.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderer/__tests__/app-shell.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add index.html src/renderer/main.tsx src/renderer/App.tsx src/renderer/components src/renderer/styles.css src/renderer/__tests__/app-shell.test.tsx
git commit -m "feat: render static phase1 ui shell components"
```

---

### Task 4: Add focused component DOM tests for frequent local runs

**Files:**
- Create: `src/renderer/__tests__/timeline-panel.test.tsx`
- Create: `src/renderer/__tests__/prompt-composer-panel.test.tsx`
- Create: `src/renderer/__tests__/command-palette-placeholder.test.tsx`
- Modify: `src/renderer/components/*.tsx` (only if test IDs/labels need adjustment)

**Step 1: Write failing component tests**

Add tests that assert:
- Timeline placeholder rows render (`user`, `assistant`, `tool` labels).
- Composer placeholder controls render (`send`, `steer`, `queue`, `abort`).
- Palette placeholder title/hint text renders.

**Step 2: Run tests to verify failure**

Run: `npm run test -- src/renderer/__tests__`
Expected: At least one FAIL due to missing text/test IDs.

**Step 3: Implement minimal component tweaks**

Adjust components only as needed for accessibility roles and stable test selectors.

**Step 4: Run tests to verify pass**

Run: `npm run test -- src/renderer/__tests__`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/__tests__ src/renderer/components
git commit -m "test: add fast dom tests for phase1 shell components"
```

---

### Task 5: Add Electron Playwright smoke test (phase-gate)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/ui-shell.smoke.spec.ts`
- Create: `scripts/run-electron-e2e.mjs`
- Modify: `package.json`

**Step 1: Write failing Electron smoke test**

Create test that launches Electron app and asserts the three shell test IDs exist in first window.

**Step 2: Run smoke test to verify failure**

Run: `npm run test:e2e`
Expected: FAIL initially (config or bootstrapping gaps).

**Step 3: Implement minimal e2e wiring**

- Add Playwright Electron config.
- Add launcher script pointing to Electron entry.
- Update `package.json` e2e script.

**Step 4: Run smoke test to verify pass**

Run: `npm run test:e2e`
Expected: PASS with one smoke test.

**Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/ui-shell.smoke.spec.ts scripts/run-electron-e2e.mjs package.json
git commit -m "test: add electron playwright smoke test for phase gating"
```

---

### Task 6: Validate runnable app and document verification flow

**Files:**
- Create: `docs/testing.md`
- Modify: `README.md`

**Step 1: Write failing doc expectation check (manual)**

Define required docs content:
- frequent local test loop command
- phase-end Playwright and manual smoke checklist
- expected run order

**Step 2: Add documentation**

Create `docs/testing.md` with:
- `npm run test` for frequent loop
- `npm run test:e2e` at phase end
- manual smoke checklist

Update `README.md` to link testing doc.

**Step 3: Run verification commands**

Run:
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`

Expected: all PASS.

**Step 4: Commit**

```bash
git add docs/testing.md README.md
git commit -m "docs: define phased testing workflow for ui shell"
```

---

### Task 7: Final phase wrap-up verification

**Files:**
- Modify: `docs/plans/2026-02-14-phase1-ui-shell-design.md` (only if acceptance notes are needed)

**Step 1: Run final full verification**

Run:
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`

Expected: PASS.

**Step 2: Perform manual smoke with user**

Checklist:
- app launches
- dark shell renders
- timeline/composer/palette placeholders visible

**Step 3: Record outcome**

Add short acceptance note in design doc or session notes.

**Step 4: Commit (if docs changed)**

```bash
git add docs/plans/2026-02-14-phase1-ui-shell-design.md
git commit -m "docs: record phase1 ui shell validation results"
```
