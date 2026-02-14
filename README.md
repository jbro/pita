# Pita

A desktop control center for the Pi coding agent.

Pita gives you a clean, keyboard-first interface for running and steering Pi sessions with a worktree-oriented workflow.

## Features

- Desktop experience for Pi session control
- Timeline-first interface for session activity
- Prompt composer wired to single-session send/steer/follow-up/abort controls
- Streamed timeline updates from main-process runtime events
- Confirm-only prompt overlay backend contract (runtime -> orchestrator -> IPC -> preload)
- Command palette and keyboard shortcut workflows
- Multi-session architecture with foreground control semantics
- Worktree-based agent execution model
- TUI-compatible runtime behavior

## Getting Started

Prerequisite: install Bun (`https://bun.sh`) and ensure `bun` is on your `PATH`.

```bash
bun install
bun run dev
```

Bun is the authoritative package manager and task runner for this repository.

For verification commands, see [docs/testing.md](docs/testing.md).

## Documentation

- [docs/overview.md](docs/overview.md) — product scope and architecture snapshot
- [docs/architecture.md](docs/architecture.md) — runtime model, contracts, compatibility rules
- [docs/ux.md](docs/ux.md) — UX and interaction model
- [docs/workflow.md](docs/workflow.md) — git/worktree workflow conventions
- [docs/roadmap.md](docs/roadmap.md) — delivery phases and milestones
- [docs/testing.md](docs/testing.md) — local and phase-end verification flow
- [AGENTS.md](AGENTS.md) — agent-oriented operating guidance

## Upstream

Pita is built around the Pi ecosystem:

- [pi-mono](https://github.com/badlogic/pi-mono/tree/main)
- [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)
- [pi-tui](https://github.com/badlogic/pi-mono/tree/main/packages/tui)
- [pi-web-ui](https://github.com/badlogic/pi-mono/tree/main/packages/web-ui)

## License

MIT. See [LICENSE](LICENSE).
