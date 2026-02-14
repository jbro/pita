# AGENTS

This file contains agent-specific operating guidance for this repository.

## Primary Compatibility Target

- Treat `@mariozechner/pi-coding-agent` runtime behavior as the compatibility baseline.
- TUI compatibility comes first.
- Keep Pi session files as source of truth.

## Source References

Use these upstream locations as the primary reference:

- Monorepo root: `https://github.com/badlogic/pi-mono/tree/main`
- Coding agent package: `https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent`
- SDK docs: `https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/docs/sdk.md`
- Session format docs: `https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/docs/session.md`
- RPC docs: `https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/docs/rpc.md`
- TUI library: `https://github.com/badlogic/pi-mono/tree/main/packages/tui`
- Web UI library: `https://github.com/badlogic/pi-mono/tree/main/packages/web-ui`

Local clone for fast inspection:
- `~/tmp/pi-mono`

## Session Handoff Checklist

When starting a new planning or implementation session:

1. Read `README.md` and `docs/architecture.md` first.
2. Confirm the TUI Compatibility Contract still governs behavior.
3. Validate assumptions against upstream code in `~/tmp/pi-mono/packages/coding-agent`.
4. For UI questions, compare with `packages/tui` first, then `packages/web-ui` for optional patterns.
5. Do not introduce a second session authority; Pi session files remain canonical.

## Architecture Intent

- `packages/coding-agent` is runtime authority for behavior.
- `packages/web-ui` is optional inspiration for component design.
- Pita-specific orchestration rules (worktree lock policy, foreground slot, background queues) remain project-defined.
