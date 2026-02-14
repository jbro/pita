# Deterministic Manual Abort Smoke Verification

Date: 2026-02-14
Worktree: `.worktrees/chore-deterministic-abort-smoke`

## Targeted verification commands

### 1) Focused runtime + orchestrator tests

Command:

```bash
vitest run tests/main/stub-runtime-adapter.test.ts tests/main/orchestrator-service.test.ts
```

Output:

```text
 RUN  v3.2.4 /home/jbr/projects/pita/.worktrees/chore-deterministic-abort-smoke

 ✓ tests/main/stub-runtime-adapter.test.ts (2 tests) 4ms
 ✓ tests/main/orchestrator-service.test.ts (3 tests) 3ms

 Test Files  2 passed (2)
      Tests  5 passed (5)
   Start at  20:13:24
   Duration  443ms (transform 40ms, setup 0ms, collect 47ms, tests 8ms, environment 448ms, prepare 115ms)
```

Result: PASS

### 2) Typechecks

Command:

```bash
tsc --noEmit -p tsconfig.node.json
```

Output:

```text
(no output)
```

Result: PASS

Command:

```bash
tsc --noEmit -p tsconfig.json
```

Output:

```text
(no output)
```

Result: PASS

### 3) Docs consistency check

Command:

```bash
rg -n "manual-abort|PITA_STUB_RUNTIME_MODE|Abort" docs/testing.md docs/workflow.md
```

Output:

```text
docs/workflow.md:209:   - Confirm abort is visible and callable during a running stub response (`bun run dev` sets `PITA_STUB_RUNTIME_MODE=manual-abort`)
docs/testing.md:54:- Abort control is visible while running.
docs/testing.md:59:- The dev script sets `PITA_STUB_RUNTIME_MODE=manual-abort`, which keeps each stub run active long enough to click `Abort` reliably.
```

Result: PASS

## Manual smoke outcome

### Bun command availability

Command:

```bash
bun run dev
```

Output:

```text
/bin/bash: line 1: bun: command not found


Command exited with code 127
```

Result: BLOCKED in this environment for direct Bun invocation.

### Deterministic abort callability probe (equivalent runtime mode)

Build command:

```bash
tsc -p tsconfig.node.json && vite build
```

Output:

```text
vite v6.4.1 building for production...
transforming...
✓ 32 modules transformed.
rendering chunks...
computing gzip size...
dist/renderer/index.html                   0.39 kB │ gzip:  0.27 kB
dist/renderer/assets/index-D8JTfKAK.css    1.10 kB │ gzip:  0.51 kB
dist/renderer/assets/index-BCMx0MNE.js   146.53 kB │ gzip: 47.19 kB
✓ built in 511ms
```

Probe command: launch Electron with `PITA_STUB_RUNTIME_MODE=manual-abort`, send prompt, verify abort enable/disable around click.

Output:

```text
abort_enabled_before_click: true
abort_enabled_after_click: false
timeline_item_count: 2
```

Outcome: Deterministic abort callability confirmed for manual-abort mode.
