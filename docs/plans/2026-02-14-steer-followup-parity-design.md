# Steer + Follow-Up Parity Design

## Goal

Add steer and queue-follow-up behavior to Pita, matching the TUI's semantics. After this work, users can:

- **Steer** (Enter while streaming): inject a message that interrupts after the current tool call.
- **Queue follow-up** (Alt+Enter while streaming): queue a message delivered after the agent finishes.
- **Clear queue**: restore queued messages to the editor.
- See pending message counts in the UI.

When idle, Enter sends a normal prompt (unchanged).

## Upstream Behavior Reference

In `AgentSession` (coding-agent):

- `steer(text)` — pushes to `_steeringMessages`, calls `agent.steer()`.
- `followUp(text)` — pushes to `_followUpMessages`, calls `agent.followUp()`.
- `prompt(text, { streamingBehavior })` — routes to `steer()` or `followUp()` when streaming.
- `clearQueue()` — drains both arrays, calls `agent.clearAllQueues()`, returns `{ steering, followUp }`.
- `pendingMessageCount`, `getSteeringMessages()`, `getFollowUpMessages()` — read-only accessors.

In the TUI interactive mode:

- Enter while streaming → `session.prompt(text, { streamingBehavior: 'steer' })`.
- Alt+Enter while streaming → `session.prompt(text, { streamingBehavior: 'followUp' })`.
- Alt+Enter when idle → same as Enter (normal prompt).
- Ctrl+Q → dequeue (restore to editor).
- Pending count shown in footer.

## Approach: Explicit Methods Through the Stack

Add dedicated `steer(text)` and `followUp(text)` to every layer.

### Layer Changes

#### 1. `shared/ipc.ts`

New IPC channels:

```ts
sessionSteer: "session.steer"
sessionFollowUp: "session.followUp"
sessionClearQueue: "session.clearQueue"
sessionQueueStatus: "session.queueStatus"
```

New event type for queue status updates:

```ts
| { type: "queue.status"; steerCount: number; followUpCount: number }
```

#### 2. `RuntimeAdapter` interface

Add optional methods (optional because stub adapter may not support them):

```ts
steer?(text: string, callbacks: RuntimeCallbacks): void;
followUp?(text: string, callbacks: RuntimeCallbacks): void;
clearQueue?(): { steering: string[]; followUp: string[] };
```

#### 3. `LocalSdkRuntimeAdapter`

Wire `steer` and `followUp` to the SDK session's corresponding methods. Track pending counts locally for queue status events.

#### 4. `LocalSdkSession` interface

Add:

```ts
steer(text: string): Promise<void>;
followUp(text: string): Promise<void>;
clearQueue(): { steering: string[]; followUp: string[] };
```

Wire to SDK's `AgentSession.steer()`, `AgentSession.followUp()`, `AgentSession.clearQueue()`.

#### 5. `OrchestratorService`

Add `steer(text)`, `followUp(text)`, `clearQueue()` methods.

- `steer`: only valid when `state === 'running'`. Delegates to `runtime.steer()`. Emits `queue.status`.
- `followUp`: only valid when `state === 'running'`. Delegates to `runtime.followUp()`. Emits `queue.status`.
- `clearQueue`: delegates to `runtime.clearQueue()`. Emits `queue.status` with zeros. Returns cleared messages.

#### 6. `sessionIpc.ts`

Register handlers for the three new IPC channels. Forward `queue.status` events to the renderer.

#### 7. Preload

Expose `steer(text)`, `followUp(text)`, `clearQueue()` on `window.pita.session`.

#### 8. `PitaSessionApi` (shared type)

Add the three new methods.

#### 9. `PromptComposerPanel`

- Enter while `runState === 'running'` → call `steer(text)`.
- Alt+Enter while `runState === 'running'` → call `followUp(text)`.
- Enter while idle → call `sendPrompt(text)` (unchanged).
- Alt+Enter while idle → call `sendPrompt(text)` (same as TUI).
- Show pending count when > 0.

#### 10. `StubRuntimeAdapter`

Add stub `steer` and `followUp` that push to internal arrays and emit queue status. `clearQueue` drains them.

### Event Flow

```
User presses Enter while streaming
  → PromptComposerPanel calls window.pita.session.steer(text)
  → IPC invoke "session.steer"
  → OrchestratorService.steer(text)
  → runtime.steer(text)
  → SDK AgentSession.steer(text)
  → OrchestratorService emits queue.status event
  → IPC forwards to renderer
  → useSessionTimeline updates pending count
```

### Queue Status in Timeline Hook

Add `steerCount` and `followUpCount` to `useSessionTimeline` return value. The `queue.status` event updates these. Reset to zero on `state: idle`.

### Error Handling

- `steer()` / `followUp()` when not running → silently ignore (matches TUI: no-op when not streaming).
- `clearQueue()` when empty → returns empty arrays, emits zero counts.
- Runtime adapter missing steer/followUp → orchestrator throws clear error.

## Testing Strategy

- Unit tests for OrchestratorService: steer/followUp routing, state guards, queue status events.
- Unit tests for StubRuntimeAdapter: steer/followUp queue behavior.
- Renderer tests for PromptComposerPanel: Enter vs Alt+Enter behavior based on runState.
- Integration: E2E smoke with manual-abort stub mode, steer during streaming.

## Out of Scope

- Image attachments on steer/followUp.
- Extension command handling (queued extension commands).
- Compaction-aware queueing.
- Dequeue keyboard shortcut (Ctrl+Q) — deferred to UX refinement.
