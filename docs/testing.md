# Testing Strategy

## Approach

User stories drive development through TDD/BDD. Write tests before implementation.

## Test Layers

| Layer | Tool | Scope | Mocks |
|---|---|---|---|
| Unit | Vitest | Pure logic, state, services | Mock `StreamFn`, `memfs` |
| DOM integration | Vitest + jsdom | React components and keyboard/interaction behavior | Mock IPC bridge + controlled fs responses |
| E2E | Playwright | Electron + preload + IPC integration on built app | Real Electron build, optional memfs via `PITA_USE_MEMFS=1` |

### Iteration policy

- Implement and iterate first in DOM tests for fast feedback.
- Mirror critical flows in Playwright for integration confidence.
- For project selection, keep both layers for: MRU open, Miller navigation, folder creation, project creation, and non-git open handling.

### Mirror rule (required)

When a Playwright test is added or changed, add or update a matching DOM test (Vitest + jsdom) whenever technically feasible.

- DOM tests are the primary fast iteration loop.
- Playwright tests are the integration gate.
- If exact mirroring is not feasible, document why in the test file comments or PR/commit message.

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
