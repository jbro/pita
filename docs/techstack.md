# Technology Stack

## Runtime

- **Electron** — desktop shell (Linux first)
- **TypeScript** — all code

## Agent Core

- **@mariozechner/pi-agent-core** — agent loop, state, events, tool execution
- **@mariozechner/pi-ai** — model/provider layer (transitive dependency of pi-agent-core)
- **@mariozechner/pi-coding-agent** — reference only, not a code dependency

## Renderer

- **React** — UI framework
- **Jotai** — state management
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — component primitives

## Build & Tooling

- **Vite** — builds both renderer and main process
- **Bun** — package manager and task runner

## Git

- **isomorphic-git** — pure JS git for simple operations (init, status checks) — pairs with memfs for testing
- Shell out to `git` binary for complex operations (worktrees, merges, rebases)

## Testing

- **Vitest** — unit and integration tests
- **Playwright** — E2E / Electron smoke tests
- **memfs** — in-memory filesystem for unit/DOM tests

## IPC

- Thin typed wrapper over Electron IPC with a shared contract in `src/shared/ipc.ts`
- Channel names and payload types defined once, imported by both main and renderer (enabled by unified Vite build)
- Events streamed via `webContents.send`, filtered by session ID in the renderer
