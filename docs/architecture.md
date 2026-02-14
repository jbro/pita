# Architecture

## Overview

Pita is an Electron desktop app with a React renderer and a session orchestration core in the main process.

The system is built around one rich foreground experience and a future-ready multi-agent model.

## Upstream Architecture Map

Pi monorepo packages relevant to Pita:

- `packages/ai`: provider and model APIs, streaming protocol, tool-call transport.
- `packages/agent`: generic agent runtime and event model.
- `packages/coding-agent`: Pi product runtime used by Pita (SDK, sessions, extensions, RPC, interactive mode).
- `packages/tui`: terminal UI framework used by coding-agent interactive mode.
- `packages/web-ui`: reusable browser chat components built around `pi-agent-core`.

Practical guidance:
- Treat `packages/coding-agent` behavior as the primary compatibility target.
- Reuse `packages/web-ui` selectively for UI ideas, not as the runtime authority.

## Components

### 1. Renderer (React)

Responsibilities:
- Render timeline and prompt composer.
- Handle command palette and keyboard actions.
- Display streaming updates and tool blocks.

Phase 1B implementation note:
- Renderer timeline state is event-driven through a session timeline hook.
- Prompt composer send/abort controls are wired to preload session APIs.

It does not directly own Pi runtime state.

### 2. Main Process (Electron)

Responsibilities:
- Window lifecycle and app state.
- IPC boundary to renderer.
- Command dispatch to orchestration layer.

Phase 1B implementation note:
- Session IPC handlers are registered during startup and forward orchestrator timeline events to the active window.
- The current runtime path is intentionally stubbed for deterministic vertical-slice behavior.

### 3. Orchestrator Service (Main Process Module)

Responsibilities:
- Manage session registry (multi-session capable).
- Own foreground control slot.
- Manage worker lifecycles.
- Normalize events for UI consumption.
- Buffer background events and replay summaries.

Phase 1B implementation note:
- A thin single-session `OrchestratorService` is now wired for `sendPrompt` and `abort`.
- It emits normalized `state`, `response.start`, `response.chunk`, `response.end`, `response.abort`, and `error` events.

### 4. Agent Adapters

A shared interface hides runtime differences.

#### `LocalSdkAgentAdapter` (v1)
- Uses `createAgentSession()` and `SessionManager`.
- Powers the rich foreground local experience.

#### `RpcWorkerAgentAdapter` (later / optional)
- Runs workers over Pi RPC.
- Prioritizes orchestration over fancy UI.

## Foreground Control Slot Model

- Exactly one agent is attached to the rich interactive UI at a time.
- A worker can be promoted to foreground and later demoted.
- Foreground swaps require pause/resume transitions and state synchronization.

## Session and Worktree Model

- Git is mandatory.
- Worktrees live under `.worktrees/`.
- Each worker is bound to:
  - branch
  - worktree path
  - session reference
  - runtime adapter type

Pi session files remain source of truth for session history.

## Hard Invariant: One Active Agent per Worktree

A worktree may only have one active runtime at a time.

### Locking Strategy

Use a lock file in the worktree (or a lock registry keyed by worktree path).

Suggested lock file path:
- `<worktree>/.pita/agent.lock.json`

Suggested schema snippet:

```json
{
  "version": 1,
  "lockId": "a5cb5a2c-75e9-4c5e-9a9b-2f1ed46adf65",
  "worktreePath": "/home/jbr/projects/pita/.worktrees/feature-agent-ui",
  "branch": "feature/agent-ui",
  "runtimeKind": "sdk",
  "agentId": "agent-local-01",
  "sessionId": "5f08f43d-cfcc-4d64-8ba0-57a6aaf9f0e3",
  "ownerPid": 48231,
  "host": "devbox",
  "acquiredAt": "2026-02-14T15:42:00.000Z",
  "heartbeatAt": "2026-02-14T15:42:10.000Z"
}
```

Minimum required fields for conflict checks:
- `lockId`
- `worktreePath`
- `agentId`
- `sessionId`
- `ownerPid`
- `acquiredAt`

### Lock Semantics

- Acquire lock before start/resume.
- Refuse activation if lock exists and is valid.
- Release lock on stop/pause/dispose.
- Support stale-lock recovery via PID check and explicit override.

## Event Queue and Pause/Resume

Background workers can emit events while not in foreground.

Orchestrator behavior:
- Queue non-foreground events.
- Maintain counters and last event timestamp.
- Surface queue summary on promotion.
- Optionally replay tail events for operator context.

This supports future self-steering and remote orchestration without forcing a complex v1 UI.

## Data Ownership

- **Pi-owned:** sessions, message trees, model/thinking/session metadata.
- **App-owned (later):** tags, favorites, panel layout, user display preferences.

## Extension UI Bridge (Phase 2)

To support structured agent questions in the desktop UI, add an extension UI bridge between Pi runtime events and renderer overlays.

Responsibilities:
- Detect extension-driven prompt requests (choice, confirm, freeform input).
- Replace the prompt area with an interactive overlay.
- Route user selection back to the active session.
- Restore normal prompt composer after completion or cancel.

Input support requirements:
- Mouse selection.
- Arrow-key navigation + Enter.
- Numeric quick-select shortcuts.
- Freeform text fallback.

If extension UI requests are unavailable, the system falls back to plain text interaction.

### Prompt Overlay Event Contract (Draft)

| Event | Direction | Required Fields | Notes |
|---|---|---|---|
| `prompt_overlay_request` | Orchestrator -> Renderer | `requestId`, `kind`, `sessionId` | `kind`: `choice` \| `confirm` \| `freeform` |
| `prompt_overlay_request.choice` | Orchestrator -> Renderer | `title`, `options[]`, `allowFreeform` | `options` include `id`, `label`, optional `shortcut` |
| `prompt_overlay_request.confirm` | Orchestrator -> Renderer | `title`, `message`, `confirmLabel`, `cancelLabel` | Replaces prompt area until resolved |
| `prompt_overlay_submit_choice` | Renderer -> Orchestrator | `requestId`, `selectedOptionId` | Sent on mouse, arrow+enter, or numeric selection |
| `prompt_overlay_submit_text` | Renderer -> Orchestrator | `requestId`, `text` | Freeform fallback path |
| `prompt_overlay_cancel` | Renderer -> Orchestrator | `requestId` | User cancelled or dismissed request |
| `prompt_overlay_resolved` | Orchestrator -> Renderer | `requestId`, `status` | `status`: `submitted` \| `cancelled` \| `expired` |
| `prompt_overlay_timeout` (optional) | Orchestrator -> Renderer | `requestId`, `timeoutMs` | Optional auto-cancel UX hint |

#### Normalized Payload Shape

```ts
type PromptOverlayKind = "choice" | "confirm" | "freeform";

interface PromptOverlayRequestBase {
  requestId: string;
  kind: PromptOverlayKind;
  sessionId: string;
  createdAt: string; // ISO timestamp
}
```

## Preload Bridge Constraint (Current)

The preload script runs in sandboxed mode and currently defines IPC channel names and timeline event shape locally.

Reason:
- importing shared preload dependencies from sandboxed preload caused module resolution failures in packaged Electron runs.

Implication:
- keep preload bridge types and channel names synchronized with `src/shared/ipc.ts` until a shared-safe preload import strategy is introduced.

## TUI Compatibility Contract (Primary)

Pita treats the coding-agent TUI/runtime behavior as the compatibility baseline.

### Compatibility Rules

1. **Session compatibility first**
   - Use `createAgentSession()` and `SessionManager` semantics.
   - Keep Pi session files as source of truth.

2. **Event compatibility first**
   - Follow `AgentSessionEvent` ordering and meaning.
   - Preserve streaming and tool event behavior in timeline updates.

3. **Queue and steering parity**
   - Match TUI behavior for `prompt`, `steer`, `followUp`, and `abort`.
   - Keep message delivery semantics consistent while streaming.

4. **Extension UI parity where possible**
   - Support extension-driven `select`, `confirm`, `input`, and `editor` flows.
   - Explicitly document any desktop-only gaps or degraded behaviors.

5. **Message-role parity**
   - Correctly represent coding-agent-specific message and session entries (for example bash execution, branch summaries, compaction summaries, and custom extension messages).

### Design Implication

`@mariozechner/pi-web-ui` can inform component design, but it does not define runtime behavior for Pita. Runtime and session behavior are governed by coding-agent SDK/TUI semantics.

## Future Extension Path

The adapter boundary allows incremental growth:
1. Local SDK-first operation.
2. Add RPC worker adapters.
3. Add remote host routing.
4. Add optional always-on orchestrator agent for self-steering experiments.
