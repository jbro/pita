# Testing

This project uses a two-speed test flow:

- **Frequent local loop:** fast checks you run often while implementing.
- **Phase-end gate:** a broader Electron smoke check before review or integration.

## Frequent local loop

Run these commands from the repository root:

```bash
bun run typecheck
bun run test
```

What they cover:

- `bun run typecheck`: TypeScript checks for renderer and Electron/main code.
- `bun run test`: Vitest + RTL DOM tests for shell and component placeholders.

Focused confirm-only prompt overlay checks:

```bash
bun run test -- tests/main/preload-api.test.ts tests/main/preload-bridge.test.ts tests/main/orchestrator-service.test.ts tests/main/local-sdk-runtime-adapter.test.ts tests/main/session-ipc.test.ts src/renderer/__tests__/app-streaming.test.tsx src/renderer/__tests__/prompt-composer-panel.test.tsx src/renderer/__tests__/prompt-composer-runtime.test.tsx
```

## Phase-end gate

Run the Electron smoke test:

```bash
bun run test:e2e
```

What it does:

1. Builds Electron/main + renderer output.
2. Launches Electron with Playwright.
3. Verifies vertical-slice behavior:
   - `timeline-panel` and `prompt-composer-panel` are visible
   - preload session bridge is available (`window.pita.session.sendPrompt`)
   - prompt input exists and send is callable
   - timeline receives at least one runtime-driven update after send

## Manual smoke checklist

After automated checks pass, run:

```bash
bun run dev
```

Confirm:

- App launches in dev mode.
- Electron window opens.
- Sending a prompt from the composer is possible.
- Timeline updates while the runtime responds.
- Abort control is visible while running.
- Idle `Abort` button disabled state is expected; if abort is triggered via command/test path while idle, it is a safe no-op.
- Button label changes from "Send" to "Steer" while running.
- Pressing Enter while running triggers steer (not a new prompt).
- Pressing Alt+Enter while running queues a follow-up.
- Pending badge appears after steer or follow-up, shows separate steer and follow-up counts, and resets when idle.
- No console/runtime errors or preload/IPC exceptions appear while running the prompt lifecycle.
- Confirm overlay request path (when triggered) replaces the composer UI with confirm/cancel actions.
- After overlay resolution, normal composer input/actions are restored.
- No regressions in send/steer/follow-up/abort behavior with overlay code present.

Notes:

- `bun run dev` is long-running by design.
- Runtime selection is SDK-first by default. Startup logs include a runtime selection line so operators can confirm `selected=sdk` or `selected=stub`.
- Use `PITA_RUNTIME_KIND=stub` to force stub runtime startup when needed for deterministic checks.
- The dev script sets `PITA_STUB_RUNTIME_MODE=manual-abort`, which keeps each stub run active long enough to click `Abort` reliably.
- If scripting this check, use a timeout and terminate cleanly after confirmation.

## Recommended run order

For phase-end verification, use this order:

1. `bun run typecheck`
2. `bun run test`
3. `bun run test:e2e`
4. Manual smoke checklist (`bun run dev`)
