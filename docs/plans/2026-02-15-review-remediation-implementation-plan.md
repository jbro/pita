# Review Remediation Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all gaps and inconsistencies identified in the 2026-02-15 code review: add user messages to the timeline, add a preload/shared IPC sync check, deduplicate idle state emissions on abort, add clarifying code comments, and update docs to match implemented reality.

**Architecture:** Small, targeted changes across renderer hooks, orchestrator service, test files, and documentation. No new modules or architectural changes. Each task is independently verifiable.

**Tech Stack:** TypeScript, React, Vitest, Electron IPC

---

## Batch 1: High-impact behavior fixes

### Task 1: Add user message to timeline on prompt send

The timeline never shows the user's own message. `docs/ux.md` says the timeline shows "user messages" — fix the gap.

**Files:**
- Modify: `src/renderer/hooks/useSessionTimeline.ts`
- Modify: `src/renderer/App.tsx`
- Test: `src/renderer/__tests__/app-streaming.test.tsx`

**Step 1: Write failing test**

In `src/renderer/__tests__/app-streaming.test.tsx`, add a new test inside the existing `describe` block:

```tsx
it("appends a user message to the timeline when sendPrompt is called", async () => {
  render(<App />);

  const input = screen.getByPlaceholderText("Ask Pi to continue…");
  await act(async () => {
    (input as HTMLTextAreaElement).value = "hello world";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const sendButton = screen.getByRole("button", { name: "Send" });
  await act(async () => {
    sendButton.click();
  });

  const userItems = screen.getAllByText("user");
  expect(userItems.length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("hello world")).toBeTruthy();
});
```

**Step 2: Run test to verify failure**

Run:
```bash
bun run test -- src/renderer/__tests__/app-streaming.test.tsx
```
Expected: FAIL — no element with text "hello world" in the timeline.

**Step 3: Implement — add user message item before sendPrompt**

In `src/renderer/App.tsx`, import `useSessionTimeline`'s return type and modify `handleSend`:

Replace the existing `handleSend` in `App.tsx`:

```tsx
const handleSend = async (text: string): Promise<void> => {
  addUserMessage(text);
  await window.pita.session.sendPrompt(text);
};
```

This requires `addUserMessage` to be exposed from the hook. Modify `src/renderer/hooks/useSessionTimeline.ts`:

Add `addUserMessage` to the hook's return interface and value:

```ts
interface UseSessionTimelineResult {
  items: TimelineItem[];
  runState: SessionRunState;
  steerCount: number;
  followUpCount: number;
  addUserMessage: (text: string) => void;
}
```

Inside `useSessionTimeline()`, add:

```ts
const addUserMessage = (text: string): void => {
  setItems((previous) => [
    ...previous,
    { id: `user-${Date.now()}`, role: "user", text }
  ]);
};
```

Return it alongside the existing fields:

```ts
return { items, runState, steerCount, followUpCount, addUserMessage };
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun run test -- src/renderer/__tests__/app-streaming.test.tsx
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/hooks/useSessionTimeline.ts src/renderer/App.tsx src/renderer/__tests__/app-streaming.test.tsx
git commit -m "feat: show user message in timeline on prompt send"
```

---

### Task 2: Add preload ↔ shared IPC channel sync check

The preload script duplicates IPC channel names from `src/shared/ipc.ts`. Add a test that catches drift.

**Files:**
- Create: `tests/main/ipc-channel-sync.test.ts`

**Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest";
import { IPC_CHANNELS } from "../../src/shared/ipc";

describe("preload ↔ shared IPC channel sync", () => {
  it("preload IPC channel values match shared IPC_CHANNELS", async () => {
    // Read the preload source and extract channel string literals
    const fs = await import("node:fs");
    const path = await import("node:path");
    const preloadSource = fs.readFileSync(
      path.resolve(__dirname, "../../src/preload/preload.ts"),
      "utf-8"
    );

    const sharedChannelValues = Object.values(IPC_CHANNELS);

    for (const channel of sharedChannelValues) {
      expect(
        preloadSource.includes(`"${channel}"`),
        `Preload source is missing channel "${channel}" — sync with src/shared/ipc.ts`
      ).toBe(true);
    }
  });

  it("preload does not reference IPC channels absent from shared contract", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const preloadSource = fs.readFileSync(
      path.resolve(__dirname, "../../src/preload/preload.ts"),
      "utf-8"
    );

    // Extract all string literals that look like IPC channels (dotted names in quotes)
    const channelPattern = /["']session\.\w+["']/g;
    const preloadChannels = [...preloadSource.matchAll(channelPattern)].map((m) =>
      m[0].replace(/['"]/g, "")
    );
    const sharedChannelValues = new Set(Object.values(IPC_CHANNELS));

    for (const channel of preloadChannels) {
      expect(
        sharedChannelValues.has(channel as typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]),
        `Preload references channel "${channel}" not in shared IPC_CHANNELS — remove or add to src/shared/ipc.ts`
      ).toBe(true);
    }
  });
});
```

**Step 2: Run test to verify it passes (baseline is currently in sync)**

Run:
```bash
bun run test -- tests/main/ipc-channel-sync.test.ts
```
Expected: PASS (channels are currently identical)

**Step 3: Commit**

```bash
git add tests/main/ipc-channel-sync.test.ts
git commit -m "test: add preload vs shared IPC channel sync check"
```

---

### Task 3: Deduplicate idle state emission on abort

`OrchestratorService.abort()` sets state to `idle`, then `sendPrompt()`'s `finally` block also sets state to `idle` — emitting a redundant `state:idle` event.

**Files:**
- Modify: `src/main/orchestrator/OrchestratorService.ts`
- Test: `tests/main/orchestrator-service.test.ts`

**Step 1: Write failing test**

Add to `tests/main/orchestrator-service.test.ts`:

```ts
it("abort during running emits exactly one idle state transition", async () => {
  let resolveRun: (() => void) | undefined;

  const runtime: RuntimeAdapter = {
    run(_text: string, callbacks: RuntimeCallbacks): Promise<void> {
      callbacks.onStart("msg-1");
      return new Promise<void>((resolve) => {
        resolveRun = resolve;
      });
    },
    abort: vi.fn(() => {
      resolveRun?.();
    })
  };

  const service = new OrchestratorService(runtime);
  const stateEvents: string[] = [];

  service.onTimelineEvent((event) => {
    if (event.type === "state") {
      stateEvents.push(event.state);
    }
  });

  const runPromise = service.sendPrompt("hi");
  await Promise.resolve();

  await service.abort();
  await runPromise;

  const idleCount = stateEvents.filter((s) => s === "idle").length;
  expect(idleCount).toBe(1);
});
```

**Step 2: Run test to verify failure**

Run:
```bash
bun run test -- tests/main/orchestrator-service.test.ts
```
Expected: FAIL — `idleCount` is 2 (once from `abort()`, once from `sendPrompt()`'s `finally`).

**Step 3: Implement — make setState skip duplicate emissions**

In `src/main/orchestrator/OrchestratorService.ts`, change the `setState` method:

Replace:

```ts
  private setState(state: SessionRunState): void {
    this.state = state;
    this.emit({ type: "state", state });
  }
```

With:

```ts
  private setState(state: SessionRunState): void {
    if (this.state === state) {
      return;
    }

    this.state = state;
    this.emit({ type: "state", state });
  }
```

**Step 4: Run test to verify it passes**

Run:
```bash
bun run test -- tests/main/orchestrator-service.test.ts
```
Expected: PASS

**Step 5: Run full test suite to check for regressions**

Run:
```bash
bun run test
```
Expected: all 62+ tests pass. If any existing test expects a specific event sequence with duplicate idle, update that test's expectation.

**Step 6: Commit**

```bash
git add src/main/orchestrator/OrchestratorService.ts tests/main/orchestrator-service.test.ts
git commit -m "fix: deduplicate idle state emission on abort"
```

---

## Batch 2: Code comments and minor cleanups

### Task 4: Add event-ordering comment to LocalSdkRuntimeAdapter.run()

The fallback start/end guards are correct but non-obvious. Add a clarifying comment.

**Files:**
- Modify: `src/main/runtime/localSdkRuntimeAdapter.ts`

**Step 1: Add comment**

Above the `try` block in `run()`, add:

```ts
    // Event ordering contract:
    // The SDK may emit response.start/end synchronously during sendPrompt(),
    // or asynchronously via the onEvent subscription. The fallback guards below
    // ensure exactly one start and one end callback fires regardless of timing.
    // The onEvent subscription is registered before sendPrompt() is called, so
    // synchronous emissions are captured by the listener and the flags prevent
    // the fallback from double-firing.
```

Specifically, insert this comment in the `run()` method right before the line `try {` (after `let emittedEnd = false;`).

**Step 2: Run typecheck**

Run:
```bash
bun run typecheck
```
Expected: PASS (comment-only change)

**Step 3: Commit**

```bash
git add src/main/runtime/localSdkRuntimeAdapter.ts
git commit -m "docs: clarify event-ordering contract in LocalSdkRuntimeAdapter"
```

---

### Task 5: Add comment noting preload-api.ts stub is for tests/types only

**Files:**
- Modify: `src/shared/preload-api.ts`

**Step 1: Add comment**

At the top of the file, before the imports, add:

```ts
/**
 * Preload API type contract and test-only stub.
 *
 * The exported `preloadApi` object provides a no-op implementation used by
 * tests and as a type reference. The real preload bridge is built in
 * src/preload/preload.ts using contextBridge + ipcRenderer directly.
 * This stub is never used at runtime in production Electron builds.
 */
```

**Step 2: Commit**

```bash
git add src/shared/preload-api.ts
git commit -m "docs: clarify preload-api.ts stub is for tests and types only"
```

---

## Batch 3: Documentation alignment

### Task 6: Mark worktree lock policy as designed-not-implemented in architecture doc

**Files:**
- Modify: `docs/architecture.md`

**Step 1: Add status note**

Find the section `## Hard Invariant: One Active Agent per Worktree` and add a status note immediately after the heading:

Replace:

```md
## Hard Invariant: One Active Agent per Worktree

A worktree may only have one active runtime at a time.
```

With:

```md
## Hard Invariant: One Active Agent per Worktree

> **Status:** Designed but not yet implemented. The lock file, PID checks, and heartbeat logic described below are target behavior for Phase 2+. Current single-session operation avoids collisions by construction.

A worktree may only have one active runtime at a time.
```

**Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: mark worktree lock policy as designed, not yet implemented"
```

---

### Task 7: Remove premature "paused" state reference from UX doc

**Files:**
- Modify: `docs/ux.md`

**Step 1: Fix the state list**

Find the line listing state transitions in the Timeline section:

Replace:

```md
- clear state transitions (running, idle, paused, error)
```

With:

```md
- clear state transitions (running, idle, aborting, error)
```

This matches the implemented `SessionRunState` type. Paused is future work tied to foreground-slot swap.

**Step 2: Commit**

```bash
git add docs/ux.md
git commit -m "docs: fix timeline state list to match implemented SessionRunState"
```

---

### Task 8: Note collapsible tool blocks and multiline toggle as deferred in UX doc

**Files:**
- Modify: `docs/ux.md`

**Step 1: Add deferred notes**

In the Timeline section, after the `tool executions as collapsible blocks` line, add a note:

Replace:

```md
- tool executions as collapsible blocks
```

With:

```md
- tool executions as collapsible blocks (collapse/expand not yet implemented — flat list with role labels)
```

In the Prompt Composer Modes section, add a note after the multiline item:

Replace:

```md
Modes:
- single-line input
- multiline input
- confirm overlay replacement mode (when a confirm prompt overlay request is active)
```

With:

```md
Modes:
- single-line input (not yet distinct from multiline — textarea is always used)
- multiline input
- confirm overlay replacement mode (when a confirm prompt overlay request is active)
```

**Step 2: Commit**

```bash
git add docs/ux.md
git commit -m "docs: note collapsible blocks and multiline toggle as not yet implemented"
```

---

### Task 9: Add error→idle transition test to orchestrator

The orchestrator's `sendPrompt` catches errors, sets state to `error`, but the `finally` block then sets state to `idle`. This is intentional but untested.

**Files:**
- Test: `tests/main/orchestrator-service.test.ts`

**Step 1: Write the test**

Add to `tests/main/orchestrator-service.test.ts`:

```ts
it("transitions error then idle when runtime run throws", async () => {
  const runtime: RuntimeAdapter = {
    async run(_text: string, callbacks: RuntimeCallbacks): Promise<void> {
      callbacks.onStart("msg-1");
      callbacks.onError(new Error("runtime failure"));
      throw new Error("runtime failure");
    },
    abort: vi.fn()
  };

  const service = new OrchestratorService(runtime);
  const stateEvents: string[] = [];

  service.onTimelineEvent((event) => {
    if (event.type === "state") {
      stateEvents.push(event.state);
    }
  });

  await service.sendPrompt("hi");

  expect(stateEvents).toEqual(["running", "error", "idle"]);
});
```

**Step 2: Run test**

Run:
```bash
bun run test -- tests/main/orchestrator-service.test.ts
```
Expected: PASS (this tests existing behavior, not a new feature).

**Step 3: Commit**

```bash
git add tests/main/orchestrator-service.test.ts
git commit -m "test: cover error-to-idle state transition in orchestrator"
```

---

## Batch 4: Final verification

### Task 10: Full verification pass

**Step 1: Typecheck**

Run:
```bash
bun run typecheck
```
Expected: PASS

**Step 2: Full test suite**

Run:
```bash
bun run test
```
Expected: all tests pass

**Step 3: Commit any remaining fixups**

If any test expectations needed adjusting due to the `setState` dedup in Task 3, commit those together:

```bash
git add -A
git commit -m "fix: adjust test expectations after setState dedup"
```

If nothing changed, skip this step.
