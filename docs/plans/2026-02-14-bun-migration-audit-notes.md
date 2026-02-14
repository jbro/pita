# Bun Migration Audit Notes

Date: 2026-02-14
Plan: `docs/plans/2026-02-14-bun-migration-implementation-plan.md`

## Command run

```bash
grep -RIn "\bnpm\b\|\bnpx\b" package.json scripts README.md docs
```

## Relevant npm/npx assumptions (task surface)

### `package.json`
- `package.json:8` — `dev` script chains with `npm run build:main`
- `package.json:9` — `build` script chains with `npm run build:main`

### `scripts/run-electron-e2e.mjs`
- `scripts/run-electron-e2e.mjs:3` — spawns `npm run build`
- `scripts/run-electron-e2e.mjs:8` — spawns `npx playwright test --config playwright.config.ts`

### `README.md`
- `README.md:21` — `npm install`
- `README.md:22` — `npm run dev`

### `docs/testing.md`
- `docs/testing.md:13` — `npm run typecheck`
- `docs/testing.md:14` — `npm run test`
- `docs/testing.md:19` — `npm run typecheck` reference
- `docs/testing.md:20` — `npm run test` reference
- `docs/testing.md:27` — `npm run test:e2e`
- `docs/testing.md:45` — `npm run dev`
- `docs/testing.md:58` — `npm run dev` reference
- `docs/testing.md:65` — `npm run typecheck`
- `docs/testing.md:66` — `npm run test`
- `docs/testing.md:67` — `npm run test:e2e`
- `docs/testing.md:68` — `npm run dev` reference

### `docs/workflow.md`
- `docs/workflow.md:203` — `npm run test:e2e`
- `docs/workflow.md:212` — `npm run typecheck`
- `docs/workflow.md:213` — `npm run test`

## Additional notes

`docs/plans/*` also contains many historical/planning references to npm/npx. These are documentation context and not immediate runtime/tooling execution paths.

## Lockfile authority decision

Bun lockfile (`bun.lock`) becomes authoritative for dependency resolution in this repository.
