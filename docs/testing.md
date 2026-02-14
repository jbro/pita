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

Notes:

- `bun run dev` is long-running by design.
- If scripting this check, use a timeout and terminate cleanly after confirmation.

## Recommended run order

For phase-end verification, use this order:

1. `bun run typecheck`
2. `bun run test`
3. `bun run test:e2e`
4. Manual smoke checklist (`bun run dev`)
