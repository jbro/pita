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

## Workflow Compliance (Mandatory)

Before proposing execution mechanics (worktrees, session handoff, clipboard prompts, phase-end gates, merge/cleanup), read and follow `docs/workflow.md`.

Required behavior:

1. Treat `docs/workflow.md` as the operational source of truth for session handoff.
2. Use the documented parallel-session handoff steps (including detached `wl-copy` usage) when applicable.
3. After delegated/parallel implementation reports completion, run the documented phase-end gates process before integration.
4. Only merge to `main` and clean up worktree/branch after gate results are reviewed and accepted.

If instructions from memory conflict with `docs/workflow.md`, follow the document and call out the difference explicitly.

## Session Reestablishment Protocol (Always Do First)

At the start of every new or resumed session, before proposing implementation work:

1. Re-read `README.md` and `docs/architecture.md`.
2. Inspect recent project activity (e.g., changed files, recent commits, open plan docs) to infer what is in progress.
3. Summarize the inferred current objective, what is done, and what is still open.
4. Recommend the best next actions (ordered, concrete, and minimal).
5. If context is still ambiguous, ask one focused clarification question before proceeding.

This reestablishment step is mandatory and precedes planning, coding, or verification actions.

## Architecture Intent

- `packages/coding-agent` is runtime authority for behavior.
- `packages/web-ui` is optional inspiration for component design.
- Pita-specific orchestration rules (worktree lock policy, foreground slot, background queues) remain project-defined.
