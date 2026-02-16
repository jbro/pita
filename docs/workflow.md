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
# 0) Commit plan to main first (so it's available in worktree)
cd /home/jbr/projects/pita
git add docs/plans/<plan-file>.md
git commit -m "docs: add <description> plan"

# 1) Create isolated worktree
git worktree add .worktrees/<worktree-name> -b <branch-name>

# 2) Build one-line kickoff command and copy it to clipboard
cat <<'EOF' | nohup wl-copy >/tmp/wl-copy-nohup.log 2>&1 &
cd /home/jbr/projects/pita/.worktrees/<worktree-name> && $HOME/node_modules/.bin/pi $'I\'m using the executing-plans skill to implement this plan.\n\nPlan file:\ndocs/plans/<plan-file>.md\n\nConstraint:\n- ONLY work inside this assigned worktree.\n- Do not modify files outside this worktree.\n\nPlease:\n1) review the plan critically and raise any concerns first,\n2) execute the first batch (default first 3 tasks),\n3) report exact verification output,\n4) stop for feedback with: "Ready for feedback."'
EOF

# 3) Verify clipboard, then paste in your shell to launch Pi directly
wl-paste | sed -n '1,4p'
```

### 0) Commit plan to `main` first

Before creating the worktree, commit the plan so it's available in the new worktree:

```bash
cd /home/jbr/projects/pita
git add docs/plans/<plan-file>.md
git commit -m "docs: add <description> plan"
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

### 2) Prepare one-line kickoff command and copy to clipboard (preferred)

Copy a one-line command that both changes directory and starts Pi with the kickoff prompt:

```bash
cat <<'EOF' | nohup wl-copy >/tmp/wl-copy-nohup.log 2>&1 &
cd /home/jbr/projects/pita/.worktrees/<worktree-name> && $HOME/node_modules/.bin/pi $'I\'m using the executing-plans skill to implement this plan.\n\nPlan file:\ndocs/plans/<plan-file>.md\n\nConstraint:\n- ONLY work inside this assigned worktree.\n- Do not modify files outside this worktree.\n\nPlease:\n1) review the plan critically and raise any concerns first,\n2) execute the first batch (default first 3 tasks),\n3) report exact verification output,\n4) stop for feedback with: "Ready for feedback."'
EOF
```

Verify clipboard:

```bash
wl-paste | sed -n '1,6p'
```

### 3) Start separate Pi session from the one-liner

Paste and run the copied one-liner in your shell.

### 4) Wait for implementation batch completion

When the implementation session reports completion, prepare the next **feedback prompt** and copy it with detached `wl-copy` automatically.

Rule: after every review response (approve/fix/next batch), copy the exact follow-up prompt to clipboard by default.

New completion rule: when implementation is approved, copy a follow-up prompt that tells the sub-session to run `/refine-docs`, commit any resulting doc updates, and report back.

Only after that `/refine-docs` completion report is reviewed and accepted, proceed to merge and cleanup.

When implementation is complete, prepare a **phase-end gates prompt** and copy it with `wl-copy` the same way.

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
   - Confirm abort is visible and callable during a running stub response (`bun run dev` sets `PITA_STUB_RUNTIME_MODE=manual-abort`)
   - Confirm button label changes from "Send" to "Steer" while running
   - Confirm Enter while running triggers steer
   - Confirm Alt+Enter while running queues follow-up
   - Confirm pending queue count badge appears after steer/follow-up and resets when idle

Also include:
- bun run typecheck
- bun run test

After running all gates, summarize pass/fail.
If all gates pass, run /refine-docs and update any docs that should reflect the completed work.
Then stop for review.
```

### 5) Wait for gate results, then review, refine docs, and integrate

When told gates passed:

1. Review worktree changes carefully.
2. If quality is acceptable, copy a follow-up prompt instructing the sub-session to run `/refine-docs`, commit doc updates, and report back.
3. Review the `/refine-docs` commit(s).
4. If still acceptable, merge branch into `main`.
5. Clean up branch and worktree.

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
