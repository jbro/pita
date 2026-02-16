# Design Session Notes

Ongoing capture from the planning sessions that follow the prototype phase.
Everything in `.worktrees/prototype/` is reference-only — it will be thrown away.

## Session Log

### Session 1 — Technology Selection

**Locked decisions:**
- Electron + TypeScript
- `@mariozechner/pi-agent-core` for agent loop/state/events (brings `@mariozechner/pi-ai` transitively — that's sufficient for provider/model needs)
- `@mariozechner/pi-coding-agent` as reference only (understand how pi-agent-core is used, but no code dependency)
- React (considered Svelte, decided React's ecosystem maturity wins for this project)
- Jotai for state management
- Tailwind + shadcn/ui for styling
- Bun as package manager and task runner
- Vite for both renderer AND main process builds (unified, replaces the prototype's split tsc + Vite approach)
- Vitest for unit/integration tests
- Playwright for E2E testing

**Parked for architecture session:**
- IPC layer design — two options discussed:
  - A) Shared typed contract with thin wrapper (~50 LOC) over `ipcRenderer.invoke` / `ipcMain.handle`
  - B) `electron-trpc` (tRPC routers, zod schemas, first-class subscriptions)
  - Key driver: multi-session parallel execution needs session-routed IPC with subscriptions
  - Decision deferred until architecture is hashed out

### Session 2 — User Stories

**US-1: Project Selection on Launch**
- On app open, the user sees a project selection screen
- Shows a list of recent projects (displayed as paths)
- Has a "New Project" button
- Has a file system navigation view for browsing to a folder
- A project is a folder that is a git repository
- "New Project" creates a new folder, initializes a git repo, may launch a wizard to generate an AGENTS.md from templates/choices
- Recent projects list is persisted locally (app-level MRU)

**US-2: Prompt Composer and Session Interaction**
- After opening a project, the user sees a screen with a prompt box at the bottom
- Ctrl+Enter sends the prompt to the active session (no buttons)
- A busy indicator appears while the session is running
- While busy:
  - Ctrl+Enter steers the session (sends additional message mid-run)
  - Ctrl+Shift+Enter queues the next prompt (follow-up)
  - Up arrow lets the user edit queued prompts
  - Esc aborts the current run AND clears the prompt queue
- While idle:
  - Esc clears the prompt
  - Up/Down arrow navigates prompt history
  - Enter inserts a newline

**US-3: Command Palette**
- Ctrl+K opens the command palette
- Every available action has an entry with its shortcut key displayed
- Fuzzy search filters the list as the user types
- Up/Down arrow navigates visible actions
- Enter executes the selected action
- Esc closes the palette

**Convention:** All future features will be specified as user stories before implementation.

### Session 3 — Testing Strategy

**Decisions:**
- TDD/BDD driven by user stories — tests before implementation
- Three layers: unit (Vitest), DOM integration (Vitest + jsdom), E2E (Playwright)
- Mock model provider via `StreamFn` injection (same signature as `streamSimple`) — scripted responses, tool calls, streaming, errors
- `memfs` for virtual filesystem in unit/DOM tests, real temp dirs for Playwright only
- Code must be structured for dependency injection: `fs` and stream function are params, not hardcoded imports
- See `docs/testing.md` for full details

### Session 5 — Architecture

**Decisions:**
- Main process owns all agent sessions, filesystem, persistence, project locking
- Renderer owns UI only — communicates exclusively via IPC
- One app instance per project, enforced via lockfile
- Projects are git repos, no Pita metadata inside the project folder
- All Pita state in `~/.pita/projects/<project-path-hash>/` (meta, lock, sessions)
- `~/.pita/store.json` for MRU list only
- JSON file persistence, no database
- Sessions wrap pi-agent-core `Agent` with metadata and persistence
- Sessions are ephemeral at runtime, message history is the durable part
- SessionRegistry in main process manages all sessions, routes IPC
- IPC: thin typed wrapper with shared contract in `src/shared/ipc.ts`
- Three DI seams: StreamFn, fs, IPC bridge — all constructor/factory params
- See `docs/architecture.md` for full details

### Session 6 — Project Initialization

Executed `docs/plans/2026-02-16-project-init.md`. Scaffolded the full techstack from a clean repo.

**Issues encountered and resolved:**
- React 19 types dropped global `JSX` namespace — use inferred return types instead
- `@testing-library/jest-dom` needs an explicit `vitest.setup.ts` importing `@testing-library/jest-dom/vitest`
- `"type": "module"` in package.json conflicts with CJS output — main/preload output uses `.cjs` extension
- `tsconfig.json` must include `tests/` and `vitest.setup.ts` for type checking

**Final state:** all three gates pass (typecheck, vitest 1 test, playwright 1 test). `bun run dev` launches the Electron app with Vite HMR.

### Session 4 — Workflow Review

**Decisions:**
- `docs/workflow.md` is now development-only (how we build Pita)
- Stripped all product-level concerns (worker commands, lock files, foreground slot, error recovery)
- Product worktree/session model will be revisited in a future architecture session
- Simplified phase-end gates to just `typecheck`, `test`, `test:e2e`
