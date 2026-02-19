# Context Management Guide for Pita

Reducing token usage by keeping docs and skills compressed and up-to-date.

## The Pattern

**Planning:** Start session → Load docs → Brainstorm → Write user story → **Do work** → Refine docs → Repeat

**Implementation:** Start session → Load docs → Write tests → Implement → Gate → Refine docs

## Session Start: Load Context

At the beginning of a session, run:

```
/skill:project-docs
```

This will:
1. Read all markdown files in `docs/`
2. Summarize what you learned in 2–3 sentences
3. Ask you to confirm or correct understanding

You now have fresh context without re-reading everything.

**If planning a new feature**, also load:

```
/skill:brainstorming
```

Use this to explore the feature space before committing to a user story. Answer:
- What problem are we solving?
- Who benefits and how?
- What are the design tradeoffs?
- What's the architecture impact?
- What could go wrong?

Then write a user story capturing the brainstorm outcomes.

## Mid-Session: Watch Token Usage

If your session is approaching token limits (watch the status bar), or when the user asks for `/refine-docs`:

1. **Stop and think:** What did I learn? What changed? What patterns are new?
2. **Refine immediately:** Don't wait for session end.

```
/skill:project-docs
```

Then tell me: "Please refine these docs based on what we learned today."

I will:
1. Review the session's work
2. Propose updates to `docs/` and `project skills`
3. Wait for your approval before applying
4. Commit with a clear message

**Result:** Next session loads smaller, fresher docs.

## Feature Development: Always Refine

After every feature or major task:

1. **Pass gates:** `bun run typecheck && bun run test && bun run test:e2e`
2. **Refine docs:** Load `/skill:project-docs` and request refinement
3. **Commit:** `git commit -m "docs: refine <topic> after feature"`
4. **Merge:** Only after doc updates are committed

Example refinement targets:

- **After architecture changes** → update `docs/architecture.md` + `/skill:project-architecture`
- **After testing improvements** → update `docs/testing.md` + `/skill:project-testing`
- **After workflow discovery** → update `docs/workflow.md` + `/skill:project-workflow`

## What Gets Refined

### `docs/` (Canonical Reference)

Detailed docs for comprehensive understanding:

- `docs/architecture.md` — full process model, storage, IPC details
- `docs/testing.md` — test layers, fixtures, mocking strategies
- `docs/workflow.md` — git patterns, phase gates, cleanup procedures

**Keep updated with:** Why decisions were made, full examples, edge cases.

## Context Budget Example

**Baseline session (start cold):**
- Load all docs from scratch: ~5K tokens
- Load superpowers/brainstorming: ~3K tokens
- **Subtotal: ~8K tokens before any work**

**With project-docs + refinement:**
- Load project-docs (summary): ~500 tokens
- Load superpowers: ~3K tokens
- **Subtotal: ~3.5K tokens before any work**

**Savings:** ~56% context reduction = more room for actual work.

## Guidelines

1. **Docs are contracts.** If docs become stale, the next session wastes time re-learning old info.
2. **Skills are shortcuts.** If skills get out of sync with code, they become noise.
3. **Prefer small updates.** Don't rewrite entire docs. Target specific sections.
4. **Propose before applying.** Always let the user approve doc changes.
5. **Write clearly.** Load `/skill:writing-clearly-and-concisely` before major doc updates.

## Quick Commands

Load context at session start:
```
/skill:project-docs
```

Request doc refinement mid-session:
```
/skill:project-docs
# Then: "Please refine docs based on today's work."
```

## Next Steps

- Use this guide during feature work
- Refine docs after each completed task
- Watch token usage improve in subsequent sessions
- Update this guide as context patterns evolve
