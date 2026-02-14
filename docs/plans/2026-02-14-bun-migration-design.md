# Bun Migration Design

**Date:** 2026-02-14  
**Status:** Draft for review

## Goal

Migrate Pita's local developer workflow from npm to Bun without changing runtime behavior, test semantics, or TUI compatibility guarantees.

## Why now

Current scripts and tooling are npm-centric (`npm run ...`, `npm install`, `npx playwright ...`). This side quest reduces install and task latency while keeping project behavior stable.

## Scope

### In scope

- Move package management from `package-lock.json` to Bun lockfile.
- Update script execution paths to run reliably with Bun.
- Replace npm/npx command references in docs and helper scripts.
- Keep existing test and smoke gate intent unchanged.

### Out of scope

- Feature work in app runtime (renderer/main/preload/orchestrator behavior).
- Dependency upgrades unrelated to Bun compatibility.
- CI platform redesign.

## Constraints

- Work only inside this worktree.
- Preserve the TUI Compatibility Contract and session behavior.
- Keep phase-end gates intact (`typecheck`, unit tests, e2e, manual smoke).
- Avoid introducing dual sources of truth for lockfiles over the long term.

## Current state snapshot

- `package.json` scripts call npm directly (`npm run build`, `npm run build:main`).
- `scripts/run-electron-e2e.mjs` shells out to `npm` and `npx`.
- Root contains `package-lock.json` and no Bun lockfile.
- README/testing/workflow docs use npm commands.

## Migration approaches

### Approach A: Hard switch to Bun in one pass

Replace npm usage everywhere, generate Bun lockfile, remove `package-lock.json`, and document Bun as the only package manager.

**Pros:** clean end state, no ambiguity.  
**Cons:** highest blast radius if any Bun edge case appears.

### Approach B: Bun-first with temporary npm compatibility window

Introduce Bun lockfile and Bun commands first, keep npm fallback notes briefly, then remove fallback after one full verification cycle.

**Pros:** lower operational risk, easier rollback.  
**Cons:** short-term documentation complexity.

### Approach C: Keep npm authoritative, allow Bun optionally

Add Bun instructions but keep npm lockfile and npm scripts as canonical.

**Pros:** minimal immediate risk.  
**Cons:** does not achieve migration goal, keeps maintenance overhead.

## Recommendation

Use **Approach B**: Bun-first with a short compatibility window.

Rationale:
- It satisfies the migration objective.
- It keeps rollback simple if an incompatibility appears.
- It avoids committing to prolonged dual-tooling support.

## Proposed technical design

1. **Package manager authority**
   - Adopt Bun lockfile as authoritative.
   - Remove `package-lock.json` once Bun install is stable in this worktree.

2. **Script and launcher alignment**
   - Keep `package.json` scripts but ensure they are Bun-safe.
   - Update nested script calls to `bun run ...` where needed.
   - Update e2e launcher script to use Bun-native execution paths.

3. **Developer docs alignment**
   - Update README and `docs/testing.md` commands to Bun.
   - Update `docs/workflow.md` handoff/gate snippets to Bun where they run project scripts.

4. **Verification parity**
   - Keep the same gates and pass/fail criteria.
   - Verify behavior parity, not just command success.

## Risks and mitigations

- **Risk:** Bun runtime differences break Electron/e2e launch flow.  
  **Mitigation:** run full gate sequence and keep rollback path to npm lock + commands.

- **Risk:** Hidden npm assumptions in scripts.  
  **Mitigation:** grep for `npm ` and `npx ` references, then update intentionally.

- **Risk:** Developer confusion during transition.  
  **Mitigation:** explicit docs section: authoritative tool, fallback policy, and cutoff point.

## Acceptance criteria

- Bun installs dependencies and creates lockfile successfully.
- All project scripts run via Bun equivalents.
- No required workflow step depends on npm/npx.
- Verification gates pass with unchanged quality bar.
- Docs consistently reflect Bun-first workflow.

## Open decisions for review

- Whether to keep a brief npm fallback note in docs after migration commit.
- Whether CI (if introduced/updated later) should enforce Bun-only immediately.
