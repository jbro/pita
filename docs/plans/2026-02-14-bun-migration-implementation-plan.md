# Bun Migration Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Bun the primary package manager and task runner for this repository while preserving runtime behavior and verification standards.

**Architecture:** Keep the existing Electron/React app architecture unchanged. Limit changes to package management artifacts, script invocation paths, and operational documentation so runtime semantics remain identical.

**Tech Stack:** Bun, TypeScript, Electron, Vite, Vitest, Playwright

---

## Guardrails

- Work only inside the assigned worktree.
- Do not modify app behavior unless required for Bun command compatibility.
- Preserve current verification scope and pass/fail criteria.
- Prefer small commits and verify after each task batch.

---

### Task 1: Baseline audit and migration surface map

**Files:**
- Create: `docs/plans/2026-02-14-bun-migration-audit-notes.md`
- Inspect (no edits yet): `package.json`, `scripts/run-electron-e2e.mjs`, `README.md`, `docs/testing.md`, `docs/workflow.md`

**Step 1: Record command references that assume npm/npx**

Run:
```bash
grep -RIn "\bnpm\b\|\bnpx\b" package.json scripts README.md docs
```

Capture exact locations in audit notes.

**Step 2: Identify lockfile authority decision**

Write one clear decision in audit notes: Bun lockfile becomes authoritative.

**Step 3: Commit audit notes**

```bash
git add docs/plans/2026-02-14-bun-migration-audit-notes.md
git commit -m "docs: map npm assumptions for bun migration"
```

---

### Task 2: Switch package manager artifacts to Bun authority

**Files:**
- Create: `bun.lock` (generated)
- Delete: `package-lock.json`
- Modify: `.gitignore` (only if lockfile or Bun cache handling needs adjustment)

**Step 1: Install dependencies with Bun**

Run:
```bash
bun install
```

Expected: install succeeds and lockfile is generated.

**Step 2: Remove npm lockfile**

Delete `package-lock.json` once Bun install succeeds.

**Step 3: Verify clean dependency state**

Run:
```bash
bun install --frozen-lockfile
```

Expected: no lockfile drift.

**Step 4: Commit lockfile transition**

```bash
git add bun.lock .gitignore
git rm package-lock.json
git commit -m "chore: adopt bun lockfile authority"
```

---

### Task 3: Update script execution paths for Bun

**Files:**
- Modify: `package.json`
- Modify: `scripts/run-electron-e2e.mjs`

**Step 1: Update package scripts to Bun-safe chaining**

Adjust script internals so nested task invocations use `bun run ...` instead of `npm run ...`.

**Step 2: Update e2e runner process spawning**

In `scripts/run-electron-e2e.mjs`, replace npm/npx child process calls with Bun equivalents.

**Step 3: Verify command entry points**

Run:
```bash
bun run build
bun run test:e2e -- --list
```

Expected: commands invoke expected toolchain paths without npm/npx.

**Step 4: Commit script updates**

```bash
git add package.json scripts/run-electron-e2e.mjs
git commit -m "chore: align scripts and e2e runner with bun"
```

---

### Task 4: Update operational documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/testing.md`
- Modify: `docs/workflow.md`
- Modify: `docs/overview.md` (if package manager references appear)

**Step 1: Replace npm install/run instructions with Bun commands**

Update quickstart and verification commands to Bun equivalents.

**Step 2: Update workflow handoff snippets**

Replace `npm run ...` gate commands in workflow handoff with `bun run ...`.

**Step 3: Add a short migration note**

State that Bun is authoritative and npm fallback is temporary (if enabled) or removed (if cut over immediately).

**Step 4: Commit docs updates**

```bash
git add README.md docs/testing.md docs/workflow.md docs/overview.md
git commit -m "docs: migrate developer workflow commands to bun"
```

---

### Task 5: Verification gates (mandatory)

**Files:**
- No required file changes.

**Step 1: Run static/type gates**

```bash
bun run typecheck
```
Expected: PASS.

**Step 2: Run unit/integration tests**

```bash
bun run test
```
Expected: PASS.

**Step 3: Run Electron smoke e2e gate**

```bash
bun run test:e2e
```
Expected: PASS.

**Step 4: Run manual smoke checklist**

```bash
bun run dev
```
Confirm:
- window opens,
- prompt send is callable,
- timeline updates stream,
- abort is visible/callable during run.

**Step 5: Record gate evidence**

Create a short run log in:
- `docs/plans/2026-02-14-bun-migration-verification.md`

Include exact command outputs (or concise excerpts plus pass/fail).

---

### Task 6: Finalization and handoff checkpoint

**Files:**
- Modify: `docs/plans/2026-02-14-bun-migration-design.md` (optional status update)
- Modify: `docs/plans/2026-02-14-bun-migration-implementation-plan.md` (optional completion note)

**Step 1: Confirm no npm/npx dependency remains in required workflow**

Run:
```bash
grep -RIn "\bnpm\b\|\bnpx\b" package.json scripts README.md docs
```

Expected: only intentional historical/context mentions remain.

**Step 2: Summarize completion state for review**

Report:
- changed files,
- verification results,
- any known compatibility caveats.

---

## Rollback strategy

Use rollback if any gate fails because of Bun compatibility rather than app logic.

1. Restore last known-good commit before migration changes.
2. Re-introduce `package-lock.json` from git history.
3. Revert script invocations to npm/npx paths in:
   - `package.json`
   - `scripts/run-electron-e2e.mjs`
4. Revert docs command examples to npm.
5. Re-run baseline gates with npm:
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:e2e`

Rollback trigger criteria:
- Bun cannot run a required gate reliably.
- Electron smoke test fails only under Bun launch path.
- Lockfile instability blocks deterministic installs.

## Verification gate policy

No merge/integration until all gates pass:

1. `bun run typecheck`
2. `bun run test`
3. `bun run test:e2e`
4. Manual smoke via `bun run dev`

If any gate fails, fix or rollback before proceeding.
