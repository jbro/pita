# Workflow

## Prerequisites

- Git repository initialized.
- Main branch is `main`.
- Local worktree directory is `.worktrees/`.

## Operating Model

- Planning and coordination happen from `main`.
- Execution work happens in dedicated worktrees.
- Each worktree is owned by one active agent runtime at a time.

## Worktree Conventions

- Path pattern: `.worktrees/<branch-name>`
- Branch naming examples:
  - `feature/<name>`
  - `fix/<name>`
  - `chore/<name>`

## Agent Roles

### Primary Agent

- Rich local SDK-driven session.
- Foreground operator experience.

### Worker Agents

- Bound to specific worktrees.
- Can run as background workers (initially RPC-capable model).
- Can be promoted into foreground control slot when needed.

## Worktree Lock Policy (Required)

A worktree must be locked by one runtime before execution.

Rules:
- Acquire lock before start/resume.
- Deny second runtime if lock is active.
- Release lock on normal shutdown.
- Detect stale lock and require explicit recovery/override.

This prevents concurrent edits and state corruption.

## Typical Flow

1. Plan work from `main`.
2. Create branch and worktree.
3. Bind worker to that worktree.
4. Run task loop (prompt/steer/follow-up).
5. Promote worker to foreground if deep steering is needed.
6. Complete work and hand off for integration.

### Concrete Command Examples

Create a worker branch and worktree:

```bash
git switch main
git pull --ff-only
git worktree add .worktrees/feature-agent-ui -b feature/agent-ui
```

Verify that the worktree path is ignored:

```bash
git check-ignore -v .worktrees
```

Start a worker runtime (conceptual app command):

```bash
pita worker start \
  --worktree .worktrees/feature-agent-ui \
  --session continueRecent
```

Promote worker to the foreground control slot (conceptual app command):

```bash
pita worker promote --worktree .worktrees/feature-agent-ui
```

Release worker and remove worktree after integration:

```bash
pita worker stop --worktree .worktrees/feature-agent-ui
git worktree remove .worktrees/feature-agent-ui
git branch -d feature/agent-ui
```

## Error and Recovery Guidelines

- On lock conflict: show current owner and refuse start.
- On stale lock: provide safe unlock command and audit log entry.
- On crash: mark worker as interrupted and preserve event queue context.
