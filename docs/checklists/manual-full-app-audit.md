# Manual Full-App Audit Checklist

Use this checklist to verify current app behavior manually.

How to fill each item:
- Mark exactly one: `[ ] PASS` or `[ ] FAIL` or `[ ] UNCLEAR`
- If `FAIL` or `UNCLEAR`, fill `Observed:` with what happened.

---

## Tier 1 — Critical operator path (must work)

### A1. Start dev app
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Open a terminal at repository root.
2. Run `bun run dev`.
3. Wait for startup to complete.

Expected:
- Dev process remains running.
- Electron launches.

Observed (if FAIL/UNCLEAR):
- 

### A2. Electron window opens
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. With `bun run dev` still running, check for app window.

Expected:
- One Electron window is visible.

Observed (if FAIL/UNCLEAR):
- 

### A3. Timeline panel visible
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. In the app window, locate the top section.

Expected:
- Timeline panel is visible.

Observed (if FAIL/UNCLEAR):
- 

### A4. Prompt composer visible
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. In the app window, locate the bottom section.

Expected:
- Prompt composer (input + controls) is visible.

Observed (if FAIL/UNCLEAR):
- 

### A5. Command palette placeholder visible
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Scan the shell UI for the command palette placeholder area.

Expected:
- Placeholder region/text for command palette is visible.

Observed (if FAIL/UNCLEAR):
- 

---

### B1. Send prompt via button
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Enter text in prompt input (example: `Test prompt run`).
2. Click `Send`.

Expected:
- Run starts (UI transitions away from idle).

Observed (if FAIL/UNCLEAR):
- 

### B2. Timeline receives runtime updates
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. After sending prompt, watch timeline items update.

Expected:
- Timeline updates from runtime events while run is active.

Observed (if FAIL/UNCLEAR):
- 

### B3. Send button label changes to Steer during run
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Start a run.
2. Check primary action button label while run is active.

Expected:
- Label changes from `Send` to `Steer`.

Observed (if FAIL/UNCLEAR):
- 

### B4. Abort enabled while running
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Start a run.
2. Inspect `Abort` button state.

Expected:
- `Abort` is visible and enabled during running state.

Observed (if FAIL/UNCLEAR):
- 

### B5. Abort returns UI to idle
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. While run is active, click `Abort`.
2. Wait for state transition.

Expected:
- Run ends.
- UI returns to idle.

Observed (if FAIL/UNCLEAR):
- 

### B6. Primary button label returns to Send after idle
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Complete or abort a run.
2. Check primary button label in idle state.

Expected:
- Label is `Send`.

Observed (if FAIL/UNCLEAR):
- 

---

### C1. Enter while idle sends prompt
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Ensure app is idle.
2. Enter prompt text.
3. Press `Enter`.

Expected:
- Prompt is sent (same behavior as clicking `Send`).

Observed (if FAIL/UNCLEAR):
- 

### C2. Enter while running performs steer
[ ] PASS  [ ] FAIL  [x] UNCLEAR

Steps:
1. Start a run.
2. Type text in input while running.
3. Press `Enter`.

Expected:
- Steer action is triggered (not a fresh normal send).

Observed (if FAIL/UNCLEAR):
- When "steering" I see a message that says 1 queued, but I can't tell if
    that is steering or even if the queued prompt gets send

### C3. Alt+Enter while running queues follow-up
[ ] PASS  [ ] FAIL  [x] UNCLEAR

Steps:
1. Start a run.
2. Type text in input while running.
3. Press `Alt+Enter`.

Expected:
- Follow-up is queued.

Observed (if FAIL/UNCLEAR):
- I see the same as with steer, so I can't tell them apart

### C4. Alt+Enter while idle behaves like send
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Ensure app is idle.
2. Type prompt text.
3. Press `Alt+Enter`.

Expected:
- Normal send action occurs.

Observed (if FAIL/UNCLEAR):
- 

---

### D1. Pending queue badge appears after steer/follow-up
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Start a run.
2. Trigger steer and/or follow-up.
3. Inspect prompt composer status area.

Expected:
- Pending badge appears (example: `1 queued`, `2 queued`).

Observed (if FAIL/UNCLEAR):
- 

### D2. Pending badge count increments with multiple queued actions
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. During one active run, queue multiple steer/follow-up actions.
2. Watch badge value.

Expected:
- Badge count increases accordingly.

Observed (if FAIL/UNCLEAR):
- 

### D3. Pending badge resets on idle
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Create pending queue while running.
2. Let run complete or abort to idle.

Expected:
- Pending badge resets/disappears in idle.

Observed (if FAIL/UNCLEAR):
- 

---

## Tier 2 — Runtime and compatibility behavior

### E1. Default startup is SDK-first
[ ] PASS  [x] FAIL  [ ] UNCLEAR

Steps:
1. Stop running app.
2. Run plain `bun run dev`.
3. Check startup logs in terminal.

Expected:
- Startup indicates SDK-first selection attempt (or explicit fallback reason).

Observed (if FAIL/UNCLEAR):
- [pita] Runtime selection: selected=stub requested=sdk-default stubMode=manual-abort fallback=yes reason=Local SDK session object does not expose a prompt method.

### E2. Forced stub startup works
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Stop running app.
2. Run `PITA_RUNTIME_KIND=stub bun run dev`.

Expected:
- App starts in stub mode.

Observed (if FAIL/UNCLEAR):
- 

### E3. Stub mode still supports send/stream/abort
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Keep app running in forced stub mode.
2. Send prompt.
3. Observe timeline updates.
4. Trigger abort during active run.

Expected:
- Send/stream/abort behavior works in stub mode.

Observed (if FAIL/UNCLEAR):
- 

### E4. Manual-abort mode gives enough time to click Abort
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Use dev run (`bun run dev`) which sets `PITA_STUB_RUNTIME_MODE=manual-abort`.
2. Send prompt.
3. Attempt to click `Abort` while active.

Expected:
- Run remains active long enough to click `Abort` reliably.

Observed (if FAIL/UNCLEAR):
- 

---

### F1. Abort while idle is safe no-op
[ ] PASS  [ ] FAIL  [x] UNCLEAR

Steps:
1. Ensure app is idle.
2. Trigger `Abort` (if enabled by UI path, command path, or test affordance).

Expected:
- No crash.
- No broken UI state.

Observed (if FAIL/UNCLEAR):
- Abort is not clickable when UI is idle

### F2. Multiple sequential runs remain stable
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Run prompt lifecycle 3 times in sequence: send -> complete/abort -> send again.

Expected:
- No UI lockup or stale state accumulation.

Observed (if FAIL/UNCLEAR):
- 

### F3. Input remains usable across state changes
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Type text while idle.
2. Start run; type text while running.
3. Return to idle and type again.

Expected:
- Input remains responsive and consistent.

Observed (if FAIL/UNCLEAR):
- 

---

### G1. Overlay backend additions do not destabilize app
[ ] PASS  [ ] FAIL  [x] UNCLEAR

Steps:
1. Run Tier 1 scenarios end to end.
2. Watch for runtime errors or regressions.

Expected:
- Existing behavior remains stable with overlay backend code present.

Observed (if FAIL/UNCLEAR):
- 

### G2. No obvious preload/session API errors for overlay methods
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Open devtools console (if available).
2. Exercise basic send/steer/follow-up flow.
3. Watch for errors mentioning overlay preload/session methods.

Expected:
- No obvious API mismatch errors related to prompt overlay methods.

Observed (if FAIL/UNCLEAR):
- 

### G3. Existing prompt lifecycle behavior unaffected
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Re-run B and C sections quickly.

Expected:
- No regressions in send/steer/follow-up/abort behavior.

Observed (if FAIL/UNCLEAR):
- 

---

## Tier 3 — UX and docs consistency

### H1. Dark theme and layout consistency
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Inspect shell after startup and after one run.

Expected:
- Dark theme remains consistent.
- Layout remains stable.

Observed (if FAIL/UNCLEAR):
- 

### H2. Timeline readability during updates
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Send prompt and watch timeline during streaming.

Expected:
- Timeline items remain readable and coherent while updating.

Observed (if FAIL/UNCLEAR):
- 

### H3. Composer controls remain understandable
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Observe composer labels in idle and running states.

Expected:
- Control labels and state changes are clear.

Observed (if FAIL/UNCLEAR):
- 

---

### I1. README high-level claims match observed behavior
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Read `README.md` feature bullets.
2. Compare against your Tier 1 and Tier 2 observations.

Expected:
- No major mismatch between claims and observed app behavior.

Observed (if FAIL/UNCLEAR):
- 

### I2. docs/overview status matches current behavior
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Read `docs/overview.md` implementation status.
2. Compare to your observed results.

Expected:
- “Implemented now / Not implemented yet” is accurate.

Observed (if FAIL/UNCLEAR):
- 

### I3. docs/testing manual checklist matches what is runnable
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Read `docs/testing.md` manual smoke section.
2. Compare instructions to what you actually executed.

Expected:
- Checklist is runnable and accurate.

Observed (if FAIL/UNCLEAR):
- 

---

## Optional command checks

### J1. Typecheck
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Run `bun run typecheck`.

Expected:
- Command exits cleanly.

Observed (if FAIL/UNCLEAR):
- 

### J2. Unit/integration tests
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Run `bun run test`.

Expected:
- Test suite passes.

Observed (if FAIL/UNCLEAR):
- 

### J3. E2E smoke
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Run `bun run test:e2e`.

Expected:
- Electron smoke test passes.

Observed (if FAIL/UNCLEAR):
- 

---

## Summary

Totals:
- PASS: 
- FAIL: 
- UNCLEAR: 

Highest-priority deficits to feed into next plan:
1. 
2. 
3. 
