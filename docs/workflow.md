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

For agent-specific session handoff guidance, see `AGENTS.md`.

## Parallel Session Handoff (Worktree + Clipboard Prompts)

Use this workflow when implementation happens in a separate Pi session.

### Quick command block (copy/paste template)

```bash
# 1) Create isolated worktree
cd /home/jbr/projects/pita
git worktree add .worktrees/<worktree-name> -b <branch-name>

# 2) Prepare kickoff prompt
cat <<'EOF' >/tmp/pita-session-prompt.txt
I'm using the executing-plans skill to implement this plan.

Plan file:
docs/plans/<plan-file>.md

Constraint:
- ONLY work inside this assigned worktree.
- Do not modify files outside this worktree.

Please:
1) review the plan critically and raise any concerns first,
2) execute the first batch (default first 3 tasks),
3) report exact verification output,
4) stop for feedback with: "Ready for feedback."
EOF

# 3) Copy prompt to clipboard (detached)
nohup sh -c 'cat /tmp/pita-session-prompt.txt | wl-copy' >/tmp/wl-copy-nohup.log 2>&1 &

# 4) Verify clipboard and start session
wl-paste | sed -n '1,20p'
cd .worktrees/<worktree-name>
$HOME/node_modules/.bin/pi
```

### 1) Create isolated worktree from `main`

```bash
cd /home/jbr/projects/pita
git worktree add .worktrees/<worktree-name> -b <branch-name>
```

Example:

```bash
git worktree add .worktrees/phase1-ui-shell -b phase1/ui-shell-static
```

### 2) Prepare implementation kickoff prompt and copy to clipboard

Create prompt file:

```bash
cat <<'EOF' >/tmp/pita-session-prompt.txt
I'm using the executing-plans skill to implement this plan.

Plan file:
docs/plans/<plan-file>.md

Constraint:
- ONLY work inside this assigned worktree.
- Do not modify files outside this worktree.

Please:
1) review the plan critically and raise any concerns first,
2) execute the first batch (default first 3 tasks),
3) report exact verification output,
4) stop for feedback with: "Ready for feedback."
EOF
```

Copy without blocking terminal (`wl-copy` stays alive to serve clipboard data):

```bash
nohup sh -c 'cat /tmp/pita-session-prompt.txt | wl-copy' >/tmp/wl-copy-nohup.log 2>&1 &
```

Verify clipboard:

```bash
wl-paste | sed -n '1,20p'
```

### 3) Start separate Pi session in the worktree

```bash
cd .worktrees/<worktree-name>
$HOME/node_modules/.bin/pi
```

Paste the kickoff prompt as the first message.

### 4) Wait for implementation batch completion

When the implementation session reports completion, prepare a **phase-end gates prompt** and copy it with `wl-copy` the same way.

Suggested phase-end gates prompt:

```text
Run phase-end gates now in this worktree and report exact output.

Required gates:
1) Playwright Electron smoke test
   - bun run test:e2e
2) Manual smoke checklist
   - Launch app (dev run)
   - Confirm window opens
   - Confirm prompt send action is callable
   - Confirm timeline updates from runtime events
   - Confirm abort is visible; confirm callability when a long-running run is available

Also include:
- bun run typecheck
- bun run test

After running all gates, summarize pass/fail.
If all gates pass, run /refine-docs and update any docs that should reflect the completed work.
Then stop for review.
```

### 5) Wait for gate results, then review and integrate

When told gates passed:

1. Review worktree changes carefully.
2. If quality is acceptable, merge branch into `main`.
3. Clean up branch and worktree.

Example cleanup flow:

```bash
cd /home/jbr/projects/pita
git switch main
git merge --ff-only <branch-name> # or regular merge if needed
git worktree remove .worktrees/<worktree-name>
git branch -d <branch-name>
```

### Troubleshooting clipboard handoff

If clipboard copy appears to hang, check environment and run detached:

```bash
which wl-copy
echo "$WAYLAND_DISPLAY"
nohup sh -c 'cat /tmp/pita-session-prompt.txt | wl-copy' >/tmp/wl-copy-nohup.log 2>&1 &
```

## Error and Recovery Guidelines

- On lock conflict: show current owner and refuse start.
- On stale lock: provide safe unlock command and audit log entry.
- On crash: mark worker as interrupted and preserve event queue context.
