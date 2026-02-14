# Steer + Follow-Up Parity Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add steer and queue-follow-up behavior matching the Pi TUI, so users can interrupt (steer) or queue messages (follow-up) while the agent streams.

**Architecture:** Explicit `steer()`, `followUp()`, and `clearQueue()` methods added to every layer: RuntimeAdapter → OrchestratorService → IPC → preload → renderer. The renderer decides which to call based on user gesture and run state. Queue status events propagate pending counts to the UI.

**Tech Stack:** TypeScript, Electron IPC, React, Vitest

**Design doc:** `docs/plans/2026-02-14-steer-followup-parity-design.md`

---

### Task 1: Add IPC channel constants and event types

**Files:**
- Modify: `src/shared/ipc.ts`

**Step 1: Add the new channel constants and event type**

In `src/shared/ipc.ts`, add channels and extend the event union:

```ts
export const IPC_CHANNELS = {
  sessionSendPrompt: "session.sendPrompt",
  sessionAbort: "session.abort",
  sessionSteer: "session.steer",
  sessionFollowUp: "session.followUp",
  sessionClearQueue: "session.clearQueue",
  sessionTimelineEvent: "session.timelineEvent"
} as const;

// Add to SessionTimelineEvent union:
//   | { type: "queue.status"; steerCount: number; followUpCount: number }
```

Add `SessionSteerRequest` and `SessionFollowUpRequest` types (same shape as `SessionSendPromptRequest`):

```ts
export interface SessionSteerRequest {
  text: string;
}

export interface SessionFollowUpRequest {
  text: string;
}

export interface SessionClearQueueResponse {
  steering: string[];
  followUp: string[];
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (no consumers of new types yet, existing code unchanged)

**Step 3: Commit**

```bash
git add src/shared/ipc.ts
git commit -m "feat: add steer/followUp/clearQueue IPC types and channels"
```

---

### Task 2: Extend RuntimeAdapter interface and StubRuntimeAdapter

**Files:**
- Modify: `src/main/orchestrator/OrchestratorService.ts` (interface only)
- Modify: `src/main/runtime/stubRuntimeAdapter.ts`
- Create: `src/main/runtime/__tests__/stubRuntimeAdapter.test.ts`

**Step 1: Add methods to RuntimeAdapter interface**

In `OrchestratorService.ts`, extend the `RuntimeAdapter` interface:

```ts
export interface RuntimeAdapter {
  run(text: string, callbacks: RuntimeCallbacks): Promise<void>;
  abort(): void;
  steer?(text: string): void;
  followUp?(text: string): void;
  clearQueue?(): { steering: string[]; followUp: string[] };
}
```

**Step 2: Write failing tests for StubRuntimeAdapter steer/followUp**

Create `src/main/runtime/__tests__/stubRuntimeAdapter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createStubRuntimeAdapter } from "../stubRuntimeAdapter";

describe("StubRuntimeAdapter steer/followUp", () => {
  it("steer() queues a message", () => {
    const adapter = createStubRuntimeAdapter("manual-abort");
    adapter.steer!("fix the bug");
    const result = adapter.clearQueue!();
    expect(result.steering).toEqual(["fix the bug"]);
    expect(result.followUp).toEqual([]);
  });

  it("followUp() queues a message", () => {
    const adapter = createStubRuntimeAdapter("manual-abort");
    adapter.followUp!("then run tests");
    const result = adapter.clearQueue!();
    expect(result.steering).toEqual([]);
    expect(result.followUp).toEqual(["then run tests"]);
  });

  it("clearQueue() drains both queues", () => {
    const adapter = createStubRuntimeAdapter("manual-abort");
    adapter.steer!("a");
    adapter.followUp!("b");
    const first = adapter.clearQueue!();
    expect(first.steering).toEqual(["a"]);
    expect(first.followUp).toEqual(["b"]);
    const second = adapter.clearQueue!();
    expect(second.steering).toEqual([]);
    expect(second.followUp).toEqual([]);
  });

  it("default mode also supports steer/followUp", () => {
    const adapter = createStubRuntimeAdapter("default");
    adapter.steer!("msg");
    expect(adapter.clearQueue!().steering).toEqual(["msg"]);
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `bunx vitest run src/main/runtime/__tests__/stubRuntimeAdapter.test.ts`
Expected: FAIL (steer/followUp/clearQueue not yet implemented)

**Step 4: Implement steer/followUp/clearQueue in StubRuntimeAdapter**

In `stubRuntimeAdapter.ts`, add queue state and methods to both modes. Extract a helper that adds the queue methods to any adapter object:

```ts
function withQueueSupport(adapter: RuntimeAdapter): RuntimeAdapter {
  const steerQueue: string[] = [];
  const followUpQueue: string[] = [];

  adapter.steer = (text: string) => { steerQueue.push(text); };
  adapter.followUp = (text: string) => { followUpQueue.push(text); };
  adapter.clearQueue = () => {
    const result = { steering: [...steerQueue], followUp: [...followUpQueue] };
    steerQueue.length = 0;
    followUpQueue.length = 0;
    return result;
  };

  return adapter;
}
```

Apply `withQueueSupport()` to both the default and manual-abort adapters before returning.

**Step 5: Run tests to verify they pass**

Run: `bunx vitest run src/main/runtime/__tests__/stubRuntimeAdapter.test.ts`
Expected: PASS (4 tests)

**Step 6: Run full typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/main/orchestrator/OrchestratorService.ts src/main/runtime/stubRuntimeAdapter.ts src/main/runtime/__tests__/stubRuntimeAdapter.test.ts
git commit -m "feat: add steer/followUp/clearQueue to RuntimeAdapter and StubRuntimeAdapter"
```

---

### Task 3: Add steer/followUp/clearQueue to OrchestratorService

**Files:**
- Modify: `src/main/orchestrator/OrchestratorService.ts`
- Create: `src/main/orchestrator/__tests__/OrchestratorService.test.ts`

**Step 1: Write failing tests**

Create `src/main/orchestrator/__tests__/OrchestratorService.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { OrchestratorService, type RuntimeAdapter } from "../OrchestratorService";

function createMockRuntime(): RuntimeAdapter & {
  steered: string[];
  followedUp: string[];
  queueCleared: number;
} {
  const steered: string[] = [];
  const followedUp: string[] = [];
  let queueCleared = 0;

  return {
    steered,
    followedUp,
    queueCleared: 0,
    async run(_text, callbacks) {
      const id = "mock-msg";
      callbacks.onStart(id);
      callbacks.onChunk(id, "chunk");
      callbacks.onEnd(id);
    },
    abort() {},
    steer(text) { steered.push(text); },
    followUp(text) { followedUp.push(text); },
    clearQueue() {
      queueCleared++;
      return { steering: [...steered.splice(0)], followUp: [...followedUp.splice(0)] };
    }
  };
}

describe("OrchestratorService steer/followUp", () => {
  it("steer() delegates to runtime and emits queue.status", () => {
    const runtime = createMockRuntime();
    const orchestrator = new OrchestratorService(runtime);
    const events: unknown[] = [];
    orchestrator.onTimelineEvent((e) => events.push(e));

    orchestrator.steer("fix it");

    expect(runtime.steered).toEqual(["fix it"]);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "queue.status", steerCount: 1, followUpCount: 0 })
    );
  });

  it("followUp() delegates to runtime and emits queue.status", () => {
    const runtime = createMockRuntime();
    const orchestrator = new OrchestratorService(runtime);
    const events: unknown[] = [];
    orchestrator.onTimelineEvent((e) => events.push(e));

    orchestrator.followUp("run tests");

    expect(runtime.followedUp).toEqual(["run tests"]);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "queue.status", steerCount: 0, followUpCount: 1 })
    );
  });

  it("clearQueue() returns cleared messages and emits zero status", () => {
    const runtime = createMockRuntime();
    const orchestrator = new OrchestratorService(runtime);
    const events: unknown[] = [];
    orchestrator.onTimelineEvent((e) => events.push(e));

    orchestrator.steer("a");
    orchestrator.followUp("b");
    const result = orchestrator.clearQueue();

    expect(result).toEqual({ steering: ["a"], followUp: ["b"] });
    const lastQueueEvent = events.filter(
      (e: any) => e.type === "queue.status"
    ).pop() as any;
    expect(lastQueueEvent.steerCount).toBe(0);
    expect(lastQueueEvent.followUpCount).toBe(0);
  });

  it("steer() is a no-op when runtime lacks steer method", () => {
    const runtime: RuntimeAdapter = {
      async run(_text, callbacks) {
        callbacks.onStart("m"); callbacks.onEnd("m");
      },
      abort() {}
    };
    const orchestrator = new OrchestratorService(runtime);
    // Should not throw
    orchestrator.steer("text");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/main/orchestrator/__tests__/OrchestratorService.test.ts`
Expected: FAIL (steer/followUp/clearQueue not on OrchestratorService)

**Step 3: Implement the methods on OrchestratorService**

Add to `OrchestratorService`:

```ts
private steerCount = 0;
private followUpCount = 0;

public steer(text: string): void {
  if (!this.runtime.steer) return;
  this.runtime.steer(text);
  this.steerCount++;
  this.emitQueueStatus();
}

public followUp(text: string): void {
  if (!this.runtime.followUp) return;
  this.runtime.followUp(text);
  this.followUpCount++;
  this.emitQueueStatus();
}

public clearQueue(): { steering: string[]; followUp: string[] } {
  const result = this.runtime.clearQueue?.() ?? { steering: [], followUp: [] };
  this.steerCount = 0;
  this.followUpCount = 0;
  this.emitQueueStatus();
  return result;
}

private emitQueueStatus(): void {
  this.emit({ type: "queue.status", steerCount: this.steerCount, followUpCount: this.followUpCount });
}
```

Also reset counts in `sendPrompt` finally-block (when state goes idle, counts reset):

```ts
// In sendPrompt's finally block, after setState("idle"):
this.steerCount = 0;
this.followUpCount = 0;
this.emitQueueStatus();
```

**Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/main/orchestrator/__tests__/OrchestratorService.test.ts`
Expected: PASS (4 tests)

**Step 5: Run full typecheck and existing tests**

Run: `bun run typecheck && bun run test`
Expected: PASS

**Step 6: Commit**

```bash
git add src/main/orchestrator/OrchestratorService.ts src/main/orchestrator/__tests__/OrchestratorService.test.ts
git commit -m "feat: add steer/followUp/clearQueue to OrchestratorService"
```

---

### Task 4: Wire steer/followUp to LocalSdkRuntimeAdapter

**Files:**
- Modify: `src/main/runtime/localSdkRuntimeAdapter.ts`

**Step 1: Extend LocalSdkSession interface**

Add to `LocalSdkSession`:

```ts
steer(text: string): Promise<void>;
followUp(text: string): Promise<void>;
clearQueue(): { steering: string[]; followUp: string[] };
```

**Step 2: Implement on LocalSdkRuntimeAdapter**

```ts
public steer(text: string): void {
  void this.session.steer(text);
}

public followUp(text: string): void {
  void this.session.followUp(text);
}

public clearQueue(): { steering: string[]; followUp: string[] } {
  return this.session.clearQueue();
}
```

**Step 3: Wire in createLocalSdkSession()**

In the factory function, discover `steer`, `followUp`, `clearQueue` from the raw session the same way `sendPrompt` and `abort` are discovered.

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/runtime/localSdkRuntimeAdapter.ts
git commit -m "feat: wire steer/followUp/clearQueue to LocalSdkRuntimeAdapter"
```

---

### Task 5: Register IPC handlers for steer/followUp/clearQueue

**Files:**
- Modify: `src/main/ipc/sessionIpc.ts`

**Step 1: Add handlers**

```ts
ipcMain.handle(IPC_CHANNELS.sessionSteer, async (_event, payload) => {
  const request = payload as SessionSteerRequest;
  orchestrator.steer(request.text);
});

ipcMain.handle(IPC_CHANNELS.sessionFollowUp, async (_event, payload) => {
  const request = payload as SessionFollowUpRequest;
  orchestrator.followUp(request.text);
});

ipcMain.handle(IPC_CHANNELS.sessionClearQueue, async () => {
  return orchestrator.clearQueue();
});
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/main/ipc/sessionIpc.ts
git commit -m "feat: register IPC handlers for steer/followUp/clearQueue"
```

---

### Task 6: Expose steer/followUp/clearQueue in preload and shared API type

**Files:**
- Modify: `src/preload/preload.ts`
- Modify: `src/shared/preload-api.ts`

**Step 1: Update PitaSessionApi**

Add to `PitaSessionApi` in `src/shared/preload-api.ts`:

```ts
steer(text: string): Promise<void>;
followUp(text: string): Promise<void>;
clearQueue(): Promise<{ steering: string[]; followUp: string[] }>;
```

Update the stub implementation to match.

**Step 2: Update preload.ts**

Add to the session object exposed via `contextBridge`:

```ts
steer(text: string): Promise<void> {
  return ipcRenderer.invoke(IPC_CHANNELS.sessionSteer, { text });
},
followUp(text: string): Promise<void> {
  return ipcRenderer.invoke(IPC_CHANNELS.sessionFollowUp, { text });
},
clearQueue(): Promise<{ steering: string[]; followUp: string[] }> {
  return ipcRenderer.invoke(IPC_CHANNELS.sessionClearQueue);
}
```

Also update the locally-defined `IPC_CHANNELS` in preload.ts to include the new channels.

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/preload/preload.ts src/shared/preload-api.ts
git commit -m "feat: expose steer/followUp/clearQueue in preload API"
```

---

### Task 7: Update PromptComposerPanel for steer/followUp gestures

**Files:**
- Modify: `src/renderer/components/PromptComposerPanel.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/pita.d.ts`

**Step 1: Update pita.d.ts**

Add `steer`, `followUp`, `clearQueue` to the `Window["pita"]["session"]` type declaration.

**Step 2: Update App.tsx**

Add handler functions:

```tsx
const handleSteer = async (text: string): Promise<void> => {
  await window.pita.session.steer(text);
};

const handleFollowUp = async (text: string): Promise<void> => {
  await window.pita.session.followUp(text);
};
```

Pass `onSteer` and `onFollowUp` props to `PromptComposerPanel`.

**Step 3: Update PromptComposerPanel**

- Add `onSteer` and `onFollowUp` optional props.
- Add `steerCount` and `followUpCount` optional props.
- On Enter keydown in textarea when `isRunning`: call `onSteer` instead of `onSend`.
- On Alt+Enter keydown in textarea when `isRunning`: call `onFollowUp`.
- On Alt+Enter when idle: call `onSend` (same as Enter).
- Show pending count badge when `steerCount + followUpCount > 0`.

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/PromptComposerPanel.tsx src/renderer/App.tsx src/renderer/pita.d.ts
git commit -m "feat: wire steer/followUp gestures in PromptComposerPanel"
```

---

### Task 8: Update useSessionTimeline for queue status

**Files:**
- Modify: `src/renderer/hooks/useSessionTimeline.ts`

**Step 1: Add steerCount/followUpCount to hook return**

Extend `UseSessionTimelineResult`:

```ts
steerCount: number;
followUpCount: number;
```

Handle `queue.status` event in `applyTimelineEvent`. Reset counts on `state: idle`.

**Step 2: Wire counts through App.tsx to PromptComposerPanel**

**Step 3: Run typecheck and tests**

Run: `bun run typecheck && bun run test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/renderer/hooks/useSessionTimeline.ts src/renderer/App.tsx
git commit -m "feat: propagate queue status counts to PromptComposerPanel"
```

---

### Task 9: Add/update renderer tests

**Files:**
- Modify: `src/renderer/__tests__/prompt-composer-panel.test.tsx`
- Modify: `src/renderer/__tests__/prompt-composer-runtime.test.tsx`

**Step 1: Add tests for steer/followUp behavior**

Test cases:
- Enter while running calls onSteer (not onSend).
- Alt+Enter while running calls onFollowUp.
- Enter while idle calls onSend (unchanged).
- Alt+Enter while idle calls onSend.
- Pending count badge visible when steerCount + followUpCount > 0.
- Pending count badge hidden when 0.

**Step 2: Run tests**

Run: `bun run test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/__tests__/prompt-composer-panel.test.tsx src/renderer/__tests__/prompt-composer-runtime.test.tsx
git commit -m "test: add steer/followUp renderer tests"
```

---

### Task 10: Update docs and final verification

**Files:**
- Modify: `docs/overview.md`

**Step 1: Update overview.md**

Move "steer and queue follow-up behavior" from "Not implemented yet" to "Implemented now".

**Step 2: Run full verification**

Run: `bun run typecheck && bun run test`
Expected: PASS

**Step 3: Commit**

```bash
git add docs/overview.md
git commit -m "docs: mark steer/followUp as implemented"
```
