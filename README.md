# Pita

<p align="center">
  <img src="assets/logo.svg" alt="Pita logo" width="220" />
</p>

A desktop control center for the Pi coding agent.

## Getting Started

Install Bun (`https://bun.sh`), then:

```bash
bun install
bun run dev
```

## Verification

```bash
bun run typecheck    # TypeScript check (all code)
bun run test         # Vitest unit/integration tests
bun run test:e2e     # Playwright Electron smoke tests (builds first)
```

## Documentation

- [docs/techstack.md](docs/techstack.md) — technology choices
- [docs/architecture.md](docs/architecture.md) — process model, sessions, IPC, dependency injection
- [docs/user-stories.md](docs/user-stories.md) — feature specs (one file per story)
- [docs/testing.md](docs/testing.md) — testing strategy and layers
- [docs/workflow.md](docs/workflow.md) — development workflow (git, worktrees, handoff)
- [docs/session-notes.md](docs/session-notes.md) — planning session log
- [AGENTS.md](AGENTS.md) — agent operating guidance

## License

MIT. See [LICENSE](LICENSE).
