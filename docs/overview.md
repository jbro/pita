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

## Core Guarantees

- **TUI compatibility comes first**
- **Pi session files are the source of truth**
- **One active agent runtime per worktree**
- **Git and worktrees are required**

## Current Implementation Status

Implemented now:
- runnable Electron + React shell,
- single-session send and abort controls,
- streamed timeline updates via main-process IPC,
- SDK-first local runtime selection at startup,
- explicit stub override (`PITA_RUNTIME_KIND=stub`) with deterministic `manual-abort` mode for smoke checks,
- automatic stub fallback when SDK bootstrap fails.

Not implemented yet:
- steer and queue follow-up behavior,
- multi-session UI controls,
- deeper local SDK parity work beyond initial session wiring (for example extension prompt flows and richer event-role coverage).

## Documentation note

`docs/plans/*` contains historical planning and verification records. Those files may still mention npm in historical context, even though Bun is now the active project workflow.

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
