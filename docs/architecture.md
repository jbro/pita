# Architecture

## Process Model

### Main Process (Electron / Node.js)

- App lifecycle and window management
- Project management (open, close, validate, MRU)
- Agent sessions — all `Agent` instances from pi-agent-core run here
- Filesystem access and git operations
- Tool execution (tools need fs, git, and shell access)
- Session registry and persistence
- Single-instance project locking

### Renderer (React)

- UI rendering via React and Jotai
- User input: prompt composer, keyboard shortcuts, command palette
- Timeline display from streamed events
- Mission control overlay for session switching
- Project selection screen

The renderer never touches the filesystem or agent. It sends commands and receives events over IPC.

## Source Layout

```
src/
  main/           # Electron main process (Node.js)
    main.ts       # App entry, window lifecycle, IPC handlers
  preload/        # Electron preload (sandboxed bridge)
    preload.ts    # contextBridge exposing typed IPC to renderer
  renderer/       # React app (browser)
    main.tsx      # React entry
    App.tsx       # Root component
    store/        # Jotai store
    lib/          # Utilities (cn, etc.)
    styles.css    # Tailwind base + CSS variables
  shared/         # Imported by both main and renderer
    ipc.ts        # Channel names and payload types
```

## One Instance Per Project

Each project may be opened by one Pita instance at a time. A lockfile at `~/.pita/projects/<project-path-hash>/lock` enforces this. Stale locks from crashes are cleaned up on startup.

## Project Model

A project is a git repository. Pita stores no metadata inside the project folder.

### Opening a Project

1. Validate the folder is a git repo (or offer to initialize one).
2. Acquire the project lock.
3. Update the MRU list in `~/.pita/store.json`.
4. Load persisted sessions from `~/.pita/projects/<hash>/sessions/`.
5. Restore sessions: create `Agent` instances, load message history.
6. If no sessions exist, show an empty prompt (session created on first send).
7. Set the most recent session as active.
8. Transition the renderer to the session workspace.

### Closing a Project

1. Persist all session state (already current if saved after each turn).
2. Tear down Agent instances.
3. Release the project lock.
4. Return to the project selection screen (or quit).

## Storage Layout

```
~/.pita/
  store.json                            # MRU project list
  projects/
    <project-path-hash>/
      meta.json                         # project path, label, last opened
      lock                              # single-instance lockfile
      sessions/
        <session-id>.json               # message history and session metadata
```

Delete `~/.pita/projects/<hash>/` to reset all Pita state for a project.

Format: JSON files. Writes are small and infrequent — after each turn and on session switch. One writer per project (enforced by the lock).

## Session Model

Each session wraps a pi-agent-core `Agent` with metadata and persistence.

```
PitaSession {
  id: string
  projectPath: string
  metadata: { label, createdAt, lastActiveAt, model, systemPrompt }
  agent: Agent                          # in-memory only

  static create(projectPath, opts): PitaSession
  static restore(sessionFile, opts): PitaSession

  sendPrompt(text): void
  steer(text): void
  followUp(text): void
  abort(): void
  clearQueue(): void

  save(): void                          # persist to ~/.pita/projects/<hash>/sessions/<id>.json
  onEvent(fn): unsubscribe              # Agent events tagged with session ID
}
```

Agent instances are ephemeral; message history is durable. Restoring a session creates a fresh Agent and loads persisted messages. Sessions die with the app. For longer-lived work, hand off to a remote agent (US-6).

Sessions are created lazily — only when the user sends the first prompt. Closing a session archives it; archived sessions are never deleted automatically.

### Session Registry

```
SessionRegistry {
  sessions: Map<sessionId, PitaSession>
  activeSessionId: string | null

  create(projectPath): PitaSession
  restore(sessionFile): PitaSession
  setActive(sessionId): void
  list(): PitaSession[]
  destroy(sessionId): void
}
```

The renderer communicates with the registry through IPC. Commands target a session by ID; events stream back tagged with the session ID.

## Agent Integration

pi-agent-core's `Agent` provides `prompt()`, `steer()`, `followUp()`, `abort()`, `clearAllQueues()`, and a `subscribe()` event stream. It accepts a `StreamFn` for LLM calls and hooks for `convertToLlm` and `transformContext`.

### Event Flow

```
Agent emits AgentEvent
  → PitaSession tags it with sessionId
    → SessionRegistry forwards over IPC
      → Renderer Jotai store filters by active session
```

## IPC Layer

A thin typed wrapper over Electron IPC. `src/shared/ipc.ts` defines channel names and payload types; both main and renderer import it (enabled by the unified Vite build).

**Currently implemented commands (renderer → main):** `app.ping`, `fs:listDirectory`, `fs:createFolder`, `fs:initProject`, `project:open`, `project:loadMru`.

Project-selection calls are handled in `src/main/ipc/projectSelectionIpc.ts` and exposed in `window.pita` via `src/preload/preload.ts`.

## Dependency Injection

Three injection points keep every layer testable. All are constructor or factory parameters — no DI framework.

### 1. Stream Function (`StreamFn`)

- **Injected into:** `PitaSession` → `Agent`
- **Production:** `streamSimple` from pi-ai
- **Test:** mock returning scripted event streams

### 2. Filesystem (`fs`)

- **Injected into:** project validation, session persistence, isomorphic-git, AGENTS.md wizard
- **Production:** `node:fs`
- **Test:** `memfs`

### 3. IPC Bridge (renderer side)

- **Injected into:** Jotai store and event handlers
- **Production:** `window.pita` (preload API)
- **Test:** mock with the same typed interface
