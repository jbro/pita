# Pita

A desktop control center for the Pi coding agent.

## Vision

Pita gives a solo developer a clean, keyboard-first interface to run and steer agent sessions. It starts with one rich local agent experience and grows toward multi-agent orchestration across worktrees and remote runtimes.

## Core Principles

- **Git and worktrees are required.**
- **One active agent runtime per worktree.**
- **Pi session files are the source of truth.**
- **Start simple in UI, design for orchestration.**

## V1 Scope

- Electron app (Linux first), dark mode.
- Timeline at the top, prompt composer at the bottom.
- Timeline shows messages and collapsible tool blocks.
- Prompt supports single-line and multiline modes.
- Streaming-aware controls: prompt, steer, queue follow-up, abort.
- Command palette (app commands only) and keyboard shortcuts.
- Local primary agent via Pi SDK embedding.
- Multi-session support in architecture (UI can expose it later).
- Background event queue and pause/resume semantics in orchestration layer.

## Architecture Snapshot

- **Renderer (React):** timeline, prompt, command palette, shortcuts.
- **Main process (Electron):** app lifecycle, IPC, command routing.
- **Orchestrator service:** manages sessions, foreground slot, event queue.
- **Agent adapters:**
  - `LocalSdkAgentAdapter` (v1 primary)
  - `RpcWorkerAgentAdapter` (later / optional early worker mode)

See `docs/architecture.md` for details.

## Non-Goals for V1

- Mission-control overview UI.
- Fully resizable side panels.
- Full-featured remote-agent UI.
- User-editable keymaps.

## Documentation

- `docs/architecture.md`
- `docs/ux.md`
- `docs/workflow.md`
- `docs/roadmap.md`
