# Project Overview

## V1 Scope (Target)

- Electron app (Linux first), dark mode.
- Timeline at the top, prompt composer at the bottom.
- Timeline shows messages and collapsible tool blocks.
- Prompt supports single-line and multiline modes.
- Streaming-aware controls: prompt, steer, queue follow-up, abort.
- Command palette (app commands only) and keyboard shortcuts.
- Local primary agent via Pi SDK embedding.
- Multi-session support in architecture (UI can expose it later).
- Background event queue and pause/resume semantics in orchestration layer.

## Current Implementation Status

Implemented now:
- runnable Electron + React shell,
- single-session send and abort controls,
- streamed timeline updates via main-process IPC,
- deterministic stub runtime behavior for local smoke tests.

Not implemented yet:
- steer and queue follow-up behavior,
- multi-session UI controls,
- local SDK runtime integration (beyond stubbed vertical-slice runtime).

## Architecture Snapshot

- **Renderer (React):** timeline, prompt, command palette, shortcuts.
- **Main process (Electron):** app lifecycle, IPC, command routing.
- **Orchestrator service:** manages sessions, foreground slot, event queue.
- **Agent adapters:**
  - `LocalSdkAgentAdapter` (v1 primary)
  - `RpcWorkerAgentAdapter` (later / optional early worker mode)

For implementation-level architecture details, see `docs/architecture.md`.

## Non-Goals for V1

- Mission-control overview UI.
- Fully resizable side panels.
- Full-featured remote-agent UI.
- User-editable keymaps.
