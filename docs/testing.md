# Testing Strategy

## Approach

User stories drive development through TDD/BDD. Write tests before implementation.

## Test Layers

| Layer | Tool | Scope | Mocks |
|---|---|---|---|
| Unit | Vitest | Pure logic, state, stores | Mock `StreamFn`, `memfs` |
| DOM integration | Vitest + jsdom | React components, Jotai atoms, interaction | Mock `StreamFn`, `memfs`, mock IPC bridge |
| E2E | Playwright | Full Electron app | Mock `StreamFn` (injected via env/config), real temp dirs |

## Mock Model Provider

The agent loop accepts a `StreamFn` matching the signature of `streamSimple` from pi-ai. Tests supply a fake that returns scripted responses. No monkey-patching — pure dependency injection.

The mock controls:
- Response text
- Tool calls (which tools, what arguments)
- Streaming timing (instant or chunked)
- Errors and aborts

## Virtual Filesystem

Unit and DOM tests use `memfs` as a drop-in `node:fs` replacement. Playwright E2E tests use real temporary directories.

## Design Constraint

Code must accept `fs` and `StreamFn` as parameters, never as hardcoded imports. This makes every layer testable in isolation.
