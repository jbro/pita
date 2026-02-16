# AGENTS

This file contains agent-specific operating guidance for this repository.

## Source References

Use these upstream locations as the primary reference:

- Monorepo root: `https://github.com/badlogic/pi-mono/tree/main`
- Coding agent package: `https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent`
- SDK docs: `https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/docs/sdk.md`

Local clone for fast inspection:
- `~/tmp/pi-mono`

## Session Handoff Checklist

When starting a new planning or implementation session:

1. Read `README.md`, `docs/overview.md`, `docs/architecture.md`, and `docs/workflow.md` first.

## Workflow Compliance (Mandatory)

Before proposing execution mechanics (worktrees, session handoff, clipboard prompts, phase-end gates, merge/cleanup), read and follow `docs/workflow.md`.

Required behavior:

1. Treat `docs/workflow.md` as the operational source of truth for session handoff.
2. Use the documented parallel-session handoff steps when applicable, preferring the one-line kickoff command flow (directory change + `pi` launch with initial prompt) copied via detached `wl-copy`.
3. After delegated/parallel implementation reports completion, run the documented phase-end gates process before integration.
4. Only merge to `main` and clean up worktree/branch after gate results are reviewed and accepted.
5. After each sub-session review, automatically copy the follow-up feedback prompt to the clipboard via detached `wl-copy` (no extra user confirmation needed).
6. When implementation is approved, copy a follow-up prompt that instructs the sub-session to run `/refine-docs`, commit any resulting updates, and report back.
7. Merge to `main` and clean up worktree/branch only after the `/refine-docs` completion report and commit(s) are reviewed and accepted.

If instructions from memory conflict with `docs/workflow.md`, follow the document and call out the difference explicitly.

## Documentation Placement Preferences

- Keep `README.md` concise (quick intro, setup, and doc links).
- Keep core guarantees and phase/status detail in `docs/overview.md` (and deeper docs), not in `README.md`.
- When updating documentation, preserve this split unless the user asks otherwise.

## Session Reestablishment Protocol (Always Do First)

At the start of every new or resumed session, before proposing implementation work:

1. Re-read `README.md`, `docs/overview.md`, `docs/architecture.md`, and `docs/workflow.md`.
2. Inspect recent project activity (e.g., changed files, recent commits, open plan docs) to infer what is in progress.
3. Summarize the inferred current objective, what is done, and what is still open.
4. Recommend the best next actions (ordered, concrete, and minimal).
5. If context is still ambiguous, ask one focused clarification question before proceeding.

This reestablishment step is mandatory and precedes planning, coding, or verification actions.
