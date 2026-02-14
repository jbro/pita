# Testing

This project uses a two-speed test flow:

- **Frequent local loop:** fast checks you run often while implementing.
- **Phase-end gate:** a broader Electron smoke check before review or integration.

## Frequent local loop

Run these commands from the repository root:

```bash
npm run typecheck
npm run test
```

What they cover:

- `npm run typecheck`: TypeScript checks for renderer and Electron/main code.
- `npm run test`: Vitest + RTL DOM tests for shell and component placeholders.

## Phase-end gate

Run the Electron smoke test:

```bash
npm run test:e2e
```

What it does:

1. Builds Electron/main + renderer output.
2. Launches Electron with Playwright.
3. Verifies static shell regions are visible:
   - `timeline-panel`
   - `prompt-composer-panel`
   - `command-palette-placeholder`

## Manual smoke checklist

After automated checks pass, run:

```bash
npm run dev
```

Confirm:

- App launches in dev mode.
- Electron window opens.
- Timeline/composer/palette placeholder regions are visible.

Notes:

- `npm run dev` is long-running by design.
- If scripting this check, use a timeout and terminate cleanly after confirmation.

## Recommended run order

For phase-end verification, use this order:

1. `npm run typecheck`
2. `npm run test`
3. `npm run test:e2e`
4. Manual smoke checklist (`npm run dev`)
